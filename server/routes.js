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
  // "custom" = any OpenAI-compatible endpoint (LM Studio, Ollama, vLLM...).
  // No universal default model — CUSTOM_AI_MODEL names it explicitly, or it's
  // auto-discovered from the endpoint's /models list at call time (below).
  custom: process.env.CUSTOM_AI_MODEL || null,
};

// Which providers can serve /api/chat. Actual credentials are read from
// process.env at call time, never stored here or logged.
const ALLOWED_PROVIDERS = ["anthropic", "openai", "custom"];

// Operator override: when set, ALWAYS use this provider regardless of what
// the client requests (e.g. CHAT_PROVIDER=custom to route every chat through
// a self-hosted model). Unset -> falls back to the client-requested provider
// (existing behavior), defaulting to anthropic.
const FORCED_PROVIDER = ALLOWED_PROVIDERS.includes(process.env.CHAT_PROVIDER)
  ? process.env.CHAT_PROVIDER
  : null;

// Any OpenAI-compatible endpoint, e.g. http://127.0.0.1:1234 (LM Studio's
// local server) or a tunneled/reverse-proxied host. Intentionally has NO
// hardcoded default — a private inference endpoint belongs in .env / the
// host's environment, never in source. People routinely paste just the host,
// so normaliseBaseUrl appends /v1 when the URL has no path of its own.
function normaliseBaseUrl(raw) {
  const base = String(raw || "").trim().replace(/\/+$/, "");
  if (!base) return base;
  try {
    const u = new URL(base);
    if (u.pathname === "" || u.pathname === "/") return base + "/v1";
  } catch {
    /* not absolute — leave as given */
  }
  return base;
}
const CUSTOM_AI_URL = normaliseBaseUrl(process.env.CUSTOM_AI_URL);
// Optional: most local servers (LM Studio, Ollama) don't require auth. Set
// this only if yours sits behind one (e.g. a reverse proxy with a token).
const CUSTOM_AI_KEY = process.env.CUSTOM_AI_KEY || "";

// When CUSTOM_AI_MODEL isn't set, ask the endpoint what it serves and use the
// first chat-capable model. Cached per URL for the server's lifetime so this
// costs at most one extra request.
const discoveredCustomModel = { url: null, model: null };
async function resolveCustomModel() {
  if (MODELS.custom) return MODELS.custom;
  if (discoveredCustomModel.url === CUSTOM_AI_URL && discoveredCustomModel.model) {
    return discoveredCustomModel.model;
  }
  const res = await fetch(`${CUSTOM_AI_URL}/models`, {
    headers: CUSTOM_AI_KEY ? { authorization: `Bearer ${CUSTOM_AI_KEY}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Could not list models at ${CUSTOM_AI_URL}/models (HTTP ${res.status}) — set CUSTOM_AI_MODEL`);
  }
  const ids = ((await res.json()).data || []).map((m) => m.id).filter(Boolean);
  const chat = ids.find((id) => !/embed|rerank|whisper|tts|moderation/i.test(id));
  if (!chat) throw new Error("That endpoint lists no chat model — set CUSTOM_AI_MODEL");
  discoveredCustomModel.url = CUSTOM_AI_URL;
  discoveredCustomModel.model = chat;
  return chat;
}
// Ceiling only — the model stops naturally (end_turn) well before this for a
// guide whose answers target ~120-220 words. Set high enough that a reply is
// never cut off mid-sentence. Kept under ~16k so non-streaming stays safe from
// HTTP timeouts (raw fetch, no SDK guard). Cost tracks actual output, not the cap.
const MAX_TOKENS = 8192;

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

// Short, human labels for the model picker. Not sensitive — just which
// providers are usable, never the credentials themselves.
const PROVIDER_LABELS = {
  anthropic: "Claude",
  openai: "GPT-4o",
  custom: "Qwen3.8-27B (Free)",
};

// Only the providers that actually have credentials/config present. This is
// what the frontend's model picker renders — never an option that would just
// fail with a 500 when chosen.
function configuredProviders() {
  const out = [];
  if (process.env.ANTHROPIC_API_KEY) out.push({ id: "anthropic", label: PROVIDER_LABELS.anthropic });
  // GPT-4o temporarily removed from the picker (still works if requested
  // directly — this only hides it as a choice). Re-enable by uncommenting:
  // if (process.env.OPENAI_API_KEY) out.push({ id: "openai", label: PROVIDER_LABELS.openai });
  if (CUSTOM_AI_URL) out.push({ id: "custom", label: PROVIDER_LABELS.custom });
  return out;
}

// GET /api/chat/config — public (no auth): lets the UI show a model picker
// with only the providers this deployment actually has configured. `forced`
// mirrors FORCED_PROVIDER so the frontend can hide the picker entirely when
// the operator has pinned one provider server-side (client choice is moot).
export function chatConfig(req, res) {
  res.json({ providers: configuredProviders(), forced: FORCED_PROVIDER });
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

  const requestedProvider = ALLOWED_PROVIDERS.includes(req.body?.provider)
    ? req.body.provider
    : "anthropic";
  const provider = FORCED_PROVIDER || requestedProvider;
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
  const langInstruction = LANG_REPLY_INSTRUCTION[lang] || "";
  // For OpenAI we still send a single system string.
  const system = SYSTEM_PROMPT + langInstruction;
  // For Anthropic we send content blocks so we can cache the (identical-on-every-
  // request) SYSTEM_PROMPT prefix. cache_control marks the cache breakpoint; the
  // per-language instruction sits AFTER it so it stays out of the cached prefix.
  const anthropicSystem = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ...(langInstruction ? [{ type: "text", text: langInstruction }] : []),
  ];

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
        system: anthropicSystem,
        messages,
      };
    } else {
      // openai and custom (any OpenAI-compatible endpoint) both speak the
      // Chat Completions schema — same payload shape, only the upstream URL,
      // auth, and model differ.
      let key, model;
      if (provider === "custom") {
        if (!CUSTOM_AI_URL) {
          return res
            .status(500)
            .json({ error: "Custom AI endpoint not configured (set CUSTOM_AI_URL)." });
        }
        try {
          model = await resolveCustomModel();
        } catch (e) {
          return res.status(500).json({ error: e.message });
        }
        upstream = `${CUSTOM_AI_URL}/chat/completions`;
        key = CUSTOM_AI_KEY; // optional — most local servers don't require one
      } else {
        key = process.env.OPENAI_API_KEY;
        if (!key) return res.status(500).json({ error: "OpenAI key not configured." });
        upstream = "https://api.openai.com/v1/chat/completions";
        model = MODELS.openai;
      }
      headers = {
        "content-type": "application/json",
        ...(key ? { authorization: `Bearer ${key}` } : {}),
      };
      // Translate Anthropic-shaped request -> OpenAI, so the frontend stays identical.
      const msgs = [{ role: "system", content: system }];
      for (const m of messages) {
        msgs.push({ role: m.role, content: m.content });
      }
      payloadOut = {
        model,
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

    // Verify prompt caching: cache_read > 0 means the SYSTEM_PROMPT prefix was
    // served from cache (~0.1x cost). Zero across repeated requests → a silent
    // invalidator or a prefix below the model's cacheable minimum.
    if (provider === "anthropic" && data.usage) {
      const u = data.usage;
      console.log(
        `[cache] write=${u.cache_creation_input_tokens || 0} read=${u.cache_read_input_tokens || 0} input=${u.input_tokens || 0} out=${u.output_tokens || 0} stop=${data.stop_reason}`
      );
    }

    // Normalize every provider to Anthropic's { content: [{type:'text', text}] }
    // shape. openai and custom share the OpenAI response schema.
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
