# Devpost submission — Relay

## Category

**The Taskmaster**

## Elevator pitch

Relay is an autonomous cold-chain recovery agent. When a refrigerated truck
fails, it discovers what vehicles and food-bank capacity actually exist, plans a
recovery with Gemini 3.5 Flash, has every action checked by a deterministic
policy gate, executes the rescue, and leaves an auditable receipt for each side
effect — escalating to a human when the meals genuinely cannot all be placed.

## Inspiration

Food rescue is a race against a clock, but the recovery work is scattered across
fleet systems, inventory records, partner directories, routing, messaging,
budgets and safety policy. An operator ends up copying data between six tools
while the food gets warmer. That coordination is exactly what an agent should
do — and exactly the kind of work where an unchecked language model is
dangerous, because it involves spending money and sending food to real people.

## What it does

Relay converts an operational event into a complete workflow. Ship three
missions, each of which forces a different kind of reasoning:

- **RLY-2048** — 1,240 meals, 71-minute window. No single partner can take the
  load, so it has to be split across two verified food banks. *Result: 1,240
  meals recovered, $186 of a $250 ceiling, 4 receipts, 26 s.*
- **RLY-2071** — 900 meals against a **$150** ceiling. The fastest van costs
  $240 and would break the budget; the cheapest van is not refrigerated and the
  load is at 8.4 °C. Only one vehicle satisfies both rules. *Result: 900 meals,
  $140, 13 s.*
- **RLY-2090** — 1,500 meals against a partner network that can only absorb
  1,050. *Result: 1,050 meals dispatched, **450 escalated to a human**, with the
  reason on the receipt.*

## How we built it

- **Gemini 3.5 Flash** plans each recovery and drives the tools by function
  calling. It is never given the answer — the mission briefing is plain language.
- **Google ADK (Python)** owns the agent loop, tool schemas and traces, capped
  at 24 model calls so a stuck run fails cheaply instead of looping.
- **Cloud Run** hosts one container that serves both the agent and the console.
- **Firestore** checkpoints every confirmed receipt when enabled.
- **FastAPI** streams the live run to the browser as server-sent events, so the
  interface shows real tool calls as the model makes them.
- **React 19 + Vite + Anime.js** render the operations console.
- Deterministic Python gates spend, partner identity, cold-chain rules, the
  safety window and dispatch coverage before any tool mutates state.

Seven tools split into three read-only discovery tools and four mutation tools.
Only the mutations pass through the policy gate and the receipt ledger.

## Challenges

The hard part was making autonomy trustworthy without making it fake.

An early version scored well in a demo but had the mission's answer written into
the system prompt — "use V-08 at $186, Northside for 760." That is a puppet, not
an agent. Removing it meant giving Gemini genuine discovery tools and letting it
be wrong, then making the policy layer strong enough that being wrong is safe.

That exposed a real bug worth keeping in the write-up: retrying a confirmed
vehicle reservation was **blocked** by the spend ceiling, because the second
attempt was re-charged before the idempotency ledger was consulted. A retry is
not a second action. The ledger now runs before policy, which is what makes a
mission genuinely safe to resume.

## Accomplishments

- The console is wired to the live agent. Pressing **Run rescue** streams real
  Gemini tool calls; nothing is pre-recorded.
- The agent reasons about genuine trade-offs — it rejects an over-budget vehicle
  and an unrefrigerated one without being told which to pick.
- It reports partial success honestly. `RLY-2090` ends with 450 meals escalated
  rather than a fabricated clean sweep.
- Replaying a side effect returns the original receipt and does not re-charge
  spend or re-consume capacity.
- 19 policy tests, a reproducible Cloud Run deployment, an architecture diagram,
  and captured evidence of every run.

## What we learned

The most useful design pattern was **the model proposes; policy decides; tools
prove**. Keeping probabilistic planning and deterministic authorization in
separate layers made the system easier to debug than inspecting model reasoning,
because every refusal is a specific, testable rule.

The second lesson was that failure handling is a product feature. The most
convincing moment in the demo is not the successful rescue — it is the mission
the agent cannot complete, where it dispatches what it can prove and escalates
the rest.

## What's next

Wire the Pub/Sub trigger to live carrier telemetry, put mission checkpoints in
Firestore by default, add partner-specific signed webhooks, evaluate failure
paths at scale, and extend Relay from a single rescue planner into a regional
network of coordinated food-rescue agents.

## Technologies

Gemini 3.5 Flash, Google Agent Development Kit, Google Cloud Run, Vertex AI,
Firestore, Cloud Build, Cloud Pub/Sub (design), Python 3.12, FastAPI, Uvicorn,
Server-Sent Events, React 19, TypeScript, Vite, Anime.js, Lucide, Docker.

## Submission URLs

- **Hosted product:** _paste the `.run.app` URL from `./scripts/deploy-cloud-run.sh`_
- **Source repository:** https://github.com/srivibhavpadakandla/relay-food-rescue
- **Demo video:** _paste the final public video URL_
