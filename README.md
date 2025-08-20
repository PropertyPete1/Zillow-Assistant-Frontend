# Lifestyle Zillow Assistant (Backend + Chrome Extension)

This repo now contains only the backend(s) and the Chrome extension. The unused Next.js frontend has been removed to simplify deployment and maintenance.

## Structure

- `BackendSync/Zillow-Assistant-Backend/` — Express + Mongoose backend (Render deploy target)
- `backend-v2/` — Parallel Express backend using MongoDB driver (local-only; optional to publish)
- `zillow-frbo-extension/` — Chrome extension source (load unpacked in Chrome)
- `docs/apps-script/sent_logger_webapp.gs` — Google Apps Script used for optional Sheets logging
- `release/` — Packaged artifacts

## Backend (Render)

- Health: `/health` and `/api/leads/health`
- Leads API: `/api/leads/ingest`, `/api/leads/next-batch`, `/api/leads/mark`, `/api/leads/metrics`
- Env (Apps Script logging):
  - `SENT_SYNC_ENABLED=true`
  - `APPS_SCRIPT_WEBAPP_URL=<your Google Apps Script /exec URL>`
- Alternative (service account via v2):
  - `GOOGLE_SERVICE_ACCOUNT_JSON`, `SHEET_SENT_ID`, `SHEET_SENT_TAB`

## Chrome Extension

Load from `zillow-frbo-extension/` via `chrome://extensions` → Load Unpacked.

Set the backend URL in the popup to point at the Render deployment.

## Notes

- `backend-v2` has no remote; create one and push if you plan to keep it.
- Owner-only filtering and company suppression will be implemented in a follow-up phase.
