# Deploy Gemba

Gemba is one container (API + live streams + web app). It keeps each visitor's plant in memory, so run **one instance**.

## A. Our server (current, owner decision 16 Oct 2026)

Rig container behind the backend's routing: https://gemba.lehana.in and https://gemba.aidhunik.com. Compose and commands:
`/root/docker/gemba` (internal). Environment: `GEMBA_LLM=gateway` (plus `LLM_GATEWAY_URL`, `LLM_INTERNAL_KEY`,
`LLM_API_KEY`, `LLM_PROVIDER`), optional `GEMINI_API_KEY` as backup, `GEMBA_DATA_DIR=/data` for the recorded walk.

## B. Firebase Hosting front end (free, rules-friendly live URL)

```bash
tools/build_firebase.sh https://gemba.lehana.in <firebase-project-id>
npx -y -p node@22 -p firebase-tools firebase login   # owner: Google sign-in (human step); system Node is 18
cd dist/firebase && npx -y -p node@22 -p firebase-tools firebase deploy --only hosting
```
Then allow the Firebase origins on the server: `GEMBA_CORS_ORIGINS=https://<id>.web.app,https://<id>.firebaseapp.com` and
restart. The session id travels in an `X-Gemba-Session` header (no third-party cookies needed).

## C. Cloud Run (optional)

## One-time setup (owner, human steps)

```bash
gcloud auth login                                   # browser sign-in
gcloud config set project <PROJECT_ID>              # a project with billing enabled
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com
# Let the Cloud Run runtime service account call Gemini on Agent Platform (formerly Vertex AI):
PROJECT_NUMBER=$(gcloud projects describe <PROJECT_ID> --format='value(projectNumber)')
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role="roles/aiplatform.user"
```

## Deploy

```bash
gcloud run deploy gemba --source . --region asia-south1 --allow-unauthenticated \
  --min-instances 1 --max-instances 2 --session-affinity --cpu 2 --memory 2Gi --timeout 300 \
  --set-env-vars GEMBA_LLM=vertex,GOOGLE_CLOUD_PROJECT=<PROJECT_ID>,GOOGLE_CLOUD_LOCATION=global,GEMBA_MODEL_AGENT=gemini-3.8-flash,GEMBA_MODEL_LEAD=gemini-4-argon,GEMBA_MODEL_VISION=gemini-3.8-flash,GEMBA_MODEL_VOICE=gemini-3.8-flash
```

Check: `curl https://<service-url>/api/health` shows `"provider": "vertex"` and the model names. If a model ID is not
available in the chosen location, set the `GEMBA_MODEL_*` variable to one that is (for example `gemini-3.8-flash` for the
Lead too) and redeploy; nothing else changes.

## Environment variables

| Variable | Meaning |
|---|---|
| `GEMBA_LLM` | `vertex` (Cloud Run, service account), `aistudio` (needs `GEMINI_API_KEY`), `gateway` (local development), `mock` (rules engine) |
| `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` | Agent Platform project and location (`global` by default) |
| `GEMBA_MODEL_AGENT/LEAD/VISION/VOICE` | Model IDs per role |
| `GEMBA_LEAD_THINKING` | Thinking level for the Lead on Argon (`LOW` default) |

No key is stored in the image or the repo. Secrets, if ever needed, go to Secret Manager.
