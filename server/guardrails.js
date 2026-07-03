/*
 * Deterministic guardrails for /api/chat.
 *
 * Layer map (what stops what):
 *   1. Request validation  - malformed/oversized payloads never reach the model.
 *   2. Input screening     - obvious override attempts, coding requests,
 *                            profanity/abuse, and harm-facilitation patterns
 *                            get a polite localized refusal WITHOUT any
 *                            upstream call. Logged for the admin.
 *   3. The system prompt   - (server/prompt.js) scope rules the model follows
 *                            for everything the patterns can't anticipate.
 *   4. Output screening    - if a reply contains code anyway, it is replaced
 *                            with the refusal. Even a successful jailbreak
 *                            can't get code back out of this endpoint.
 *
 * Honest limits: pattern lists are a net, not a wall - phrasing can evade
 * them, which is why layers 3 and 4 exist, and why everything here runs on
 * the server where it can't be edited out of the page. Extend BLOCK_PATTERNS
 * and PROFANITY as you see real traffic (the guard_log table shows attempts).
 * For production-grade profanity coverage consider the `obscenity` npm
 * package in place of the small default list.
 */

const MAX_MESSAGES = 24; // longest history accepted
const MAX_CHARS_PER_MESSAGE = 2000; // per message
const MAX_CHARS_TOTAL = 16000; // whole conversation

/* ------------------------- request validation --------------------------- */

export function validateChatRequest(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "bad_request" };

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "no_messages" };
  }
  if (messages.length > MAX_MESSAGES) return { ok: false, error: "too_many_messages" };

  let total = 0;
  for (const m of messages) {
    if (!m || typeof m !== "object") return { ok: false, error: "bad_message" };
    if (m.role !== "user" && m.role !== "assistant") {
      return { ok: false, error: "bad_role" };
    }
    if (typeof m.content !== "string" || !m.content.trim()) {
      return { ok: false, error: "bad_content" };
    }
    if (m.content.length > MAX_CHARS_PER_MESSAGE) {
      return { ok: false, error: "message_too_long" };
    }
    total += m.content.length;
  }
  if (total > MAX_CHARS_TOTAL) return { ok: false, error: "conversation_too_long" };
  if (messages[messages.length - 1].role !== "user") {
    return { ok: false, error: "last_not_user" };
  }
  return { ok: true };
}

/* --------------------------- input screening ---------------------------- */

/*
 * Patterns that trigger a refusal before any upstream call. Grouped by
 * reason so the guard_log tells you what people are attempting.
 *
 * Deliberately NOT screened: emotional distress, grief, or self-harm
 * language. Those must reach the model, whose rules say to respond with
 * care and point toward real help - a canned block there would be cruel.
 */
const BLOCK_PATTERNS = [
  // Attempts to override or extract the instructions
  { reason: "override", re: /\b(ignore|disregard|forget|bypass|override)\b[\s\S]{0,40}\b(instructions?|rules?|prompt|guidelines?|above|previous|prior)\b/i },
  { reason: "override", re: /\b(system\s*prompt|developer\s*(mode|message)|jailbreak|jail\s*break|\bDAN\b)\b/i },
  { reason: "override", re: /\byou\s+are\s+(now|no\s+longer)\b/i },
  { reason: "override", re: /\bnew\s+(instructions?|persona|rules?|system)\b/i },
  { reason: "override", re: /\b(reveal|show|print|repeat|output|translate|summari[sz]e)\b[\s\S]{0,40}\b(your\s+)?(instructions?|system\s*prompt|rules?)\b/i },
  { reason: "override", re: /\b(pretend|roleplay|role-play|act)\b[\s\S]{0,30}\b(no\s+(rules|restrictions|limits)|unrestricted|uncensored|without\s+(rules|restrictions|filters))\b/i },

  // Coding / technical-task requests (rule 13 territory)
  { reason: "coding", re: /```/ },
  { reason: "coding", re: /\b(write|generate|create|fix|debug|refactor|review|explain)\b[\s\S]{0,40}\b(code|script|program|function|regex|query|api|algorithm)\b/i },
  { reason: "coding", re: /\b(python|javascript|typescript|java(?!\s*veda)|c\+\+|c#|golang|rust|sql|html|css|bash|shell|powershell)\b[\s\S]{0,50}\b(code|script|function|program|snippet|write|error|bug|fix)\b/i },
  { reason: "coding", re: /\b(stack\s*trace|segfault|compile[rs]?\s+error|npm\s+install|pip\s+install|git\s+(commit|push|merge))\b/i },

  // Abuse / profanity directed through or at the guide
  { reason: "profanity", re: /\b(fuck(er|ing|ed)?|motherfucker|shit(ty|head)?|bitch(es)?|asshole|cunt|dickhead|bastard|slut|whore)\b/i },

  // Blatant harm-facilitation asks (the model would refuse too; cheaper to stop here)
  { reason: "harm", re: /\bhow\s+to\s+(make|build|get|buy)\b[\s\S]{0,30}\b(bomb|explosive|weapon|gun|poison|drugs?)\b/i },
  { reason: "harm", re: /\bhow\s+to\s+(hack|break\s+into|steal|stalk|dox+)\b/i },
  { reason: "harm", re: /\b(kill|hurt|attack|harm)\b[\s\S]{0,20}\b(him|her|them|someone|my\s+\w+)\b/i },
];

export function screenInput(messages) {
  // Screen every client-supplied message, not just the last one - the whole
  // history comes from the browser, so an attacker could bury instructions
  // in an earlier turn or a fake "assistant" turn.
  for (const m of messages) {
    for (const p of BLOCK_PATTERNS) {
      if (p.re.test(m.content)) return { blocked: true, reason: p.reason };
    }
  }
  return { blocked: false };
}

/* --------------------------- output screening --------------------------- */

/*
 * Backstop: if a model reply contains code anyway (fenced blocks, or several
 * strongly code-shaped lines), the route replaces it with the refusal.
 */
export function looksLikeCode(text) {
  if (/```/.test(text)) return true;
  const lines = text.split("\n");
  let codey = 0;
  for (const l of lines) {
    if (/^\s*(import\s+\w|from\s+\w+\s+import|def\s+\w+\s*\(|function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|class\s+\w+|#include|SELECT\s+.+\s+FROM|<\/?[a-z]+[^>]*>)/i.test(l)) {
      codey++;
    }
  }
  return codey >= 2;
}

/* ------------------------- localized refusals --------------------------- */

const REFUSALS = {
  offtopic: {
    en: "I stay with one subject: real life, read through the Vedic texts. I can't help with that - but if something in your work, relationships, or mind brought you here, I'm listening.",
    hi: "मैं एक ही विषय के साथ रहता हूँ: वास्तविक जीवन, वैदिक ग्रंथों की दृष्टि से। उसमें मैं सहायता नहीं कर सकता — पर यदि आपके कार्य, संबंधों या मन की कोई बात आपको यहाँ लाई है, तो मैं सुन रहा हूँ।",
    te: "నేను ఒకే విషయంతో ఉంటాను: వేద గ్రంథాల వెలుగులో నిజ జీవితం. అందులో నేను సహాయం చేయలేను — కానీ మీ పని, బంధాలు లేదా మనసులోని ఏదైనా మిమ్మల్ని ఇక్కడికి తెచ్చి ఉంటే, నేను వింటున్నాను.",
    zh: "我只谈一个主题：以吠陀典籍观照真实人生。那件事我无法帮忙——但如果是工作、关系或内心的某些事把你带到这里，我在听。",
  },
  conduct: {
    en: "I won't take part in that kind of exchange. If something real is weighing on you, ask it plainly and I'll meet you there.",
    hi: "उस प्रकार के संवाद में मैं भाग नहीं लूँगा। यदि कोई वास्तविक बात आपको भारी लग रही है, तो सीधे पूछिए — मैं वहीं मिलूँगा।",
    te: "అటువంటి సంభాషణలో నేను పాల్గొనను. నిజంగా ఏదైనా మీ మనసును బరువెక్కిస్తుంటే, నేరుగా అడగండి — అక్కడే కలుస్తాను.",
    zh: "那样的交流我不会参与。若真有事压在你心头，请直接问，我会在那里回应你。",
  },
};

export function refusalFor(reason, lang) {
  const bucket = reason === "profanity" || reason === "harm" ? "conduct" : "offtopic";
  const msgs = REFUSALS[bucket];
  return msgs[lang] || msgs.en;
}

/* ------------------------------- logging --------------------------------- */

let guardLogReady = false;

export function logBlocked(db, userId, reason, stage) {
  try {
    if (!guardLogReady) {
      db.prepare(
        `CREATE TABLE IF NOT EXISTS guard_log (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           user_id INTEGER,
           reason TEXT,
           stage TEXT,
           created_at INTEGER
         )`
      ).run();
      guardLogReady = true;
    }
    db.prepare(
      "INSERT INTO guard_log (user_id, reason, stage, created_at) VALUES (?, ?, ?, ?)"
    ).run(userId ?? null, reason, stage, Date.now());
  } catch (e) {
    /* logging must never take the endpoint down */
  }
}
