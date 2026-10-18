# Research 01: what to build for the AI Builder Cup manufacturing theme

> **Run:** deep-research workflow, 15 Oct 2026, about 22:45 IST. 5 search angles, 22 sources fetched, 110 claims extracted,
> 25 checked by three independent votes each, 19 confirmed, 6 refuted. **Status:** verified claims only. Anything not
> listed here rests on prior knowledge and must be re-checked before it goes on a slide.

## 1. What the evidence says, in one paragraph

Build a **multi-agent "plant operations control tower"** for an Indian or JAPAC small or mid-size manufacturer. Run the
agents on Cloud Run, use Gemini 3.8 Flash for the routine agent loop and Gemini 4 Argon for deep root-cause analysis and
what-if planning, and add a **hands-free Gemini 3.8 Live voice copilot** for floor workers. This combines the two kinds of
entry that Google-run judges have rewarded most visibly: an end-to-end multi-agent workflow (SalesShortcut, 2025 ADK
Hackathon grand prize) and a hands-free voice copilot for physical work (ORION, 2026 Gemini Live Agent Challenge grand
prize). The architecture should mirror Google's own manufacturing reference stack (edge connectivity → Manufacturing Data
Engine → BigQuery → Gemini).

## 2. Verified findings

| # | Finding | Confidence | Use it for |
|---|---|---|---|
| 1 | **Gemini 4 Argon** (`gemini-4-argon`) went GA on 13 Oct 2026: Google's most capable model for coding, agentic, maths and science tasks; 1,048,576-token context; LOW/MEDIUM/HIGH thinking; function calling, structured output, Google Search grounding, code execution. No Live API, implicit caching only. **Gemini 3.8 Flash** (`gemini-3.8-flash`, GA 2 Sep 2026) is the newest Flash, aimed at autonomous agents. Gemini 2.5 is closed to new users (18 Sep 2026); 2.0 Flash and Flash-Lite were discontinued on 1 Jun 2026. | High (3-0) | Model split: 3.8 Flash for the agent loop, Argon for the Lead's root-cause and plan step |
| 2 | **Gemini 3.8 Live** and **3.8 Live Extended Thinking** are GA. Inputs text, image, audio, video; outputs text and audio. Function calling works; on the Gemini API tools run asynchronously by default, so the conversation continues while a tool runs. Live models have no structured output, code execution or caching. Agent Platform access to 3.8 Live appears to need an allowlist, so use an AI Studio / Gemini API key. | High (3-0) | Worker voice view: Live for talk, a normal Gemini call for anything that must be structured |
| 3 | On 22 Apr 2026 **Vertex AI and Agent Builder became the Gemini Enterprise Agent Platform**: Agent Engine → **Agent Runtime**, Vertex AI Studio → **Agent Studio**, Vertex AI API → Agent Platform API. The `vertexai` / `aiplatform` SDKs and endpoints still work. | High (3-0) | Use the new names in the deck and architecture diagram |
| 4 | Google's 2025 ADK Hackathon scored Technical Implementation 50 %, Innovation 30 %, Demo and Documentation 20 %, and asked for **visible multi-agent collaboration** and an **architecture diagram**. Bonus points went to a public build write-up, an ADK open-source contribution and breadth of Google Cloud use. | High (3-0) | What Google judges look for: agents visibly working together, a diagram, a blog post |
| 5 | Winners: **SalesShortcut** (2025 ADK grand prize; 34 agents, 5 Cloud Run services over A2A); at least 4 of 8 winners and honourable mentions were multi-agent (e.g. TradeSageAI on ADK + Agent Engine + Cloud Run). **ORION** (2026 Gemini Live Agent Challenge grand prize): a voice-directed surgical copilot that gives answers and live data without the surgeon "breaking scrub". | Medium (3-0) | Pitch framing: a control tower of cooperating agents + a hands-free copilot for people whose hands are busy |
| 6 | **Siemens/Senseye, True Cost of Downtime 2024:** an hour of downtime costs about **$2.3M in a large automotive plant** and **$36k in FMCG**. An average large plant has **25 incidents and loses 27 hours a month** (42 and 39 in 2019); about $253M a year per plant. | Medium (3-0) | "Why it matters" slide, credited as survey estimates for large plants |
| 7 | Same report: for small and mid-size firms downtime can cost **"up to" $150k an hour** (unsourced upper bound). It names two SME harms: **losing supplier status under OTIF scoring** and **having to hold costly buffer stock**. | Low | The SME story: the Friday order and OTIF, not the dollar figure |
| 8 | Senseye deployments report up to **50 % less unplanned downtime, 40 % lower maintenance cost, 55 % more maintenance productivity, 85 % better forecasting**. Vendor best cases. | Low (2-1) | Only as "vendors report up to …" |
| 9 | **OECD:** Indian MSMEs use about **50 Mtoe of energy a year, about 25 % of Indian industry's energy**; demand could grow about 6 % a year without efficiency measures. | High (3-0) | Sustainability angle for an India-first copilot |
| 10 | Google Cloud's manufacturing reference stack: **Litmus edge (MCe/MC) → Manufacturing Data Engine (+ Cortex Framework) → BigQuery → Gemini**; Google's MDE page describes "Gemini-powered agents (predictive maintenance, quality, scheduling)". | Medium (2-1) | Architecture slide: "simulated edge → BigQuery-shaped store → Gemini agents" |
| 11 | **MVTec AD**: 5,354 images, 15 categories, 70+ defect types. Licence **CC BY-NC-SA 4.0**, non-commercial. | High (3-0) | Not used: rule R4 (no third-party assets) and the non-commercial licence. We generate our own inspection images |
| 12 | **NASA C-MAPSS**: public on data.nasa.gov, licence "not specified". Cite the NASA Prognostics Data Repository; never claim CC-BY. | High (3-0) | Not used for the same reason. Our simulator is our own |

## 3. Refuted, do not use

| Claim | Vote |
|---|---|
| Fortune Global 500 loses $1.4T a year (11 % of revenue) to downtime | 1-2 |
| "Live API + ADK + Cloud" is Google's flagship rewarded stack | 0-3 |
| GreenOps (APAC winner) as a sustainability parallel | 1-2 |
| Motors use 69 % of Indian industrial energy; IE3 5 %; Ankleshwar 5–15 % savings | 0-3 |
| 56 % of MSMEs monitor energy, 35 % audited | 0-3 |
| Litmus presents four Gemini manufacturing capabilities as production-grade | 0-3 |

## 4. Gaps (not verified, check before relying on them)

- Gemma for on-device or edge use; ADK, A2A and MCP specifics; Agent Runtime features; BigQuery ML and Gemini in BigQuery;
  Firebase Hosting, Firestore, Genkit, Firebase AI Logic; Cloud Run limits; Looker Studio.
- Impact figures for AI visual inspection, demand sensing and inventory, scheduling, and energy or carbon per unit.
- Every competitor product (Siemens Industrial Copilot, Microsoft Factory Operations Agent, AWS IoT SiteWise, Cognite,
  Tulip, Sight Machine, Augury, Landing AI, Instrumental).
- Licences of Bosch production line, SECOM, UCI steel plates and industrial energy datasets.
- **Time sensitivity:** Argon is two days old; Argon API access is reportedly paid tier only and its introductory price
  doubles on 30 Nov 2026. 3.7 Flash and 3.5 Flash were deprecated on 8 Oct. Re-check model IDs and quotas on build day.
- **Judging evidence comes from other Google contests.** The AI Builder Cup rubric is different (Technical Merit 40,
  Impact 25, Innovation 25, UX 10) and has no confirmed bonus scheme or multi-agent requirement.

## 5. Open questions (carried to MIGRATE.md for the product manager)

1. Can `gemini-4-argon` and `gemini-3.8-live` be called on Agent Platform in an Asia region without an allowlist? Does the
   "Best use of Google Cloud AI tools" prize favour Agent Platform / Agent Runtime / BigQuery over a plain API key?
2. Credible, independent impact figures for AI visual inspection, demand sensing, scheduling and energy or carbon per unit
   for Indian and JAPAC SMEs.
3. Shared UX patterns of Siemens Industrial Copilot, Microsoft Factory Operations Agent, Cognite, Tulip, Sight Machine,
   Augury and Landing AI (grounded citations, approval-gated actions, work-order handoff) and the gaps a prototype can
   exploit (multilingual voice, SME pricing, setup without a historian or MES).
4. Is a Gemma on-device component worth adding for an offline shop-floor story?

## 6. Sources

Primary: [Gemini API changelog](https://ai.google.dev/gemini-api/docs/changelog) ·
[Agent Platform release notes](https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes) ·
[Gemini Live Agent Challenge winners](https://cloud.google.com/blog/topics/developers-practitioners/winners-and-highlights-of-the-gemini-live-agent-challenge) ·
[ADK Hackathon winners](https://cloud.google.com/blog/products/ai-machine-learning/adk-hackathon-results-winners-and-highlights) ·
[ADK Hackathon rules](https://googlecloudmultiagents.devpost.com/rules) ·
[Siemens True Cost of Downtime 2024](https://assets.new.siemens.com/siemens/assets/api/uuid:1b43afb5-2d07-47f7-9eb7-893fe7d0bc59/TCOD-2024_original.pdf) ·
[OECD India clean-energy roadmap, MSME chapter](https://oecd.org/en/publications/clean-energy-finance-and-investment-roadmap-of-india_21b6e411-en/full-report/component-6.html) ·
[Litmus + Google press release](https://litmus.io/newsroom/litmus-accelerates-industrial-ai-with-a-unified-edge-to-cloud-stack-enabled) ·
[Google Manufacturing Data Engine](https://cloud.google.com/solutions/manufacturing-data-engine) ·
[MVTec AD](https://www.mvtec.com/company/research/datasets/mvtec-ad) ·
[NASA C-MAPSS](https://data.nasa.gov/dataset/cmapss-jet-engine-simulated-data).
Secondary and blogs (context only): Deloitte PdM position paper 2024, Outlook Business on the Gen AI Hackathon 2025,
Landing AI / A3 machine-vision report, Teeptrak OEE benchmark 2026, Tulip AI trigger actions, Cognite Atlas AI, Siemens
Industrial Copilot at Schaeffler.
