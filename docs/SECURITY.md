# Security and trust boundaries

Relay treats the language model as a planner, never as an authority.

## Deterministic controls

Enforced in Python before any tool mutates state, and covered by
`services/tests/test_policy_tools.py`:

| Control | Rule |
|---|---|
| Spend ceiling | Total mission spend may not exceed the mission's ceiling. Cost is read from the fleet record, not from the model's arguments, so a lower price cannot be asserted. |
| Vehicle registry | Only vehicles returned by `list_fleet_options` for that mission may be reserved. |
| Cold-chain rule | A load above 4 °C requires a refrigerated vehicle. |
| Safety window | A vehicle or partner that cannot be reached inside the remaining window is refused. |
| Partner registry | Capacity may only be claimed from exact registry IDs. Display names are refused with the valid IDs returned. |
| Capacity limits | A claim larger than the partner can accept is refused, accounting for claims already made. |
| Dispatch coverage | Dispatch is refused if the meal count exceeds confirmed capacity claims, or if the vehicle was never reserved. |
| Idempotency | Every side effect requires a mission-scoped idempotency key. |
| Loop bound | The agent loop is capped at `RELAY_MAX_LLM_CALLS` (default 24). |

Blocked calls return a structured reason, so the agent can correct itself rather
than retrying blindly — and the block is shown in the console instead of being
hidden.

## Credential handling

- API keys and cloud credentials come from environment variables or the
  platform's managed identity; none are committed.
- Cloud Run deploys with Vertex AI by default, so no API key enters the image.
- `.env*`, PEM files, build output and virtualenvs are gitignored.
- No credential reaches the browser bundle; the console only calls same-origin
  endpoints.

## Data boundary

- Tool payloads and receipts carry mission, vehicle, partner and meal counts —
  no recipient names, addresses, or other personal data.
- Receipts are the audit surface and are safe to persist and replay.

## Failure model

- A duplicate side effect returns the original receipt. The ledger is consulted
  **before** policy, so a retry is never re-charged or re-counted.
- Invalid input is blocked and surfaced to the agent with the reason.
- The model cannot mark a mutation successful without a tool receipt.
- Meals that cannot be placed are escalated to a human operator, not silently
  dropped or falsely reported as rescued.
- A run that exceeds the model-call budget fails loudly and streams an error to
  the console rather than hanging.
- Production retries should add bounded exponential backoff and circuit
  breakers; mission checkpoints belong in Firestore after every confirmed side
  effect.
