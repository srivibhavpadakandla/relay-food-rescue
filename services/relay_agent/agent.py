"""Relay's Google ADK agent and its policy-bounded food-rescue tools.

Design rule: **the model proposes, policy decides, tools prove.**

Gemini is never told the answer. It must discover the fleet and partner
options, reason about cost / capacity / time trade-offs, and then request
mutations. Every mutation is validated in deterministic Python before it is
allowed to change state, and every accepted mutation returns a receipt keyed by
a mission-scoped idempotency key.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from google.adk.agents import Agent

from .state import MissionStore
from .world import get_scenario, scenario_catalog

MODEL = os.getenv("RELAY_MODEL", "gemini-3.5-flash")

# Absolute ceiling. A scenario may impose a tighter one, never a looser one.
MAX_SPEND_USD = int(os.getenv("RELAY_MAX_SPEND_USD", "250"))

store = MissionStore()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _blocked(reason: str, **extra: Any) -> dict[str, Any]:
    """Every refusal looks the same so the model can react to it reliably."""
    return {"status": "blocked", "reason": reason, "blocked_at": _now(), **extra}


def _require_scenario(mission_id: str):
    scenario = get_scenario(mission_id)
    if scenario is None:
        # Always hand back the valid IDs so the agent corrects in one step
        # instead of guessing at identifiers.
        return None, _blocked(
            f"Unknown mission {mission_id!r}.",
            open_missions=[s["mission_id"] for s in scenario_catalog()],
        )
    return scenario, None


# --------------------------------------------------------------------------
# Discovery tools — read-only. These let the agent learn the world state.
# --------------------------------------------------------------------------

def assess_incident(mission_id: str) -> dict[str, Any]:
    """Load an open cold-chain incident and the policy constraints that bind it.

    Always call this first. It returns the meals at risk, the safe window, and
    the spend ceiling this mission must respect.
    """
    scenario, err = _require_scenario(mission_id)
    if err:
        return err
    store.open_mission(scenario.mission_id, scenario.meals)
    ceiling = min(scenario.max_spend_usd, MAX_SPEND_USD)
    return {
        "status": "open",
        "mission_id": scenario.mission_id,
        "incident": scenario.label,
        "meals_at_risk": scenario.meals,
        "temperature_c": scenario.temperature_c,
        "safe_minutes_remaining": scenario.safe_minutes,
        "max_spend_usd": ceiling,
        "policy": [
            f"Total spend must stay at or below ${ceiling}.",
            "Only vehicles returned by list_fleet_options may be reserved.",
            "Only partner IDs returned by find_partner_capacity may receive meals.",
            "Warm loads require a refrigerated vehicle.",
            "The dispatched route must arrive inside the safe window.",
            "Never report success without a tool receipt.",
            "If the meals cannot all be placed, escalate the shortfall.",
        ],
        "assessed_at": _now(),
    }


def list_fleet_options(mission_id: str) -> dict[str, Any]:
    """List the vehicles that could serve this mission, with cost and ETA.

    Costs and arrival times differ, and not every vehicle is refrigerated, so
    compare them against the incident's spend ceiling and safe window.
    """
    scenario, err = _require_scenario(mission_id)
    if err:
        return err
    return {
        "status": "ok",
        "mission_id": scenario.mission_id,
        "vehicles": [
            {
                "vehicle_id": v.vehicle_id,
                "kind": v.kind,
                "refrigerated": v.refrigerated,
                "capacity_meals": v.capacity_meals,
                "cost_usd": v.cost_usd,
                "eta_minutes": v.eta_minutes,
            }
            for v in scenario.vehicles
        ],
    }


def find_partner_capacity(mission_id: str) -> dict[str, Any]:
    """List verified partners and how many meals each can actually accept.

    Only the ``partner_id`` values returned here are on the approved registry.
    Display names are not accepted by the mutation tools.
    """
    scenario, err = _require_scenario(mission_id)
    if err:
        return err
    claimed = store.claimed_by_partner(scenario.mission_id)
    return {
        "status": "ok",
        "mission_id": scenario.mission_id,
        "partners": [
            {
                "partner_id": p.partner_id,
                "display_name": p.display_name,
                "available_meals": max(0, p.available_meals - claimed.get(p.partner_id, 0)),
                "drive_minutes": p.drive_minutes,
                "accepts_frozen": p.accepts_frozen,
            }
            for p in scenario.partners
        ],
        "total_available_meals": sum(
            max(0, p.available_meals - claimed.get(p.partner_id, 0)) for p in scenario.partners
        ),
    }


# --------------------------------------------------------------------------
# Mutation tools — every one is policy-gated and idempotent.
# --------------------------------------------------------------------------

def reserve_vehicle(mission_id: str, vehicle_id: str, idempotency_key: str) -> dict[str, Any]:
    """Reserve one vehicle from the fleet list for this mission.

    Cost comes from the fleet record, not from the caller, so the spend ceiling
    cannot be talked around.
    """
    scenario, err = _require_scenario(mission_id)
    if err:
        return err

    replayed = store.replay(idempotency_key)
    if replayed is not None:
        return replayed

    vehicle = next((v for v in scenario.vehicles if v.vehicle_id == vehicle_id), None)
    if vehicle is None:
        return _blocked(
            f"Vehicle {vehicle_id!r} is not in this mission's fleet. Call list_fleet_options first.")

    ceiling = min(scenario.max_spend_usd, MAX_SPEND_USD)
    projected = store.spend(scenario.mission_id) + vehicle.cost_usd
    if projected > ceiling:
        return _blocked(
            f"Reserving {vehicle_id} costs ${vehicle.cost_usd} and would bring mission spend to "
            f"${projected}, above the ${ceiling} ceiling.",
            spend_ceiling_usd=ceiling,
            current_spend_usd=store.spend(scenario.mission_id),
        )

    if scenario.temperature_c > 4.0 and not vehicle.refrigerated:
        return _blocked(
            f"{vehicle_id} is not refrigerated and the load is already at "
            f"{scenario.temperature_c} °C. Warm loads require a refrigerated vehicle.")

    if vehicle.eta_minutes >= scenario.safe_minutes:
        return _blocked(
            f"{vehicle_id} arrives in {vehicle.eta_minutes} min but only "
            f"{scenario.safe_minutes} min of safe window remain.")

    return store.record(
        idempotency_key,
        "fleet_reservation",
        mission_id=scenario.mission_id,
        vehicle_id=vehicle.vehicle_id,
        cost_usd=vehicle.cost_usd,
        eta_minutes=vehicle.eta_minutes,
        capacity_meals=vehicle.capacity_meals,
    )


def claim_partner_capacity(
    mission_id: str, partner_id: str, meals: int, idempotency_key: str
) -> dict[str, Any]:
    """Claim meal capacity from one verified partner.

    ``partner_id`` must be an exact registry ID from find_partner_capacity.
    """
    scenario, err = _require_scenario(mission_id)
    if err:
        return err

    replayed = store.replay(idempotency_key)
    if replayed is not None:
        return replayed

    partner = next((p for p in scenario.partners if p.partner_id == partner_id), None)
    if partner is None:
        known = ", ".join(p.partner_id for p in scenario.partners)
        return _blocked(
            f"{partner_id!r} is not an approved partner registry ID. Approved IDs: {known}.")

    if meals <= 0:
        return _blocked("Claimed capacity must be a positive number of meals.")

    already = store.claimed_by_partner(scenario.mission_id).get(partner_id, 0)
    remaining = partner.available_meals - already
    if meals > remaining:
        return _blocked(
            f"{partner.display_name} can accept {remaining} more meals, not {meals}.",
            available_meals=remaining,
        )

    if partner.drive_minutes >= scenario.safe_minutes:
        return _blocked(
            f"{partner.display_name} is {partner.drive_minutes} min away and only "
            f"{scenario.safe_minutes} min of safe window remain.")

    return store.record(
        idempotency_key,
        "capacity_claim",
        mission_id=scenario.mission_id,
        partner_id=partner.partner_id,
        meals=meals,
        drive_minutes=partner.drive_minutes,
    )


def dispatch_rescue(
    mission_id: str, vehicle_id: str, partner_ids: list[str], total_meals: int, idempotency_key: str
) -> dict[str, Any]:
    """Dispatch the route once a vehicle is reserved and capacity is claimed.

    Dispatch is refused unless the claimed capacity actually covers the meals
    being dispatched, so a plan cannot be declared complete on paper only.
    """
    scenario, err = _require_scenario(mission_id)
    if err:
        return err

    replayed = store.replay(idempotency_key)
    if replayed is not None:
        return replayed

    if not store.has_vehicle(scenario.mission_id, vehicle_id):
        return _blocked(f"No confirmed reservation for {vehicle_id} on this mission.")

    claimed = store.claimed_by_partner(scenario.mission_id)
    unknown = sorted(set(partner_ids) - {p.partner_id for p in scenario.partners})
    if unknown:
        return _blocked("Unapproved destination in the route.", partners=unknown)

    unclaimed = sorted(set(partner_ids) - set(claimed))
    if unclaimed:
        return _blocked("Route includes partners with no confirmed capacity claim.", partners=unclaimed)

    covered = sum(claimed.get(pid, 0) for pid in partner_ids)
    if total_meals > covered:
        return _blocked(
            f"Only {covered} meals of confirmed capacity are claimed, so {total_meals} "
            f"meals cannot be dispatched. Claim more capacity or escalate the shortfall.",
            confirmed_capacity_meals=covered,
        )

    return store.record(
        idempotency_key,
        "rescue_dispatch",
        mission_id=scenario.mission_id,
        vehicle_id=vehicle_id,
        partner_ids=list(partner_ids),
        total_meals=total_meals,
        notifications=len(partner_ids) * 2 + 2,
    )


def escalate_to_human(mission_id: str, unplaced_meals: int, reason: str, idempotency_key: str) -> dict[str, Any]:
    """Hand the part of the mission that policy cannot solve to a human operator.

    Use this instead of reporting a clean success when meals cannot all be placed.
    """
    scenario, err = _require_scenario(mission_id)
    if err:
        return err
    return store.record(
        idempotency_key,
        "human_escalation",
        mission_id=scenario.mission_id,
        unplaced_meals=unplaced_meals,
        reason=reason,
        paged="duty-operator",
    )


INSTRUCTION = """
You are Relay, an autonomous Taskmaster agent for cold-chain food rescue.
You take real action through tools. You never describe an action you did not take.

Work every incident in this order:

1. Call `assess_incident` to load the mission and its policy constraints.
2. Call `list_fleet_options` and `find_partner_capacity` to learn what is
   actually available. Never assume a vehicle, partner, price, or capacity.
3. Decide a plan yourself. Choose the cheapest vehicle that is refrigerated
   when the load is warm, arrives inside the safe window, and keeps total spend
   at or below the ceiling. Split meals across partners when no single partner
   can take the whole load, preferring the closest partners.
4. Reserve the vehicle, then claim capacity, then dispatch. Use idempotency
   keys shaped like `<mission_id>:<action>`.
5. If confirmed capacity cannot cover every meal, dispatch what is genuinely
   covered and call `escalate_to_human` for the remainder. A partial rescue
   reported honestly is correct. A fabricated full rescue is a failure.

If a tool returns `status: "blocked"`, read the reason, fix the request, and try
again. Do not repeat an identical failing call, and never claim a blocked action
succeeded.

Finish with a short mission receipt: meals recovered, meals unplaced, total
spend against the ceiling, the vehicle, each partner and its receipt ID, and
every action that was blocked or escalated.
""".strip()


root_agent = Agent(
    name="relay_food_rescue",
    model=MODEL,
    description="Autonomous cold-chain recovery agent for food-rescue operations.",
    instruction=INSTRUCTION,
    tools=[
        assess_incident,
        list_fleet_options,
        find_partner_capacity,
        reserve_vehicle,
        claim_partner_capacity,
        dispatch_rescue,
        escalate_to_human,
    ],
)
