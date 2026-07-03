import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev-server middleware that proxies chat requests to either the Anthropic or the
// OpenAI API. API keys live server-side (in .env) and never reach the browser.
// Whichever provider is chosen, the response is normalized to Anthropic's shape
// ({ content: [{ type: "text", text }] }) so the frontend parsing stays identical.
function llmProxy(env) {
  return {
    name: "llm-proxy",
    configureServer(server) {
      server.middlewares.use("/api/chat", async (req, res) => {
        const json = (status, obj) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(obj));
        };

        if (req.method !== "POST") return json(405, { error: "Method Not Allowed" });

        // Collect and parse the JSON body.
        let raw = "";
        for await (const chunk of req) raw += chunk;
        let payload;
        try {
          payload = JSON.parse(raw || "{}");
        } catch {
          return json(400, { error: "Invalid JSON body." });
        }

        const provider = payload.provider === "openai" ? "openai" : "anthropic";
        const { model, max_tokens = 1000, system, messages = [] } = payload;

        try {
          if (provider === "openai") {
            const key = env.OPENAI_API_KEY;
            if (!key)
              return json(500, {
                error: "OPENAI_API_KEY is not set. Add it to .env to use OpenAI.",
              });

            const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
              },
              body: JSON.stringify({
                model: model || "gpt-4o",
                max_tokens,
                messages: system
                  ? [{ role: "system", content: system }, ...messages]
                  : messages,
              }),
            });
            const data = await upstream.json();
            if (!upstream.ok)
              return json(upstream.status, { error: data?.error?.message || "OpenAI error" });

            // Normalize to Anthropic's response shape.
            const text = data?.choices?.[0]?.message?.content || "";
            return json(200, { content: [{ type: "text", text }] });
          }

          // Anthropic (default).
          const key = env.ANTHROPIC_API_KEY;
          if (!key)
            return json(500, {
              error: "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.",
            });

          const upstream = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": key,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({ model: model || "claude-sonnet-5", max_tokens, system, messages }),
          });
          const text = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader("Content-Type", "application/json");
          res.end(text);
        } catch (e) {
          return json(502, { error: "Upstream request failed: " + e.message });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load every var in .env (empty prefix = no VITE_ requirement), server-side only.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), llmProxy(env)],
    server: { port: 5173, open: true },
  };
});
