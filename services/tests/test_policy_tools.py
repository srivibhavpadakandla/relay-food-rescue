import unittest

from relay_agent.agent import (
    _receipts,
    claim_partner_capacity,
    dispatch_rescue,
    reserve_vehicle,
)


class PolicyToolTests(unittest.TestCase):
    def setUp(self):
        _receipts.clear()

    def test_blocks_overspend(self):
        result = reserve_vehicle("RLY-1", "V-1", 251, "RLY-1:vehicle")
        self.assertEqual(result["status"], "blocked")

    def test_blocks_unapproved_partner(self):
        result = claim_partner_capacity("RLY-1", "unknown", 20, "RLY-1:claim")
        self.assertEqual(result["status"], "blocked")

    def test_idempotent_receipt_replay(self):
        first = reserve_vehicle("RLY-1", "V-1", 100, "RLY-1:vehicle")
        second = reserve_vehicle("RLY-1", "V-1", 100, "RLY-1:vehicle")
        self.assertEqual(first["receipt_id"], second["receipt_id"])
        self.assertTrue(second["idempotent_replay"])

    def test_dispatch_accepts_verified_network(self):
        result = dispatch_rescue(
            "RLY-2048", "V-08", ["northside-pantry", "harbor-kitchen"], 1240, "RLY-2048:dispatch"
        )
        self.assertEqual(result["status"], "confirmed")


if __name__ == "__main__":
    unittest.main()
