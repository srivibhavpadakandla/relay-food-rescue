# Security and Trust Boundaries

Relay treats the language model as a planner, not an authority.

## Deterministic controls

- Spending above `$250` is blocked in code.
- Capacity may only be claimed from exact approved partner registry IDs.
- Dispatch rejects any unapproved destination.
- Side-effect tools require mission-scoped idempotency keys.
- PII is excluded from tool payloads and receipts.

## Credential handling

- API keys and Cloud credentials are environment variables or managed platform secrets.
- `.env*`, PEM files, build output, local evidence payloads, and work files are gitignored.
- No credential is sent to the browser bundle.

## Failure model

- Duplicate delivery returns the original receipt.
- Invalid policy input is blocked and surfaced to the agent.
- A model cannot mark a mutation successful without a tool receipt.
- Production retries should use bounded exponential backoff and circuit breakers.
- Mission checkpoints belong in Firestore after every confirmed side effect.
