# Gemba: concept (v0.1, 15 Oct 2026)

> **Gemba (現場)** is the lean-manufacturing word for "the real place": the shop floor where value is made. Toyota
> managers "go to the gemba" to see problems with their own eyes. **Gemba (the product) sends a team of Gemini agents on
> a gemba walk every 15 minutes** and turns what they see into ranked, explained actions that a person approves.

Working codename; the brand is open for debate (see `/root/ideas/coco-cli/docs/MIGRATE.md`).

## One-line pitch

An AI operations floor for manufacturers: five Gemini agents (Reliability, Quality, Supply, Energy, Flow) watch live
machine, ERP and camera data, find the problems that cross departments, and hand the plant team one plan they can approve,
on a live 3D digital twin, by text or by voice in the worker's language.

## The problem (in the plant's words)

- A small or mid-size plant in India or South-East Asia runs on four disconnected screens: machine data (OT), the ERP,
  the maintenance log and a quality spreadsheet. Each department sees its own symptom.
- The expensive problems cross those lines. A wearing spindle bearing (maintenance) causes chatter marks (quality), which
  raise scrap and energy per good part (sustainability) just as a big customer order is due (supply). Nobody connects them
  until the line stops or the customer complains.
- Dashboards show numbers; they do not decide. Plant teams need "what is wrong, why, what it costs, what to do, and who
  approves", in plain words, on the phone in their pocket.

## The idea in five agents (maps 1:1 to the theme's five words)

| Theme word | Agent | Watches | Typical finding | Typical action |
|---|---|---|---|---|
| reliability | **Reliability agent** | vibration, temperature, current, RPM per machine; maintenance history | "VMC-204 spindle bearing wear, about 2 days to trip" | planned repair in a low-impact window, part reserved |
| quality | **Quality agent** | camera images of parts (Gemini vision), SPC on measurements, scrap by cause | "chatter marks on cylinder heads from VMC-204: 3.4 % vs 0.7 %" | containment: 100 % inspection, slow the spindle |
| supply and demand | **Supply agent** | orders and due dates, finished-goods and spare stock, demand forecast | "Deccan Drive Motors order due Friday is short; no bearing in Pune" | move the order to a sister machine, transfer the part |
| sustainability | **Energy agent** | kWh per machine and per good part, tariff windows, grid carbon factor | "worn spindle uses +24 % kWh per good part; repair fits the off-peak window" | shift the repair and heavy jobs off-peak |
| efficiency | **Flow agent** | OEE (availability × performance × quality), bottlenecks, micro-stops | "Line 1 OEE 72 % → 69 %; the loss is quality and speed, not downtime" | re-balance the schedule for the week |

A **Gemba Lead** (orchestrator agent) runs the walk: it fans out to the five agents in parallel, collects findings, links
the ones that share a cause, weighs trade-offs (delivery vs. cost vs. carbon vs. risk) and writes **one plan** as
structured "Gemba cards": finding, evidence, cost of doing nothing, recommended action, owner, approval needed. People
approve; agents never act alone.

## Hero story (deterministic demo scenario, synthetic data)

"**Meridian Precision Components**" (fictional) makes cylinder heads and gear housings for carmakers in three plants:
Pune and Chakan (India) and Rayong (Thailand). Wednesday morning:

Numbers below come from the simulator (`app/sim/`), not from slides:

1. **Quality** flags chatter-mark scrap on cylinder heads from Line 1: VMC-204 runs at **3.4 % scrap** against **0.7 %**
   on its twin machines (Gemini vision confirms the marks on part photos).
2. **Reliability** finds VMC-204's spindle vibration at 3.9 mm/s and rising at steady RPM, bearing temperature +14 °C:
   bearing wear, **about 2 days to the trip limit**. The Lead links the two: the quality problem is a machine problem.
3. **Supply**: the customer raised order SO-24117 from 3,500 to **4,100 heads, due Friday**. Doing nothing covers about
   **98 %** of it, because the machine trips first. Pune has no spare bearing; **Chakan has two (9 h transfer)**.
4. **Energy**: VMC-204 now uses **24 % more kWh per good part**; the repair fits the 22:00–06:00 off-peak window.
   Separately, compressor CMP-901 draws about 11 kW at night with the lines stopped: an air leak.
5. **Flow**: Line 1 OEE slid from **72 % to 69 %**; the loss is quality and speed, not stoppages (yet).
6. **The plan** (one set of cards): slow the spindle to 85 % now (less scrap, slower wear), transfer the bearing, repair
   tonight in the off-peak window, 100 % inspection until then. The order is covered again (104 %). Each card shows the
   cost of doing nothing vs the plan in rupees, hours, kg CO2e and delivery risk.
7. A supervisor **approves with a name**; the technician gets the job on the phone, asks questions **by voice in Hindi or
   Thai**, follows lock-out steps and logs the release reading; scrap and kWh per part recover on the twin.

Side stories the agents also find: a casting supplier lot with porosity in Rayong (Quality + Supply), a frozen temperature
sensor on GRD-102 that must **not** trigger a repair (guardrail), and a lathe whose tool life is set too long (Quality).

## What judges should remember (rubric map)

| Rubric | Weight | How Gemba earns it |
|---|---|---|
| Technical merit & Gen AI | 40 % | Multi-agent orchestration with Gemini function calling and structured output; Gemini vision for inspection (with boxes); Gemini audio for multilingual voice; NL-to-SQL over plant data; classical ML (anomaly, RUL, forecast) where math beats language; Cloud Run, scales to many plants |
| Problem alignment & impact | 25 % | All five pillars of the theme in one loop; impact in money, hours, scrap, kWh and CO2e; built for SMEs that cannot afford a data team |
| Innovation & creativity | 25 % | The AI gemba walk you can watch on the twin; cross-pillar root cause (quality ← reliability); agents negotiating trade-offs; "point your phone at a part" inspection; Failure Time Machine |
| UX & design | 10 % | Cinematic 3D twin and control room; phone-first worker view; voice in local languages; every number explained |

## Feature list (MUST ships by 18 Oct; SHOULD if time; WOW is the finale)

| # | Feature | Tier |
|---|---|---|
| F1 | Synthetic multi-plant simulator (machines, sensors, production, quality, energy, orders, stock) with fault injection and time control | MUST |
| F2 | 3D digital twin of the plant floor (health / quality / energy / flow overlays, click a machine) | MUST |
| F3 | Gemba Walk: Lead + 5 agents, tool calls streamed live, Gemba cards with approve / reject | MUST |
| F4 | Ask Gemba: chat over plant data (NL-to-SQL + tools), answers with charts and sources | MUST |
| F5 | Quality station: Gemini vision inspects part images (camera or upload), boxes, defect class, links to SPC | MUST |
| F6 | Machine 360: sensors, health, time to failure range, anomaly, maintenance history, spares | MUST |
| F7 | Work orders + approvals + audit log (who, what, why, evidence) | MUST |
| F8 | Worker phone view: job card, lock-out steps, voice Q&A in Hindi / Thai / English | SHOULD (voice: MUST if time) |
| F9 | Energy & carbon: kWh per good part, tariff windows, CO2e per plant | SHOULD |
| F10 | Supply: demand forecast, order risk, cross-plant stock, order re-allocation | SHOULD |
| F11 | Failure Time Machine (replay the 72 h before a past failure) | WOW |
| F12 | Shift handover brief (written and spoken) | WOW |
| F13 | Live API voice (real-time conversation) | WOW |

## Guardrails (features, not footnotes)

- Agents propose; a named person approves anything that moves people, parts or money.
- A frozen or disagreeing sensor is a sensor problem, never a repair dispatch.
- Every agent action and tool call is logged; every number links to the query or the tool that produced it.
- Gemini output is schema-validated; if the model is unavailable the plan falls back to the deterministic rules engine and
  says so.
- All data is synthetic; images are generated by us.
