# Gemba: pitch, impact statement and 3-minute video outline (draft v0.1, 16 Oct 2026)

> Audience: AI Builder Cup judges (Google Cloud, Hack2skill, industry). Plain language, numbers first. Every number below
> comes from our simulator or from the verified research in `docs/research/01-deep-research.md`; external figures are
> credited as estimates. Simulated parts are called simulated.

## Elevator pitch (30 seconds)

A small factory runs on four screens that never talk: machines, the ERP, the maintenance log and a quality sheet. The
expensive problems cross those lines. A worn spindle makes scrap, slows the line, wastes energy and puts a customer
order at risk, and nobody connects them until the line stops. **Gemba sends five Gemini agents on a walk through the
plant every 15 minutes**: Reliability, Quality, Supply, Energy and Flow, one for each word of the theme. They use real
tools on live data, a Lead agent links what they find, tests options on a digital twin, and hands the team **one plan
with the cost of doing nothing next to the cost of acting**. A named person approves; the technician gets the job on
the phone and asks questions by voice in Hindi or Thai.

## Impact statement

- **Downtime:** Siemens estimates a large plant loses about 27 hours a month to unplanned downtime, at $36k (FMCG) to
  $2.3M (automotive) per hour (survey estimates for large plants, 2024). For a small supplier the sharper pain is
  losing supplier status under on-time-in-full scoring. In our demo plant the plan turns a 97 %-covered order into a
  106 %-covered one and avoids about 32 machine-hours of downtime in four days (simulated).
- **Quality:** the agents trace chatter-mark scrap to a worn bearing (scrap 3.4 % vs 0.8 % normal) and porosity to one
  casting lot, and confirm both with Gemini vision on part photos.
- **Energy and carbon:** Indian MSMEs use about 50 Mtoe a year, about a quarter of industrial energy (OECD). Gemba
  measures energy per good part, not just kWh: a worn spindle uses 25 % more per part, and a night-time air leak costs
  about ₹7.9 lakh and 72 t CO2e a year in our demo plant (simulated).
- **People:** answers in the worker's language, by voice, with lock-out first and a release check before restart.

## Why it is different

1. **Cross-department root cause**, not another predictive-maintenance dashboard with a chatbot.
2. **Agents that test before they propose:** every card's impact is computed by the simulator, not written by the model.
3. **Guardrails as features:** named approvals, frozen sensors never send a repair crew, parts before plans, read-only
   SQL, release readings, full audit log.
4. **Built for SMEs in India and South-East Asia:** multilingual voice, rupees and baht, time-of-day tariffs, grid
   carbon factors per country.

## 3-minute video outline (to be written word by word after the Cloud Run deploy)

| Time | Screen | Say (draft) |
|---|---|---|
| 0:00–0:20 | Floor, 3D twin, VMC-204 pulsing red | The problem in one sentence; Meridian Precision Components is simulated |
| 0:20–1:10 | Gemba walk: five lanes stream tool calls; vision boxes on the part photo | Five agents, real tools, Gemini vision; the Lead links quality ← reliability |
| 1:10–1:50 | Plan cards: do nothing vs plan; approve with a name | Numbers from the simulator; one approval creates work orders |
| 1:50–2:20 | Phone: job card, lock-out, voice question in Hindi | Hands-free help in the worker's language; release needs a reading |
| 2:20–2:40 | Ask Gemba with SQL shown; guardrail refusal | Plain-language questions, read-only, every number traceable |
| 2:40–3:00 | Architecture slide: Cloud Run + Gemini on Agent Platform | How it scales from one plant to many; close |
