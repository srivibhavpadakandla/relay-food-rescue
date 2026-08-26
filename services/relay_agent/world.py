"""Simulated operational systems Relay acts on.

These stand in for a real fleet API, partner network API, and routing service.
They are deliberately *stateful and constrained* so the agent has to discover
options and reason about trade-offs instead of following a script.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Vehicle:
    vehicle_id: str
    kind: str
    refrigerated: bool
    capacity_meals: int
    cost_usd: int
    eta_minutes: int


@dataclass(frozen=True)
class Partner:
    partner_id: str
    display_name: str
    available_meals: int
    drive_minutes: int
    accepts_frozen: bool


@dataclass
class Scenario:
    """A cold-chain incident plus the operational world it happens in."""

    mission_id: str
    label: str
    summary: str
    meals: int
    temperature_c: float
    safe_minutes: int
    max_spend_usd: int
    vehicles: list[Vehicle]
    partners: list[Partner]
    expectation: str
    briefing: str = field(default="")


SCENARIOS: dict[str, Scenario] = {
    "RLY-2048": Scenario(
        mission_id="RLY-2048",
        label="Refrigeration failure · Truck R-14",
        summary="1,240 meals at 9.8 °C with 71 minutes of safe window.",
        meals=1240,
        temperature_c=9.8,
        safe_minutes=71,
        max_spend_usd=250,
        vehicles=[
            Vehicle("V-03", "box truck", True, 1400, 320, 22),
            Vehicle("V-08", "refrigerated van", True, 1300, 186, 14),
            Vehicle("V-11", "cargo van", False, 1300, 95, 12),
            Vehicle("V-19", "refrigerated van", True, 700, 204, 31),
        ],
        partners=[
            Partner("northside-pantry", "Northside Pantry", 760, 18, True),
            Partner("harbor-kitchen", "Harbor Kitchen", 620, 26, True),
            Partner("eastgate-shelter", "Eastgate Shelter", 240, 54, False),
        ],
        expectation="Solvable. No single vehicle or partner is large enough, so the load must be split.",
        briefing=(
            "Mission RLY-2048. Truck R-14 lost refrigeration on route 14. 1,240 "
            "prepared meals are at 9.8 °C and rising, with 71 minutes before they "
            "leave the safe window. Recover every meal."
        ),
    ),
    "RLY-2071": Scenario(
        mission_id="RLY-2071",
        label="Budget squeeze · Truck R-22",
        summary="900 meals, a tight 40-minute window and a $150 spend ceiling.",
        meals=900,
        temperature_c=8.4,
        safe_minutes=40,
        max_spend_usd=150,
        vehicles=[
            Vehicle("V-05", "refrigerated van", True, 950, 240, 15),
            Vehicle("V-12", "refrigerated van", True, 950, 140, 19),
            Vehicle("V-21", "cargo van", False, 1000, 60, 11),
        ],
        partners=[
            Partner("northside-pantry", "Northside Pantry", 950, 17, True),
            Partner("harbor-kitchen", "Harbor Kitchen", 300, 22, True),
        ],
        expectation=(
            "Solvable, but the fastest van breaks the $150 ceiling and the cheapest "
            "van is not refrigerated. The agent must take V-12."
        ),
        briefing=(
            "Mission RLY-2071. Truck R-22 lost refrigeration. 900 meals at 8.4 °C, "
            "40 minutes of safe window, and finance has capped this mission at $150. "
            "Recover every meal."
        ),
    ),
    "RLY-2090": Scenario(
        mission_id="RLY-2090",
        label="Capacity shortfall · Truck R-31",
        summary="1,500 meals against a partner network that can only take 1,050.",
        meals=1500,
        temperature_c=10.6,
        safe_minutes=35,
        max_spend_usd=250,
        vehicles=[
            Vehicle("V-02", "box truck", True, 1600, 210, 18),
            Vehicle("V-08", "refrigerated van", True, 800, 186, 14),
        ],
        partners=[
            Partner("northside-pantry", "Northside Pantry", 650, 19, True),
            Partner("harbor-kitchen", "Harbor Kitchen", 400, 24, True),
            Partner("eastgate-shelter", "Eastgate Shelter", 0, 51, False),
        ],
        expectation=(
            "Unsolvable as stated. Verified capacity tops out at 1,050 of 1,500 meals, "
            "so the agent must rescue what it can and escalate the shortfall instead "
            "of reporting a clean success."
        ),
        briefing=(
            "Mission RLY-2090. Truck R-31 lost refrigeration carrying 1,500 meals at "
            "10.6 °C with 35 minutes of safe window. Recover as much as policy allows."
        ),
    ),
}


def get_scenario(mission_id: str) -> Scenario | None:
    return SCENARIOS.get(mission_id.strip().upper())


def scenario_catalog() -> list[dict[str, Any]]:
    return [
        {
            "mission_id": s.mission_id,
            "label": s.label,
            "summary": s.summary,
            "meals": s.meals,
            "temperature_c": s.temperature_c,
            "safe_minutes": s.safe_minutes,
            "max_spend_usd": s.max_spend_usd,
            "expectation": s.expectation,
            "briefing": s.briefing,
        }
        for s in SCENARIOS.values()
    ]
