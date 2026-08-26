# Four-minute demo shot list

Target: ~4:00. The required Cloud Run proof is step 6 — do not replace it with a
mock.

| Time | Beat | What is on screen |
|---|---|---|
| 0:00–0:25 | **Problem** | Truck R-14 has failed. 1,240 meals, 71 minutes, 9.8 °C and rising. Name the six systems an operator would touch by hand. |
| 0:25–0:50 | **Value** | Relay acts from the event and finishes with receipts. State the rule: the model proposes, policy decides, tools prove. |
| 0:50–1:50 | **Live run, unedited** | Press **Run rescue** on `RLY-2048`. Let the trace fill in real time: discovery calls, then V-08 reserved, two capacity claims, dispatch. Land on 1,240 meals, $186 of $250, 4 receipts. |
| 1:50–2:25 | **It is really reasoning** | Switch to `RLY-2071` ($150 ceiling). Point out that the fastest van costs $240 and the cheapest is not refrigerated, and the agent picks V-12 unprompted. |
| 2:25–3:05 | **Honest failure** | Run `RLY-2090`. It dispatches 1,050 and escalates 450 with the reason on the receipt. This is the moment: the agent refuses to fake a clean sweep. |
| 3:05–3:30 | **Architecture** | Cold-chain event → Cloud Run (FastAPI + ADK + Gemini 3.5 Flash) → policy gate → scoped tools → idempotent ledger → Firestore. Show `docs/architecture.png`. |
| 3:30–3:50 | **Google Cloud proof (required)** | The real `.run.app` URL in the address bar, `curl /healthz` returning the live revision and `"vertex_ai": true`, and the Cloud Run console showing that revision plus request logs. |
| 3:50–4:00 | **Close** | 1,240 meals in 26 seconds, every action auditable, nothing claimed without a receipt. |

## Notes

- Record the run live. The console streams real Gemini calls, so a retake is
  cheap and the timings will differ slightly — that is a feature, not a problem.
- The console's left rail shows the model and the Cloud Run revision, so the
  Google Cloud proof is visible in the product during the whole demo.
