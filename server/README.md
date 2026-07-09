# hackNY Server

A small standalone Express API for the hackNY Alumni viewer. It owns the member
data and the company-refresh scraping logic, so it can be deployed separately
from the `viewer/` frontend.

## Endpoints

- `GET /health` — health check, returns `{ ok: true }`.
- `GET /api/members` — returns the full member list (JSON).
- `POST /api/refresh` — re-scrapes LinkedIn snippets and re-derives every
  member's current company. Can take 3–5 minutes.

## Data

Member data lives in **MongoDB Atlas**. `data/members.json` may exist locally as a
backup (gitignored). The API reads members from Atlas, and the refresh job reads
and writes them there.

## Setup

Install deps and configure your env (see Environment below):

```bash
cd server
npm install
```

## Local development

```bash
npm run dev      # starts on http://localhost:3001 with --watch
```

Run a one-off refresh from the CLI without the HTTP server:

```bash
npm run refresh
```

## Environment

Set these in `server/.env` (never commit it):

- `MONGODB_URI` — required; your Atlas connection string (with the db password).
- `MONGODB_DB` — optional; database name (default `hackny`).
- `MONGODB_COLLECTION` — optional; collection name (default `members`).
- `SERPER_API_KEY` — required for `/api/refresh` (Google search via Serper).
- `CORS_ORIGIN` — optional; lock CORS to your frontend URL in production.
- `PORT` — optional; defaults to `3001`.

## Deploying

This is a standard Node service (`npm start`). Only this server connects to
Atlas, so in the Atlas **Network Access** list you allowlist the server's egress
IP — or `0.0.0.0/0` if your host has no fixed outbound IP — and keep the
connection string in `MONGODB_URI` (set as an env var on your host, never in the
frontend).
