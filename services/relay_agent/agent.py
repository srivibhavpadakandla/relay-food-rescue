"""Relay's Google ADK agent and policy-bounded food-rescue tools."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from google.adk.agents import Agent

MODEL = os.getenv("RELAY_MODEL", "gemini-3.5-flash")
MAX_SPEND_USD = 250
APPROVED_PARTNERS = {"northside-pantry", "harbor-kitchen"}
_receipts: dict[str, dict[str, Any]] = {}


def _receipt(idempotency_key: str, action: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Return the original receipt for repeated side-effect requests."""
    if idempotency_key in _receipts:
        return {**_receipts[idempotency_key], "idempotent_replay": True}
    receipt = {
        "status": "confirmed",
        "action": action,
        "receipt_id": f"{action[:3].upper()}-{len(_receipts) + 2048}",
        "idempotency_key": idempotency_key,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    _receipts[idempotency_key] = receipt
    return receipt


def assess_incident(mission_id: str, meals: int, temperature_c: float, safe_minutes: int) -> dict[str, Any]:
    """Assess a cold-chain incident and return the deterministic operating constraints."""
    if meals <= 0 or safe_minutes <= 0:
        return {"status": "rejected", "reason": "Invalid incident quantities."}
    return {
        "status": "approved_for_planning",
        "mission_id": mission_id,
        "meals_at_risk": meals,
        "temperature_c": temperature_c,
        "safe_minutes": safe_minutes,
        "max_spend_usd": MAX_SPEND_USD,
        "required_capacity": meals,
        "policy": "Approved partners only; no PII; checkpoint every side effect.",
    }


def reserve_vehicle(mission_id: str, vehicle_id: str, cost_usd: int, idempotency_key: str) -> dict[str, Any]:
    """Reserve a rescue vehicle when cost stays inside the deterministic policy ceiling."""
    if cost_usd > MAX_SPEND_USD:
        return {"status": "blocked", "reason": f"Cost exceeds ${MAX_SPEND_USD} policy ceiling."}
    return _receipt(idempotency_key, "fleet_reservation", {
        "mission_id": mission_id, "vehicle_id": vehicle_id, "cost_usd": cost_usd,
    })


def claim_partner_capacity(mission_id: str, partner_id: str, meals: int, idempotency_key: str) -> dict[str, Any]:
    """Claim capacity only from a verified food-rescue partner."""
    if partner_id not in APPROVED_PARTNERS:
        return {"status": "blocked", "reason": "Partner is not on the approved registry."}
    if meals <= 0:
        return {"status": "blocked", "reason": "Capacity must be positive."}
    return _receipt(idempotency_key, "capacity_claim", {
        "mission_id": mission_id, "partner_id": partner_id, "meals": meals,
    })


def dispatch_rescue(mission_id: str, vehicle_id: str, partner_ids: list[str], total_meals: int, idempotency_key: str) -> dict[str, Any]:
    """Dispatch the rescue after all destinations pass partner-registry policy."""
    unknown = sorted(set(partner_ids) - APPROVED_PARTNERS)
    if unknown:
        return {"status": "blocked", "reason": "Unapproved destination.", "partners": unknown}
    return _receipt(idempotency_key, "rescue_dispatch", {
        "mission_id": mission_id,
        "vehicle_id": vehicle_id,
        "partner_ids": partner_ids,
        "total_meals": total_meals,
        "notifications": 6,
    })


root_agent = Agent(
    name="relay_food_rescue",
    model=MODEL,
    description="Autonomous cold-chain recovery agent for food-rescue operations.",
    instruction="""
You are Relay, a Taskmaster agent that rescues food after cold-chain failures.
Act instead of merely describing actions. For every incident:
1. Call assess_incident and obey the returned constraints.
2. Build the smallest safe recovery plan that preserves every meal.
3. Reserve one vehicle, claim only approved partner capacity, then dispatch.
4. Use mission-scoped idempotency keys in the form <mission>:<action>.
5. Never exceed $250, never share PII, and never invent a successful receipt.
6. Finish with a concise mission receipt listing tool receipt IDs, spend, meals,
   safety buffer, and any blocked or escalated action.
For mission RLY-2048, use V-08 at $186, Northside Pantry for 760 meals, Harbor
Kitchen for 480 meals, and dispatch all 1,240 meals.
""",
    tools=[assess_incident, reserve_vehicle, claim_partner_capacity, dispatch_rescue],
)
