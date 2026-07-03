import { randomUUID } from "crypto";
import db from "./db.js";
import { currentUser } from "./auth.js";
import { SYSTEM_PROMPT, LANG_REPLY_INSTRUCTION, SUPPORTED_LANGS } from "./prompt.js";
import {
  validateChatRequest,
  screenInput,
  looksLikeCode,
  refusalFor,
  logBlocked,
} from "./guardrails.js";

// Anyone who isn't allowlisted (guest OR registered-but-pending) may ask up to
// GUEST_DAILY_LIMIT questions per rolling 24 hours, counted per unique subject.
const GUEST_DAILY_LIMIT = parseInt(process.env.GUEST_DAILY_LIMIT || "10", 10);
const DAY_MS = 24 * 60 * 60 * 1000;

const MODELS = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-4o",
};
const MAX_TOKENS = 1000;

// A guest is identified by a signed httpOnly cookie so the daily count sticks
// to a browser without requiring an account. Clearing cookies resets it — an
// accepted limitation for anonymous access (registering + allowlist is the
// path to unlimited).
function guestId(req, res) {
  let gid = req.signedCookies?.gid;
  if (!gid) {
    gid = "guest_" + randomUUID();
    res.cookie("gid", gid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      signed: true,
      maxAge: DAY_MS * 400,
      path: "/",
    });
  }
  return gid;
}

/* --------------------------- the gated proxy ----------------------------- */
/*
 * Access rules, enforced here on the SERVER so they can't be bypassed from
 * the browser:
 *   - Guest (not logged in)    -> up to GUEST_DAILY_LIMIT questions / 24h
 *   - Logged in + pending      -> up to GUEST_DAILY_LIMIT questions / 24h
 *   - Logged in + allowlisted  -> unlimited
 * When the daily limit is hit -> 403 limit_reached.
 *
 * Prompt-injection hardening (see guardrails.js for the full layer map):
 *   - The client can send ONLY { provider, lang, messages }. Any `system`,
 *     `model`, or `max_tokens` in the request body is ignored - the system
 *     prompt lives in prompt.js and never leaves this process.
 *   - Requests are validated and screened before any upstream call; blocked
 *     ones get a polite localized refusal, are logged to guard_log, and do
 *     not count against the free limit.
 *   - Replies that contain code are replaced with the refusal (output
 *     screening), so even a phrasing that slips past the input screen and
 *     the model's own rules cannot extract code through this endpoint.
 */
export async function chat(req, res) {
  const user = currentUser(req);

  // Identify the asker: a signed-in user, or an anonymous guest (cookie id).
  const subjectId = user ? user.id : guestId(req, res);
  const isGuest = !user;
  const allowlisted = user?.status === "allowlisted";

  // Rate-limit everyone who isn't allowlisted to GUEST_DAILY_LIMIT / 24h.
  if (!allowlisted) {
    const since = Date.now() - DAY_MS;
    const used = db
      .prepare("SELECT COUNT(*) AS n FROM request_log WHERE user_id = ? AND created_at >= ?")
      .get(subjectId, since).n;
    if (used >= GUEST_DAILY_LIMIT) {
      return res.status(403).json({
        error: "limit_reached",
        message: isGuest
          ? `You've reached today's ${GUEST_DAILY_LIMIT} free questions. Register a passkey and ask the admin for unlimited access.`
          : `You've used today's ${GUEST_DAILY_LIMIT} questions. Ask the admin for unlimited access.`,
        limit: GUEST_DAILY_LIMIT,
        isGuest,
        canRequestAccess: true,
      });
    }
  }

  const provider = req.body?.provider === "openai" ? "openai" : "anthropic";
  const lang = SUPPORTED_LANGS.includes(req.body?.lang) ? req.body.lang : "en";

  // Layer 1: shape and size.
  const valid = validateChatRequest(req.body);
  if (!valid.ok) {
    logBlocked(db, subjectId, valid.error, "validate");
    return res.status(400).json({ error: valid.error });
  }
  const messages = req.body.messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  // Layer 2: deterministic input screen. Refuse politely, in-language,
  // without spending an upstream call or a free-limit slot.
  const screened = screenInput(messages);
  if (screened.blocked) {
    logBlocked(db, subjectId, screened.reason, "input");
    return res.json({
      content: [{ type: "text", text: refusalFor(screened.reason, lang) }],
      guarded: true,
    });
  }

  // Layer 3: the server-owned prompt (+ reply-language instruction).
  const system = SYSTEM_PROMPT + (LANG_REPLY_INSTRUCTION[lang] || "");

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
        model: MODELS.anthropic,
        max_tokens: MAX_TOKENS,
        system,
        messages,
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
      const msgs = [{ role: "system", content: system }];
      for (const m of messages) {
        msgs.push({ role: m.role, content: m.content });
      }
      payloadOut = {
        model: MODELS.openai,
        max_tokens: MAX_TOKENS,
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
    let text;
    if (provider === "anthropic") {
      text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
    } else {
      text = data?.choices?.[0]?.message?.content || "";
    }

    // Layer 4: output screen - no code leaves this endpoint.
    if (looksLikeCode(text)) {
      logBlocked(db, subjectId, "coding", "output");
      return res.json({
        content: [{ type: "text", text: refusalFor("coding", lang) }],
        guarded: true,
      });
    }

    // Only count the request once it actually succeeded.
    db.prepare("INSERT INTO request_log (user_id, created_at) VALUES (?, ?)").run(
      subjectId,
      Date.now()
    );

    res.json({ content: [{ type: "text", text }] });
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

/* --------------------------- admin: guard log ---------------------------- */
/*
 * Lets the admin see blocked attempts (who, what kind, when) - visibility is
 * part of the defense. Returns the latest 200 entries.
 */
export function adminGuardLog(req, res) {
  if (!requireAdmin(req, res)) return;
  let rows = [];
  try {
    rows = db
      .prepare(
        `SELECT g.id, g.user_id, u.username, g.reason, g.stage, g.created_at
         FROM guard_log g LEFT JOIN users u ON u.id = g.user_id
         ORDER BY g.created_at DESC LIMIT 200`
      )
      .all();
  } catch (e) {
    /* table may not exist until the first block */
  }
  res.json({ entries: rows });
}
