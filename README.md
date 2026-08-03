# Sanātana — A Vedic Guide

A single-page React app: an interactive library of the Vedic corpus (the four Vedas,
principal Upaniṣads, and Smṛti texts) with a three.js ambient background and an
"ask the guide" chat powered by Claude.

The app UI lives in [`frontend/vedic-guide.jsx`](./frontend/vedic-guide.jsx). A small
[Vite](https://vitejs.dev) harness compiles it for local dev, and an Express
[`server/`](./server) hosts it in production with passkey auth and an allowlist.

## Repo layout

```
├── frontend/       # the Vite app (index.html, src/, vite.config.js, vedic-guide.jsx)
├── server/         # Express backend: WebAuthn auth, allowlist-gated /api/chat proxy
├── render.yaml     # one-click Render Blueprint (builds frontend, serves via server)
└── DEPLOY.md       # full deployment guide (Render + passkeys + custom domain)
```

## Requirements

- Node.js 18+ (tested on Node 25)
- An API key for the chat feature — [Anthropic](https://console.anthropic.com/settings/keys)
  (default) or [OpenAI](https://platform.openai.com/api-keys), or point it at your own
  OpenAI-compatible endpoint (LM Studio, Ollama, ...) instead — see
  [How the chat works](#how-the-chat-works). The library UI renders without any key.

## Local development

```bash
cd frontend
cp .env.example .env      # then edit .env and paste your ANTHROPIC_API_KEY
npm install
npm run dev               # http://localhost:5173
```

Or use the background helpers (from `frontend/`):

```bash
./start.sh    # installs deps if needed, launches the dev server in the background
./stop.sh     # stops it
```

In local dev, a middleware in `frontend/vite.config.js` reads `ANTHROPIC_API_KEY`
from `frontend/.env`, attaches it server-side, and proxies `/api/chat` to Anthropic.
The key never reaches the browser. The chat currently defaults to Claude
(`claude-sonnet-5`, set in `vedic-guide.jsx`).

## Production deployment

The `server/` backend adds passkey (WebAuthn) sign-in, a server-enforced free-question
limit, and an admin allowlist, and serves the built frontend as static files. The
gated `/api/chat` proxy lives in `server/routes.js`.

Deploy to [Render](https://render.com) with the included `render.yaml`. See
[`DEPLOY.md`](./DEPLOY.md) for the complete walkthrough — env vars, first-admin setup,
and attaching a custom domain (important for passkeys).

## How the chat works

The browser never calls an AI provider directly (CORS, and keys must stay secret).
The frontend always posts to `/api/chat`, which `server/routes.js` serves — locally,
Vite just proxies `/api/*` to that same Express server (see `vite.config.js`), so dev
and production behave identically. The server attaches the credentials and forwards
the request; keys never reach the browser.

Three providers are supported, chosen per-request (`anthropic` default, or `openai`)
or forced server-side for every request via `CHAT_PROVIDER`:

- **Anthropic** / **OpenAI** — the usual hosted APIs (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`).
- **custom** — any OpenAI-compatible endpoint, e.g. a local [LM Studio](https://lmstudio.ai)
  server, Ollama, or vLLM. Set `CUSTOM_AI_URL` (just the host is fine — `/v1` is added
  automatically) and optionally `CUSTOM_AI_KEY` / `CUSTOM_AI_MODEL` in `.env` (local) or
  the Render dashboard (production). Never commit real values — see `.env.example`.
