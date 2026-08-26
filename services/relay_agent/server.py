"""Relay's HTTP surface: the operations UI plus a live agent event stream.

One Cloud Run service serves both, so the judge-facing product and the agent
that powers it share an origin, a deployment, and a revision.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from google.adk.agents.run_config import RunConfig
from google.adk.runners import InMemoryRunner
from google.genai import types

from .agent import MODEL, root_agent, store
from .world import get_scenario, scenario_catalog

logging.basicConfig(level=os.getenv("RELAY_LOG_LEVEL", "INFO"))
log = logging.getLogger("relay.server")

UI_DIR = Path(os.getenv("RELAY_UI_DIR", Path(__file__).resolve().parent.parent / "ui"))

app = FastAPI(title="Relay Food Rescue", version="1.0.0")
_runner = InMemoryRunner(agent=root_agent, app_name="relay")

# A stuck agent must fail loudly and cheaply rather than loop against the model.
MAX_LLM_CALLS = int(os.getenv("RELAY_MAX_LLM_CALLS", "24"))


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    """Cloud Run health probe and a quick way to confirm the live model."""
    return {
        "status": "ok",
        "model": MODEL,
        "vertex_ai": os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "FALSE").upper() == "TRUE",
        "revision": os.getenv("K_REVISION", "local"),
        "service": os.getenv("K_SERVICE", "local"),
        "checkpoint_backend": store.summary("_probe")["checkpoint_backend"],
    }


@app.get("/api/scenarios")
async def scenarios() -> dict[str, Any]:
    return {"scenarios": scenario_catalog()}


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def _run_mission(mission_id: str) -> AsyncIterator[str]:
    """Drive the ADK agent and translate its events into UI-shaped SSE frames."""
    scenario = get_scenario(mission_id)
    if scenario is None:
        yield _sse("error", {"message": f"Unknown mission {mission_id}"})
        return

    # A judge may run the same mission repeatedly; start from a clean ledger.
    store.reset(scenario.mission_id)

    started = time.monotonic()
    yield _sse("mission_start", {
        "mission_id": scenario.mission_id,
        "label": scenario.label,
        "meals": scenario.meals,
        "temperature_c": scenario.temperature_c,
        "safe_minutes": scenario.safe_minutes,
        "max_spend_usd": scenario.max_spend_usd,
        "model": MODEL,
    })

    session = await _runner.session_service.create_session(app_name="relay", user_id="judge")
    message = types.Content(role="user", parts=[types.Part(text=scenario.briefing)])

    pending: dict[str, str] = {}
    final_text = ""

    try:
        async for event in _runner.run_async(
            user_id="judge",
            session_id=session.id,
            new_message=message,
            run_config=RunConfig(max_llm_calls=MAX_LLM_CALLS),
        ):
            parts = event.content.parts if event.content and event.content.parts else []
            for part in parts:
                if part.function_call:
                    call = part.function_call
                    pending[call.id or call.name] = call.name
                    yield _sse("tool_call", {
                        "id": call.id or call.name,
                        "tool": call.name,
                        "args": dict(call.args or {}),
                        "elapsed_ms": int((time.monotonic() - started) * 1000),
                    })
                if part.function_response:
                    resp = part.function_response
                    payload = resp.response if isinstance(resp.response, dict) else {"result": resp.response}
                    yield _sse("tool_result", {
                        "id": resp.id or pending.get(resp.name, resp.name),
                        "tool": resp.name,
                        "status": payload.get("status", "ok"),
                        "result": payload,
                        "elapsed_ms": int((time.monotonic() - started) * 1000),
                    })
                if part.text and part.text.strip():
                    final_text = part.text.strip()
                    yield _sse("agent_text", {"text": final_text})
            await asyncio.sleep(0)
    except Exception as exc:  # surfaced to the UI rather than silently dropped
        log.exception("mission %s failed", mission_id)
        yield _sse("error", {"message": f"{type(exc).__name__}: {exc}"})
        return

    summary = store.summary(scenario.mission_id)
    summary.update({
        "meals_at_risk": scenario.meals,
        "spend_ceiling_usd": min(scenario.max_spend_usd, 250),
        "duration_ms": int((time.monotonic() - started) * 1000),
        "receipt_log": store.receipts(scenario.mission_id),
        "final_text": final_text,
    })
    yield _sse("mission_complete", summary)


@app.post("/api/missions/{mission_id}/run")
async def run_mission(mission_id: str) -> StreamingResponse:
    """Stream a live agent run as server-sent events."""
    if get_scenario(mission_id) is None:
        raise HTTPException(status_code=404, detail=f"Unknown mission {mission_id}")
    return StreamingResponse(
        _run_mission(mission_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/missions/{mission_id}/receipts")
async def receipts(mission_id: str) -> dict[str, Any]:
    return {"mission_id": mission_id, "receipts": store.receipts(mission_id)}


# The built UI is mounted last so API routes always win.
if UI_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=UI_DIR / "assets"), name="assets")

    @app.get("/{path:path}")
    async def spa(path: str) -> FileResponse:
        candidate = UI_DIR / path
        if path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(UI_DIR / "index.html")
else:  # pragma: no cover - only hit before the UI is built
    log.warning("UI bundle not found at %s; serving API only", UI_DIR)
