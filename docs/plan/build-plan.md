# Gemba: build plan to 18 Oct (v0.1, written Thu 15 Oct 23:00 IST)

About 70 working hours. One builder agent plus the owner for human-only steps. Everything is written fresh from today.

| When (IST) | Block | Done when | Cut-line if late |
|---|---|---|---|
| Thu 22:30 – Fri 02:00 | Research, concept, architecture, PM brief (MIGRATE.md) | docs committed | — |
| Fri 02:00 – 08:00 | Simulator + analytics + DuckDB views + API skeleton | `/api/state`, `/api/stream` serve a live plant; tests pass | fewer machines |
| Fri 08:00 – 14:00 | Gemini client (gateway + vertex + mock) + tools + Gemba Walk (Lead + 5 agents) | walk streams events and returns valid cards for the hero scenario | 3 agents, Lead merges |
| Fri 14:00 – 22:00 | Web app: control room, 3D twin, walk view, cards, work orders | hero story clickable end to end on desktop and phone | 2D twin fallback |
| Fri 22:00 – Sat 06:00 | Ask Gemba (NL-to-SQL + charts), Machine 360, Quality station (vision) | judges can ask, inspect, drill down | upload-only vision |
| Sat 06:00 – 14:00 | Worker phone view + voice, energy and supply views, polish, QA at 390 and 1440 | QA sweep clean | text-only worker Q&A |
| Sat 14:00 – 20:00 | **Cloud Run deploy** (needs the owner's GCP login), README, deck, video script | live URL works signed out | deploy the mock-free gateway build |
| Sat 20:00 – Sun 18:00 | Buffer, owner records the video, final fixes, public GitHub repo | all deliverables ready | — |
| Sun (by the deadline) | Owner submits on Hack2skill | — | — |

## Human-only steps (owner)

1. `gcloud auth login` on the rig (or share a service-account key path, never in chat), pick or create the project,
   confirm billing for Cloud Run and the Agent Platform API (formerly Vertex AI).
2. Create the public GitHub repository (name agreed in MIGRATE.md) or allow the agent to push to an empty one.
3. Record and upload the video; press Submit; confirm the deadline time zone.

## Definition of done (prototype)

- Live Cloud Run URL loads in under 3 s and runs the hero story without a login.
- The Gemba Walk shows real Gemini tool calls and returns schema-valid cards; the fallback label never shows on the happy
  path.
- Vision inspection works on our sample images and on a judge's own upload.
- Every page works at 390×844 and 1440×900, in light and dark.
