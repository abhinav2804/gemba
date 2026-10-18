# Changelog

## 0.3.0 — 2026-10-16
- Gemba Watch: agents start by themselves when a new signal appears (machine wear, frozen sensor, air leak, scrap jump),
  calling only the specialists that signal needs; notifications with a link to the walk.
- Time travel on the twin: 3 days back to 3 days ahead, with the approved plan or "if we do nothing"; play the next 72 h.
- Retime a card before approving: sliders recompute the impact on the simulator; approval refuses a repair before the
  spare part can arrive; edits and rejections are remembered and passed to the Lead on the next walk ("What Gemba learned").
- Link graph of how the departments' findings connect; earlier waiting cards on the walk page.
- Compressor energy baseline model (kW vs plant load) for leak detection; new `compressor_baseline` tool.
- Planned-repair status on the twin; welcome dialog and seven-step guided tour.
- Resilience: Gemini provider chain (gateway → AI Studio key when present), model health badge with a 5-minute probe,
  labelled rules fallback, and replay of the last recorded live Gemini walk when the model is unreachable.
- 20 tests.

## 0.2.0 — 2026-10-15 (night)
- Web app: control room with a live 3D digital twin (Three.js, health / energy / quality lenses, 2D fallback),
  Gemba walk with streamed agent lanes and approvable plan cards, Machine 360, Ask Gemba with SQL and charts,
  Quality station with Gemini vision boxes, Energy and carbon, Supply and demand, Work orders, technician job view
  with voice in Hindi / Marathi / Thai / English, Trust and audit. Phone layout at 390 px, light and dark themes.
- Backend: analytics (health, ISO-style zones, time-to-trip range, anomaly model, scrap control charts, energy per good
  part, night base load, OEE losses), what-if simulator, read-only DuckDB views with a SQL guard, Gemini client with
  four providers, Gemba walk (5 specialists + Lead), Ask, vision, voice, work orders with lock-out and release checks,
  presenter controls, rate limits for model-backed endpoints.
- Tests: 16 (simulator, analytics, SQL guard, guardrails, rules fallback, API smoke); browser sweep script.
- Sample part photos generated with a Gemini image model by the team.

## 0.1.0 — 2026-10-15
- Rules, research, concept, architecture, build plan; plant simulator and ERP layer.
