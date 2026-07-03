/*
 * Drop-in replacement for frontend/vite.config.js — DEV ONLY.
 *
 * The production /api/chat lives in server/routes.js (with auth + limits).
 * This middleware exists so `npm run dev` works without the Node server,
 * and it enforces the SAME guardrails by importing the same modules:
 *   - the system prompt is held here, never accepted from the browser
 *   - requests are validated and screened before any upstream call
 *   - replies containing code are replaced with the refusal
 *
 * Expected repo layout (see DEPLOY.md):
 *   your-repo/
 *   ├── frontend/   <- this file goes here as vite.config.js
 *   └── server/     <- prompt.js + guardrails.js imported from there
 * If your Vite app still lives at the repo root next to server/, change the
 * two import paths from "../server/..." to "./server/...".
 */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { SYSTEM_PROMPT, LANG_REPLY_INSTRUCTION, SUPPORTED_LANGS } from "../server/prompt.js";
import {
  validateChatRequest,
  screenInput,
  looksLikeCode,
  refusalFor,
} from "../server/guardrails.js";

const MODELS = { anthropic: "claude-sonnet-5", openai: "gpt-4o" };
const MAX_TOKENS = 1000;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1e6) reject(new Error("body_too_large"));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(obj));
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: { port: 5173, open: true },
    plugins: [
      react(),
      {
        name: "sanatana-chat-proxy",
        configureServer(server) {
          server.middlewares.use("/api/chat", async (req, res) => {
            if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });

            let body;
            try {
              body = await readJsonBody(req);
            } catch (e) {
              return sendJson(res, 400, { error: "bad_json" });
            }

            const provider = body?.provider === "openai" ? "openai" : "anthropic";
            const lang = SUPPORTED_LANGS.includes(body?.lang) ? body.lang : "en";

            // Guardrail layer 1: shape and size.
            const valid = validateChatRequest(body);
            if (!valid.ok) return sendJson(res, 400, { error: valid.error });

            const messages = body.messages.map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            }));

            // Guardrail layer 2: deterministic input screen.
            const screened = screenInput(messages);
            if (screened.blocked) {
              return sendJson(res, 200, {
                content: [{ type: "text", text: refusalFor(screened.reason, lang) }],
                guarded: true,
              });
            }

            // Guardrail layer 3: server-owned prompt. Client `system` is ignored.
            const system = SYSTEM_PROMPT + (LANG_REPLY_INSTRUCTION[lang] || "");

            try {
              let upstream, headers, payloadOut;
              if (provider === "anthropic") {
                const key = env.ANTHROPIC_API_KEY;
                if (!key) return sendJson(res, 500, { error: "Anthropic key not configured. Add ANTHROPIC_API_KEY to .env" });
                upstream = "https://api.anthropic.com/v1/messages";
                headers = {
                  "content-type": "application/json",
                  "x-api-key": key,
                  "anthropic-version": "2023-06-01",
                };
                payloadOut = { model: MODELS.anthropic, max_tokens: MAX_TOKENS, system, messages };
              } else {
                const key = env.OPENAI_API_KEY;
                if (!key) return sendJson(res, 500, { error: "OpenAI key not configured. Add OPENAI_API_KEY to .env" });
                upstream = "https://api.openai.com/v1/chat/completions";
                headers = { "content-type": "application/json", authorization: `Bearer ${key}` };
                const msgs = [{ role: "system", content: system }];
                for (const m of messages) msgs.push({ role: m.role, content: m.content });
                payloadOut = { model: MODELS.openai, max_tokens: MAX_TOKENS, messages: msgs };
              }

              const upstreamRes = await fetch(upstream, {
                method: "POST",
                headers,
                body: JSON.stringify(payloadOut),
              });
              const data = await upstreamRes.json();
              if (!upstreamRes.ok) return sendJson(res, 502, { error: "upstream_error", detail: data });

              let text;
              if (provider === "anthropic") {
                text = (data.content || [])
                  .filter((b) => b.type === "text")
                  .map((b) => b.text)
                  .join("\n");
              } else {
                text = data?.choices?.[0]?.message?.content || "";
              }

              // Guardrail layer 4: no code leaves this endpoint.
              if (looksLikeCode(text)) {
                return sendJson(res, 200, {
                  content: [{ type: "text", text: refusalFor("coding", lang) }],
                  guarded: true,
                });
              }

              sendJson(res, 200, { content: [{ type: "text", text }] });
            } catch (e) {
              sendJson(res, 502, { error: "The guide could not be reached." });
            }
          });
        },
      },
    ],
  };
});
