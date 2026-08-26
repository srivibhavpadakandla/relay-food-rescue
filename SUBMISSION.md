# Devpost Submission — Relay

## Category

**The Taskmaster**

## Elevator pitch

Relay is an autonomous cold-chain recovery agent. When a refrigerated truck fails, Relay evaluates the food-safety window, plans a recovery with Gemini 3.5 Flash, enforces deterministic policy, reserves a backup vehicle, claims capacity from verified food banks, dispatches the route, and leaves an auditable receipt for every action.

## Inspiration

Food rescue is a race against time, but the recovery work is scattered across fleet systems, inventory records, partner capacity, routing, messaging, budgets, and safety policy. Operators should make judgment calls—not copy data between six tools while food gets warmer.

## What it does

Relay converts an operational event into a complete workflow. The demo mission protects 1,240 meals after Truck R-14 loses refrigeration. It calculates a 71-minute window, chooses backup van V-08, splits the load across two verified partners, executes four scoped tools, delivers six notifications, and confirms a 23-minute safety buffer. Every side effect is checkpointed and idempotent.

## How we built it

- **Gemini 3.5 Flash** plans the recovery and uses function calling.
- **Google ADK (Python)** owns the agent loop, tool schemas, and traces.
- **Cloud Run** is the deployment target for the ADK API server.
- **Firestore** is the production mission-checkpoint design.
- **Pub/Sub** is the production cold-chain event trigger design.
- **React 19 + Anime.js** power the live mission-control experience.
- **React Bits-style primitives** provide spotlight surfaces, magnetic controls, count-up metrics, and animated text.
- Deterministic Python policy gates spend, partner identity, privacy, and side effects before tools execute.

## Challenges

The hard part was balancing autonomy with operational trust. A food-rescue planner has to move quickly, but a language model should not be the final authority for spending or partner access. Relay separates probabilistic planning from deterministic authorization and records an idempotency key after every mutation.

## Accomplishments

- A real Gemini 3.5 Flash run invoked the ADK tools and completed the 1,240-meal mission.
- The partner registry blocked an incorrectly formatted destination, and the agent recovered using the approved identifier instead of pretending the first call succeeded.
- Repeating a side effect returns the original receipt.
- The judge-facing UI demonstrates the full workflow in under ten seconds.
- The repository includes tests, Cloud Run deployment code, architecture, evidence, and reproducible setup instructions.

## What we learned

The most important agent design pattern was: **the model proposes; policy decides; tools prove**. Clear tool contracts and receipts made the system easier to debug than exposing model reasoning. Failure handling became a product feature instead of an afterthought.

## What's next

Connect live carrier telemetry, persist mission checkpoints in Firestore, add partner-specific signed webhooks, evaluate failure paths at scale, and extend Relay from a single rescue planner into a regional network of coordinated food-rescue agents.

## Technologies

Gemini 3.5 Flash, Google ADK, Google Cloud Run, Vertex AI, Firestore, Pub/Sub, Python 3.12, React 19, TypeScript, Anime.js, React Bits-style UI components, Lucide, Cloudflare Workers/Sites, OpenTelemetry, Docker.

## Submission URLs

- Hosted product: https://relay-food-rescue.srivibhavpadakandla.chatgpt.site/
- Source repository: https://github.com/srivibhavpadakandla/relay-food-rescue
- Demo video: _insert final public video URL_
