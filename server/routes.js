import db from "./db.js";
import { currentUser } from "./auth.js";

const FREE_LIMIT = parseInt(process.env.FREE_LIMIT || "1", 10);

/* --------------------------- the gated proxy ----------------------------- */
/*
 * Access rules, enforced here on the SERVER so they can't be bypassed from
 * the browser:
 *   - Not logged in            -> 401 (must register a passkey first)
 *   - Logged in + allowlisted  -> unlimited
 *   - Logged in + pending      -> up to FREE_LIMIT questions, then 403
 */
export async function chat(req, res) {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "login_required", message: "Register a passkey to ask the guide." });
  }

  if (user.status !== "allowlisted") {
    const used = db
      .prepare("SELECT COUNT(*) AS n FROM request_log WHERE user_id = ?")
      .get(user.id).n;
    if (used >= FREE_LIMIT) {
      return res.status(403).json({
        error: "limit_reached",
        message: "You've used your free question. Ask the admin for full access.",
        canRequestAccess: true,
      });
    }
  }

  const provider = req.body?.provider === "openai" ? "openai" : "anthropic";
  let upstream, payloadOut, headers;

  try {
    if (provider === "anthropic") {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return res.status(500).json({ error: "Anthropic key not configured." });
      upstream = "https://api.anthropic.com/v1/messages";
      headers = {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      };
      payloadOut = {
        model: req.body?.model || "claude-sonnet-5",
        max_tokens: req.body?.max_tokens || 1000,
        system: req.body?.system,
        messages: req.body?.messages || [],
      };
    } else {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return res.status(500).json({ error: "OpenAI key not configured." });
      upstream = "https://api.openai.com/v1/chat/completions";
      headers = {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      };
      // Translate Anthropic-shaped request -> OpenAI, so the frontend stays identical.
      const msgs = [];
      if (req.body?.system) msgs.push({ role: "system", content: req.body.system });
      for (const m of req.body?.messages || []) {
        msgs.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
      }
      payloadOut = {
        model: req.body?.model || "gpt-4o",
        max_tokens: req.body?.max_tokens || 1000,
        messages: msgs,
      };
    }

    const upstreamRes = await fetch(upstream, {
      method: "POST",
      headers,
      body: JSON.stringify(payloadOut),
    });
    const data = await upstreamRes.json();

    if (!upstreamRes.ok) {
      return res.status(502).json({ error: "upstream_error", detail: data });
    }

    // Normalize both providers to Anthropic's { content: [{type:'text', text}] } shape.
    let normalized;
    if (provider === "anthropic") {
      normalized = data;
    } else {
      const text = data?.choices?.[0]?.message?.content || "";
      normalized = { content: [{ type: "text", text }] };
    }

    // Only count the request once it actually succeeded.
    db.prepare("INSERT INTO request_log (user_id, created_at) VALUES (?, ?)").run(
      user.id,
      Date.now()
    );

    res.json(normalized);
  } catch (e) {
    res.status(502).json({ error: "The guide could not be reached." });
  }
}

/* ------------------------------- admin ----------------------------------- */

function requireAdmin(req, res) {
  const user = currentUser(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "admin_only" });
    return null;
  }
  return user;
}

export function adminListUsers(req, res) {
  if (!requireAdmin(req, res)) return;
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.status, u.role, u.created_at,
              (SELECT COUNT(*) FROM request_log r WHERE r.user_id = u.id) AS questions_used
       FROM users u ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ users: rows });
}

export function adminSetStatus(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const { userId, status } = req.body || {};
  if (!["pending", "allowlisted"].includes(status)) {
    return res.status(400).json({ error: "bad_status" });
  }
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!target) return res.status(404).json({ error: "no_such_user" });
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, userId);
  res.json({ ok: true });
}
