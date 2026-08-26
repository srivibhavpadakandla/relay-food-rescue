"""Policy-gate tests.

These cover the guarantees Relay claims: spend ceilings hold, only registry
partners receive meals, dispatch cannot exceed confirmed capacity, and every
side effect is idempotent.
"""

import unittest

from relay_agent.agent import (
    assess_incident,
    claim_partner_capacity,
    dispatch_rescue,
    escalate_to_human,
    find_partner_capacity,
    list_fleet_options,
    reserve_vehicle,
    store,
)

FLAGSHIP = "RLY-2048"
BUDGET = "RLY-2071"
SHORTFALL = "RLY-2090"


class PolicyToolTests(unittest.TestCase):
    def setUp(self):
        store.reset()

    # -- discovery ---------------------------------------------------------

    def test_unknown_mission_returns_valid_ids(self):
        result = assess_incident("NOPE-1")
        self.assertEqual(result["status"], "blocked")
        self.assertIn(FLAGSHIP, result["open_missions"])

    def test_fleet_and_partners_are_discoverable(self):
        self.assertEqual(list_fleet_options(FLAGSHIP)["status"], "ok")
        partners = find_partner_capacity(FLAGSHIP)
        self.assertEqual(partners["status"], "ok")
        self.assertIn("northside-pantry", [p["partner_id"] for p in partners["partners"]])

    def test_partner_capacity_reflects_prior_claims(self):
        assess_incident(FLAGSHIP)
        before = find_partner_capacity(FLAGSHIP)["total_available_meals"]
        claim_partner_capacity(FLAGSHIP, "northside-pantry", 300, f"{FLAGSHIP}:c1")
        after = find_partner_capacity(FLAGSHIP)["total_available_meals"]
        self.assertEqual(before - 300, after)

    # -- spend ceiling -----------------------------------------------------

    def test_blocks_vehicle_over_scenario_ceiling(self):
        assess_incident(BUDGET)
        # V-05 costs $240 against this mission's $150 ceiling.
        result = reserve_vehicle(BUDGET, "V-05", f"{BUDGET}:v")
        self.assertEqual(result["status"], "blocked")
        self.assertIn("150", result["reason"])

    def test_allows_vehicle_inside_ceiling(self):
        assess_incident(BUDGET)
        result = reserve_vehicle(BUDGET, "V-12", f"{BUDGET}:v")
        self.assertEqual(result["status"], "confirmed")
        self.assertEqual(result["cost_usd"], 140)

    def test_cost_is_taken_from_the_fleet_not_the_caller(self):
        """The agent cannot talk its way around the ceiling by naming a price."""
        assess_incident(FLAGSHIP)
        result = reserve_vehicle(FLAGSHIP, "V-08", f"{FLAGSHIP}:v")
        self.assertEqual(result["cost_usd"], 186)

    def test_blocks_unknown_vehicle(self):
        assess_incident(FLAGSHIP)
        self.assertEqual(reserve_vehicle(FLAGSHIP, "V-999", f"{FLAGSHIP}:v")["status"], "blocked")

    def test_blocks_unrefrigerated_vehicle_for_warm_load(self):
        assess_incident(FLAGSHIP)
        result = reserve_vehicle(FLAGSHIP, "V-11", f"{FLAGSHIP}:v")
        self.assertEqual(result["status"], "blocked")
        self.assertIn("refrigerated", result["reason"])

    # -- partner registry --------------------------------------------------

    def test_blocks_display_name_instead_of_registry_id(self):
        assess_incident(FLAGSHIP)
        result = claim_partner_capacity(FLAGSHIP, "Northside Pantry", 100, f"{FLAGSHIP}:c")
        self.assertEqual(result["status"], "blocked")
        self.assertIn("northside-pantry", result["reason"])

    def test_blocks_claim_beyond_partner_capacity(self):
        assess_incident(FLAGSHIP)
        result = claim_partner_capacity(FLAGSHIP, "northside-pantry", 5000, f"{FLAGSHIP}:c")
        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["available_meals"], 760)

    def test_blocks_non_positive_claim(self):
        assess_incident(FLAGSHIP)
        self.assertEqual(
            claim_partner_capacity(FLAGSHIP, "harbor-kitchen", 0, f"{FLAGSHIP}:c")["status"],
            "blocked",
        )

    # -- dispatch ----------------------------------------------------------

    def _flagship_plan(self):
        assess_incident(FLAGSHIP)
        reserve_vehicle(FLAGSHIP, "V-08", f"{FLAGSHIP}:v")
        claim_partner_capacity(FLAGSHIP, "northside-pantry", 760, f"{FLAGSHIP}:c1")
        claim_partner_capacity(FLAGSHIP, "harbor-kitchen", 480, f"{FLAGSHIP}:c2")

    def test_dispatch_succeeds_on_a_complete_plan(self):
        self._flagship_plan()
        result = dispatch_rescue(
            FLAGSHIP, "V-08", ["northside-pantry", "harbor-kitchen"], 1240, f"{FLAGSHIP}:d"
        )
        self.assertEqual(result["status"], "confirmed")
        self.assertEqual(result["total_meals"], 1240)

    def test_dispatch_blocked_without_a_reservation(self):
        assess_incident(FLAGSHIP)
        claim_partner_capacity(FLAGSHIP, "northside-pantry", 760, f"{FLAGSHIP}:c1")
        result = dispatch_rescue(FLAGSHIP, "V-08", ["northside-pantry"], 760, f"{FLAGSHIP}:d")
        self.assertEqual(result["status"], "blocked")

    def test_dispatch_cannot_exceed_confirmed_capacity(self):
        """A plan cannot be declared complete on paper only."""
        self._flagship_plan()
        result = dispatch_rescue(
            FLAGSHIP, "V-08", ["northside-pantry", "harbor-kitchen"], 9999, f"{FLAGSHIP}:d"
        )
        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["confirmed_capacity_meals"], 1240)

    def test_dispatch_blocks_unapproved_destination(self):
        self._flagship_plan()
        result = dispatch_rescue(
            FLAGSHIP, "V-08", ["northside-pantry", "shell-company"], 760, f"{FLAGSHIP}:d"
        )
        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["partners"], ["shell-company"])

    # -- idempotency and escalation ---------------------------------------

    def test_idempotent_receipt_replay(self):
        assess_incident(FLAGSHIP)
        first = reserve_vehicle(FLAGSHIP, "V-08", f"{FLAGSHIP}:v")
        second = reserve_vehicle(FLAGSHIP, "V-08", f"{FLAGSHIP}:v")
        self.assertEqual(first["receipt_id"], second["receipt_id"])
        self.assertTrue(second["idempotent_replay"])

    def test_replay_does_not_double_count_spend(self):
        assess_incident(FLAGSHIP)
        reserve_vehicle(FLAGSHIP, "V-08", f"{FLAGSHIP}:v")
        reserve_vehicle(FLAGSHIP, "V-08", f"{FLAGSHIP}:v")
        self.assertEqual(store.spend(FLAGSHIP), 186)

    def test_side_effect_requires_idempotency_key(self):
        assess_incident(FLAGSHIP)
        self.assertEqual(reserve_vehicle(FLAGSHIP, "V-08", "  ")["status"], "blocked")

    def test_shortfall_is_escalated_not_hidden(self):
        assess_incident(SHORTFALL)
        available = find_partner_capacity(SHORTFALL)["total_available_meals"]
        self.assertLess(available, 1500)
        result = escalate_to_human(SHORTFALL, 1500 - available, "capacity shortfall", f"{SHORTFALL}:e")
        self.assertEqual(result["status"], "confirmed")
        self.assertEqual(store.summary(SHORTFALL)["meals_escalated"], 450)


if __name__ == "__main__":
    unittest.main()
