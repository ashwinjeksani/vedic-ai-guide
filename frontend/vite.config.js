/*
 * Dev server config.
 *
 * All /api/* calls are proxied to the Express server (../server), which owns
 * auth (passkeys), the guest daily limit, the guardrails, and the model proxy.
 * This keeps local dev behaviour identical to production and lets passkeys work
 * (they need a real backend + a matching ORIGIN).
 *
 * Run both together with ./start.sh (or `npm run dev` after starting the
 * server yourself on API_PORT). The server port defaults to 8787.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = `http://localhost:${process.env.API_PORT || 8787}`;

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: false,
      },
    },
  },
  plugins: [react()],
});
