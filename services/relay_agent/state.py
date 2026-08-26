"""Mission state and receipts.

Every confirmed side effect is checkpointed under a mission-scoped idempotency
key. Replaying a key returns the original receipt instead of repeating the
action, which is what makes a mission safe to retry or resume.

Firestore is used when ``RELAY_FIRESTORE=1``; otherwise an in-process store is
used so the service runs locally and in tests with no cloud dependency.
"""

from __future__ import annotations

import logging
import os
import threading
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger("relay.state")

RECEIPT_PREFIX = {
    "fleet_reservation": "FLE",
    "capacity_claim": "CAP",
    "rescue_dispatch": "RES",
    "human_escalation": "ESC",
}


def _firestore_client():
    if os.getenv("RELAY_FIRESTORE", "").lower() not in {"1", "true", "yes"}:
        return None
    try:
        from google.cloud import firestore

        client = firestore.Client()
        log.info("Firestore checkpointing enabled (project=%s)", client.project)
        return client
    except Exception as exc:  # pragma: no cover - depends on cloud credentials
        log.warning("Firestore unavailable, falling back to in-memory state: %s", exc)
        return None


class MissionStore:
    """Idempotent receipt ledger plus per-mission derived state."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._receipts: dict[str, dict[str, Any]] = {}
        self._missions: dict[str, dict[str, Any]] = {}
        self._seq = 2048
        self._db = _firestore_client()

    # -- mission lifecycle -------------------------------------------------

    def open_mission(self, mission_id: str, meals: int) -> None:
        with self._lock:
            self._missions.setdefault(
                mission_id,
                {"mission_id": mission_id, "meals_at_risk": meals, "opened_at": _now()},
            )

    def reset(self, mission_id: str | None = None) -> None:
        """Clear state so a judge can run the same mission again from scratch."""
        with self._lock:
            if mission_id is None:
                self._receipts.clear()
                self._missions.clear()
                self._seq = 2048
                return
            self._missions.pop(mission_id, None)
            for key in [k for k, r in self._receipts.items() if r.get("mission_id") == mission_id]:
                self._receipts.pop(key, None)

    # -- receipts ----------------------------------------------------------

    def replay(self, idempotency_key: str) -> dict[str, Any] | None:
        """Return the original receipt if this exact action already happened.

        Mutation tools must consult this *before* re-running policy: a retry of
        a confirmed action is not a second action, so it must not be re-charged
        against the spend ceiling or re-counted against partner capacity.
        """
        with self._lock:
            existing = self._receipts.get(idempotency_key)
        return {**existing, "idempotent_replay": True} if existing else None


    def record(self, idempotency_key: str, action: str, **payload: Any) -> dict[str, Any]:
        """Persist a side effect, or replay the original receipt for a repeat key."""
        if not idempotency_key or not idempotency_key.strip():
            return {
                "status": "blocked",
                "reason": "Every side effect requires a mission-scoped idempotency key.",
            }

        with self._lock:
            existing = self._receipts.get(idempotency_key)
            if existing is not None:
                log.info("idempotent replay for %s", idempotency_key)
                return {**existing, "idempotent_replay": True}

            self._seq += 1
            receipt = {
                "status": "confirmed",
                "action": action,
                "receipt_id": f"{RECEIPT_PREFIX.get(action, 'ACT')}-{self._seq}",
                "idempotency_key": idempotency_key,
                "recorded_at": _now(),
                **payload,
            }
            self._receipts[idempotency_key] = receipt

        self._checkpoint(receipt)
        return receipt

    def _checkpoint(self, receipt: dict[str, Any]) -> None:
        if self._db is None:
            return
        try:  # pragma: no cover - depends on cloud credentials
            (
                self._db.collection("relay_missions")
                .document(str(receipt.get("mission_id", "unknown")))
                .collection("receipts")
                .document(receipt["idempotency_key"].replace("/", "_"))
                .set(receipt)
            )
        except Exception as exc:  # pragma: no cover
            log.warning("Firestore checkpoint failed for %s: %s", receipt["receipt_id"], exc)

    # -- derived views -----------------------------------------------------

    def _for_mission(self, mission_id: str) -> list[dict[str, Any]]:
        return [r for r in self._receipts.values() if r.get("mission_id") == mission_id]

    def spend(self, mission_id: str) -> int:
        return sum(int(r.get("cost_usd", 0)) for r in self._for_mission(mission_id))

    def claimed_by_partner(self, mission_id: str) -> dict[str, int]:
        claims: dict[str, int] = {}
        for r in self._for_mission(mission_id):
            if r["action"] == "capacity_claim":
                claims[r["partner_id"]] = claims.get(r["partner_id"], 0) + int(r["meals"])
        return claims

    def has_vehicle(self, mission_id: str, vehicle_id: str) -> bool:
        return any(
            r["action"] == "fleet_reservation" and r.get("vehicle_id") == vehicle_id
            for r in self._for_mission(mission_id)
        )

    def receipts(self, mission_id: str) -> list[dict[str, Any]]:
        return sorted(self._for_mission(mission_id), key=lambda r: r["recorded_at"])

    def summary(self, mission_id: str) -> dict[str, Any]:
        receipts = self._for_mission(mission_id)
        dispatched = sum(
            int(r.get("total_meals", 0)) for r in receipts if r["action"] == "rescue_dispatch"
        )
        escalated = sum(
            int(r.get("unplaced_meals", 0)) for r in receipts if r["action"] == "human_escalation"
        )
        return {
            "mission_id": mission_id,
            "spend_usd": self.spend(mission_id),
            "meals_dispatched": dispatched,
            "meals_escalated": escalated,
            "receipts": len(receipts),
            "checkpoint_backend": "firestore" if self._db else "in-memory",
        }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
