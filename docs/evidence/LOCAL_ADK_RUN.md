# Verified Google ADK + Gemini 3.5 Flash runs

Captured: 2026-08-26 · Model `gemini-3.5-flash` via the Gemini API · ADK 1.18.0

Every line below is a real function call Gemini made against Relay's tools.
Nothing in this file is scripted: the agent is given only a plain-language
incident briefing and has to discover the fleet, the partner network, and the
constraints for itself.

Reproduce with:

```bash
PYTHONPATH=services python -m unittest discover -s services/tests   # policy gates
./scripts/run-local.sh                                             # live agent
```

---

## RLY-2048 — refrigeration failure (full recovery)

1,240 meals · 9.8 °C · 71-minute window · $250 ceiling

| # | Tool | Result | Receipt |
|---|---|---|---|
| 1 | `assess_incident` | open · constraints returned | — |
| 2 | `list_fleet_options` | 4 vehicles | — |
| 3 | `find_partner_capacity` | 3 partners · 1,620 meals | — |
| 4 | `reserve_vehicle` V-08 | confirmed · $186 | `FLE-2049` |
| 5 | `claim_partner_capacity` northside-pantry 760 | confirmed | `CAP-2050` |
| 6 | `claim_partner_capacity` harbor-kitchen 480 | confirmed | `CAP-2051` |
| 7 | `dispatch_rescue` 1,240 meals | confirmed | `RES-2052` |

**1,240 / 1,240 meals recovered · $186 of $250 · 4 receipts · 26.3 s**

The agent chose V-08 on its own. V-03 could carry the load but costs $320,
which the gate would have refused; V-11 is cheaper but is not refrigerated.
No single partner can take 1,240 meals, so the load had to be split.

---

## RLY-2071 — budget squeeze (constraint reasoning)

900 meals · 8.4 °C · 40-minute window · **$150 ceiling**

| # | Tool | Result | Receipt |
|---|---|---|---|
| 4 | `reserve_vehicle` V-12 | confirmed · $140 | `FLE-2053` |
| 5 | `claim_partner_capacity` northside-pantry 900 | confirmed | `CAP-2054` |
| 6 | `dispatch_rescue` 900 meals | confirmed | `RES-2055` |

**900 / 900 meals recovered · $140 of $150 · 3 receipts · 12.8 s**

This is the trade-off case. V-05 arrives fastest but costs $240 and would break
the ceiling. V-21 costs only $60 but is not refrigerated, and the load is at
8.4 °C. The agent picked V-12 — the only option that satisfies both rules.

---

## RLY-2090 — capacity shortfall (honest partial result)

1,500 meals · 10.6 °C · 35-minute window · verified capacity of only 1,050

| # | Tool | Result | Receipt |
|---|---|---|---|
| 4 | `reserve_vehicle` V-02 | confirmed · $210 | `FLE-2056` |
| 5 | `claim_partner_capacity` northside-pantry 650 | confirmed | `CAP-2057` |
| 6 | `claim_partner_capacity` harbor-kitchen 400 | confirmed | `CAP-2058` |
| 7 | `dispatch_rescue` 1,050 meals | confirmed | `RES-2059` |
| 8 | `escalate_to_human` 450 meals | confirmed | `ESC-2060` |

**1,050 / 1,500 meals recovered · 450 escalated · $210 of $250 · 5 receipts · 21.1 s**

This mission cannot be solved. The approved partner network can absorb 1,050 of
the 1,500 meals, and `dispatch_rescue` refuses to move more meals than the
confirmed capacity claims cover. The agent dispatched what it could actually
place and escalated the remaining 450 meals to a human operator, with the
reason recorded on the receipt:

> "Insufficient partner capacity to accept remaining 450 meals (total capacity
> of approved partners is 1,050 meals)."

A fabricated 1,500-meal success would have been the failure mode. Reporting
1,050 and escalating 450 is the correct outcome.

---

## What the policy gate refuses

Covered by `services/tests/test_policy_tools.py` (19 tests):

- a vehicle whose cost would exceed the mission ceiling
- a non-refrigerated vehicle for a load already above 4 °C
- a vehicle or partner that is not in the mission's own registry
- a partner display name (`Northside Pantry`) instead of the registry ID
- a capacity claim larger than the partner can actually accept
- a dispatch whose meal count exceeds confirmed capacity claims
- a dispatch with no confirmed vehicle reservation
- any side effect submitted without an idempotency key

Cost is read from the fleet record rather than from the model's arguments, so
the spend ceiling cannot be talked around by naming a lower price.

## Idempotency

Replaying an idempotency key returns the original receipt and does **not**
re-charge spend or re-consume partner capacity. The ledger is consulted before
policy runs, so retrying a confirmed action is never mistaken for a second one.
