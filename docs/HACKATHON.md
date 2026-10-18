# AI Builder Cup 2026: the rules we build against

Sources, read 15 Oct 2026 (22:30 IST): https://aibuildercup.com (home, `themes.html`, `Faqs.html`, `rewards.html`) and the
Initiative Terms & Conditions (Google Doc linked from the home page). Organiser: **Hack2skill**. Sponsor: **Google Cloud**
(the event is "independently operated by Hack2skill").

## Our theme

**Manufacturing: Intelligent Operations & Industrial Efficiency.** "Build an AI-powered solution that addresses challenges
related to efficiency, quality, reliability, supply and demand, or sustainability across manufacturing and industrial
operations. Solutions should demonstrate how AI can transform operational data into meaningful insights, recommendations,
or actions."

## Dates

| Phase | Date (2026) |
|---|---|
| Registration (closed) | 1 Sep – 11 Oct |
| Team formation (closed; no roster changes after) | until 14 Oct |
| Prototype building | 7 Sep – 18 Oct |
| **Prototype submission deadline** | **18 Oct** (time and time zone not published: confirm on the Hack2skill dashboard) |
| Evaluation (scoring round) | 19 Oct – 6 Nov |
| Finalists announced | 7 Nov |
| Grand Finale, demo day | 4 Dec, Singapore (2 members travel, sponsored; visas are ours) |

## Hard requirements (miss one and we are out)

| # | Requirement | Source wording |
|---|---|---|
| R1 | Uses Gemini or Gemma models (or Agent Platform, Antigravity, AI Studio) | "All prototype submissions must integrate AI models such as the family of Gemini or Gemma models" |
| R2 | Deployed on **Cloud Run or Firebase** (Google Cloud) | "must be deployed on Google Cloud Platform using Cloud Run or Firebase" |
| R3 | Built primarily on Google Cloud | "Solutions built primarily on competing cloud infrastructure will be deemed ineligible and disqualified" |
| R4 | **Fresh code only** | "Submissions must consist exclusively of fresh code and original assets created during the official hackathon timeline." "Pre-existing products, ongoing projects, or code developed prior to the official launch will be disqualified." |
| R5 | No third-party protected content | "Participants must not use any content protected under third party rights." (use our own synthetic data and generated images; open-source libraries under their licences) |
| R6 | English everywhere | code, docs, deck, video |
| R7 | One submission, one theme, team of 2–4, all members 21+, working professionals, based in JAPAC, **no students** | FAQ + T&C |

## Deliverables

1. **Deployed link** to the working prototype (Cloud Run / Firebase).
2. **Demo video, 3 minutes or less** (public YouTube, Vimeo or Google Drive link).
3. **Public GitHub repository.**
4. **Deck (PDF)**: problem, community benefit, feasibility, scalability ("a compelling vision for your AI solution").
5. The problem statement / theme we submit for (Manufacturing).

## Judging (same for all six themes)

| Criterion | Weight | What they look at |
|---|---|---|
| Technical Merit & Gen AI Implementation | **40 %** | meaningful use of Gen AI; technical implementation; scalability and sustainability |
| Problem Alignment & Impact | 25 % | problem alignment; potential impact |
| Innovation & Creativity | 25 % | originality and differentiation; innovation in the use of Gen AI |
| User Experience & Solution Design | 10 % | usability and accessibility; experience and integration |

Prizes (USD 30,000): Winner 10,000 · 1st runner-up 7,000 · 2nd runner-up 5,000 · **Best use of Google Cloud AI tools**
2,000 · Most Impactful Solution 2,000 · Social Choice 2,000 · **Best UI/UX** 2,000.

## Hosting decision (owner, 16 Oct 2026) and what the rules say

- **Owner decision:** host Gemba on our own server (lehana-rig) behind the backend's domain routing:
  https://gemba.lehana.in and https://gemba.aidhunik.com. Gemini is reached through our LLM gateway.
- **What the published rules say (re-checked 16 Oct, quoted):**
  - Initiative T&C, *Technical Stack, Authenticity and Freshness Standards* 1: "All submitted prototypes must be built
    primarily using the Google Cloud tech stack (e.g., Cloud Run, GCP, Firebase)." Item 3a: "A working deployed live URL
    (on Cloud Run/GCP/Firebase)."
  - Themes page: "they must be deployed on Google Cloud via Cloud Run or Firebase"; FAQ: "Your solution must be built
    using Google Cloud's tech stack."
  - Themes page, AI tools: "must integrate AI models such as the family of Gemini or Gemma models … or built using agentic
    platforms like Agent Platform, Antigravity, AI Studio" (we use Gemini).
- **Risk:** a live URL that is not on Cloud Run / GCP / Firebase can be read as non-compliant (disqualification or a lower
  technical score). Our server is not a "competing cloud", which helps, but the live-URL clause is explicit.
- **Cheapest compliant option kept ready:** `tools/build_firebase.sh` builds the same web app for **Firebase Hosting**
  (free Spark plan, no billing); it calls the API on our server (cross-origin, session id in a header). Needs only the
  owner's Google sign-in for `firebase login` and a Firebase project. The submitted URL would then be `<project>.web.app`.

## What this means for us

- **Nirantar cannot be resubmitted.** It was built on Snowflake (a competing cloud, R3) for another competition. We carry
  over ideas, domain knowledge and lessons, not code or assets. Everything in this repo is written from 15 Oct 2026.
- Gemini must do real work that a judge can see: agents with tools, vision, voice, structured plans. Not a chat box on a
  dashboard.
- Google Cloud native where it counts: Gemini on Vertex AI (or AI Studio), Cloud Run, Firestore / BigQuery if time allows.
- Side prizes worth aiming at: Best use of Google Cloud AI tools, Best UI/UX, Most Impactful.

## Open questions for the owner

1. Are both members (Paras Lehana, Abhinav Kaushik) registered on the Hack2skill dashboard as one team for this theme?
2. Exact submission time and time zone on the dashboard.
3. A Google Cloud project with billing (Cloud Run + Vertex AI), and `gcloud auth login` on the rig (human step).
4. Exception to the platform LLM rule: call Gemini directly on Vertex AI from Cloud Run (recommended for R1 and the
   "Best use of Google Cloud AI tools" prize), keep `llm.lehana.in` for local development.
