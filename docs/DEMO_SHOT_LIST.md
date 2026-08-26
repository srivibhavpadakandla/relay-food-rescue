# Four-Minute Demo Shot List

1. **0:00–0:30 — Problem:** Truck R-14 fails; 1,240 meals and the safety clock are visible.
2. **0:30–1:00 — Value:** Relay acts from an operational event and ends with receipts.
3. **1:00–2:00 — Unedited product:** Click Run rescue once; show all four tool states and the final mission receipt.
4. **2:00–2:55 — Architecture:** Pub/Sub → Cloud Run/ADK → Gemini → policy → scoped tools → receipts/state.
5. **2:55–3:35 — Failure discipline:** Show blocked partner identifier, idempotent replay, spend ceiling, and resume behavior.
6. **3:35–3:55 — Required production proof:** Show the real `.run.app` URL, Cloud Run revision, and matching request logs. Do not replace this with a mock.
7. **3:55–4:05 — Close:** 1,240 meals, 17-minute audited recovery, 23-minute safety buffer.

Before uploading, replace the current proof placeholder in the composition with the real Cloud Run console/log capture.
