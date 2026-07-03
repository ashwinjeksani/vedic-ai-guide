# Sanātana — A Vedic Guide

A single-page React app: an interactive library of the Vedic corpus (the four Vedas,
principal Upaniṣads, and Smṛti texts) with a three.js ambient background and an
"ask the guide" chat powered by Claude.

The whole UI lives in [`vedic-guide.jsx`](./vedic-guide.jsx). The surrounding files
(`index.html`, `src/main.jsx`, `vite.config.js`) are a minimal [Vite](https://vitejs.dev)
harness that compiles and serves it.

## Requirements

- Node.js 18+ (tested on Node 25)
- An API key for the chat feature — either
  [Anthropic](https://console.anthropic.com/settings/keys) or
  [OpenAI](https://platform.openai.com/api-keys) (or both). The library UI renders
  without any key.

## Setup

```bash
# 1. Add your API key (chat feature)
cp .env.example .env
# then edit .env and paste your key

# 2. Install dependencies (start.sh does this automatically on first run)
npm install
```

## Running

### With the helper scripts (background)

```bash
./start.sh    # installs deps if needed, launches the dev server in the background,
              # and prints the URL (http://localhost:5173)
./stop.sh     # stops the background server
```

- Logs: `.dev-server.log`
- Process id: `.dev-server.pid`

### With npm (foreground)

```bash
npm run dev       # start the dev server (Ctrl+C to stop)
npm run build     # production build into dist/
npm run preview   # preview the production build
```

## Choosing a provider

The chat supports both **Claude (Anthropic)** and **OpenAI**. A toggle in the chat
composer ("Guide's voice") switches between them at runtime — set whichever API
key(s) you have in `.env`. Default models: `claude-sonnet-5` and `gpt-4o` (change
them in `vedic-guide.jsx`).

## How the chat works

The browser cannot call these APIs directly (CORS, and the keys must stay secret).
Instead:

1. The frontend posts to `/api/chat` with a `provider` field (see `vedic-guide.jsx`).
2. A small middleware in `vite.config.js` reads the matching key
   (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) from `.env`, attaches it server-side,
   and forwards the request to the right API.
3. For OpenAI, the request and response are translated to/from Anthropic's message
   shape so the frontend parsing stays identical.

Keys never leave the server. If the needed key is missing, the chat returns a clear
error and the rest of the app still works.

> Note: the proxy runs inside the Vite **dev** server. For a real deployment you'd
> host an equivalent endpoint (serverless function, small Node server, etc.) since
> `vite preview` and static `dist/` output do not include it.

## Project layout

| File | Purpose |
|------|---------|
| `vedic-guide.jsx` | The entire app — library data, chat UI, three.js background |
| `src/main.jsx` | Mounts the component into the page |
| `index.html` | HTML entry point |
| `vite.config.js` | Vite config + the `/api/chat` Anthropic proxy |
| `start.sh` / `stop.sh` | Background start/stop helpers |
| `.env.example` | Template for your API key |
