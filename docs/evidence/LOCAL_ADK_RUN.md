# Verified Google ADK + Gemini 3.5 Flash Run

Run time: 2026-08-25 PDT  
Environment: local ADK API server using the Gemini API  
Model: `gemini-3.5-flash`  
Mission: `RLY-2048`

This evidence proves the agent and model/tool integration works locally. It is deliberately not labeled as Cloud Run proof.

## Observed tool sequence

| Step | Tool | Outcome | Receipt |
|---|---|---|---|
| 1 | `assess_incident` | Approved 1,240 meals, 71-minute window, $250 ceiling | policy response |
| 2 | `reserve_vehicle` | Reserved V-08 for $186 | `FLE-2048` |
| 3 | `claim_partner_capacity` | Blocked display-name identifier | no receipt |
| 4 | `claim_partner_capacity` | Claimed Northside for 760 meals using approved registry ID | `CAP-2049` |
| 5 | `claim_partner_capacity` | Claimed Harbor for 480 meals | `CAP-2050` |
| 6 | `dispatch_rescue` | Dispatched all 1,240 meals and six notifications | `RES-2051` |

## Why the blocked call matters

Gemini first passed `Northside Pantry`, while policy accepts only the registry ID `northside-pantry`. The deterministic tool blocked the mutation. Gemini corrected the identifier and continued. The final response explicitly reported the blocked action instead of hiding it.

## Final agent result

- 1,240 meals recovered
- $186 spend, below the $250 ceiling
- V-08 reserved
- two verified partners confirmed
- dispatch confirmed
- four successful mutation receipts
- one blocked and recovered action
