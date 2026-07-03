import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import db, { maybePromoteAdmin } from "./db.js";
import { randomUUID } from "crypto";

/*
 * Config comes from env so the same code works locally and on Render.
 *   RP_ID    — your domain, e.g. "sanatana.example.com" (NO scheme, no port). Use "localhost" locally.
 *   ORIGIN   — full origin, e.g. "https://sanatana.example.com" (or "http://localhost:10000" locally).
 *   RP_NAME  — human-readable name shown in the passkey prompt.
 */
const rpID = process.env.RP_ID || "localhost";
const origin = process.env.ORIGIN || "http://localhost:10000";
const rpName = process.env.RP_NAME || "Sanatana";

const b64 = {
  toBuffer: (s) => Buffer.from(s, "base64url"),
  fromBuffer: (b) => Buffer.from(b).toString("base64url"),
};

function getUserByName(username) {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username);
}
function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}
function getUserCredentials(userId) {
  return db.prepare("SELECT * FROM credentials WHERE user_id = ?").all(userId);
}

/* -------------------------------- REGISTER ------------------------------- */

export async function registerOptions(req, res) {
  const username = String(req.body?.username || "").trim().toLowerCase();
  if (!username || username.length > 64) {
    return res.status(400).json({ error: "A username (max 64 chars) is required." });
  }

  let user = getUserByName(username);
  if (user) {
    // Allow adding another passkey to an existing account only if it has none yet.
    // (Keeps this simple: one passkey per account for the common case.)
    const creds = getUserCredentials(user.id);
    if (creds.length > 0) {
      return res.status(409).json({ error: "That name is taken. Pick another." });
    }
  } else {
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users (id, username, status, role, created_at) VALUES (?, ?, 'pending', 'user', ?)"
    ).run(id, username, Date.now());
    user = getUserById(id);
  }

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(user.id),
    userName: username,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  db.prepare("UPDATE users SET current_challenge = ? WHERE id = ?").run(
    options.challenge,
    user.id
  );
  res.json(options);
}

export async function registerVerify(req, res) {
  const username = String(req.body?.username || "").trim().toLowerCase();
  const user = getUserByName(username);
  if (!user || !user.current_challenge) {
    return res.status(400).json({ error: "No pending registration. Start again." });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: req.body.attResp,
      expectedChallenge: user.current_challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (e) {
    return res.status(400).json({ error: "Registration could not be verified." });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: "Registration failed verification." });
  }

  const { credential } = verification.registrationInfo;
  db.prepare(
    "INSERT INTO credentials (id, user_id, public_key, counter, transports, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    credential.id,
    user.id,
    Buffer.from(credential.publicKey),
    credential.counter,
    JSON.stringify(credential.transports || []),
    Date.now()
  );
  db.prepare("UPDATE users SET current_challenge = NULL WHERE id = ?").run(user.id);

  const promoted = maybePromoteAdmin(user.id, username);

  startSession(res, user.id);
  const fresh = getUserById(user.id);
  res.json({
    ok: true,
    user: publicUser(fresh),
    note: promoted
      ? "You are the admin."
      : "Registered. You have limited access until an admin approves you.",
  });
}

/* ------------------------------ AUTHENTICATE ----------------------------- */

export async function authOptions(req, res) {
  const username = String(req.body?.username || "").trim().toLowerCase();
  const user = username ? getUserByName(username) : null;

  const allowCredentials =
    user && getUserCredentials(user.id).map((c) => ({
      id: c.id,
      transports: safeJSON(c.transports),
    }));

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: allowCredentials || undefined,
  });

  // Stash the challenge. If we know the user, store on them; otherwise use a short-lived cookie.
  if (user) {
    db.prepare("UPDATE users SET current_challenge = ? WHERE id = ?").run(
      options.challenge,
      user.id
    );
  } else {
    res.cookie?.("auth_challenge", options.challenge, { httpOnly: true, sameSite: "lax" });
  }
  res.json(options);
}

export async function authVerify(req, res) {
  const credID = req.body?.authResp?.id;
  if (!credID) return res.status(400).json({ error: "Malformed response." });

  const cred = db.prepare("SELECT * FROM credentials WHERE id = ?").get(credID);
  if (!cred) return res.status(400).json({ error: "Unknown passkey." });
  const user = getUserById(cred.user_id);
  if (!user) return res.status(400).json({ error: "Unknown user." });

  const expectedChallenge = user.current_challenge;
  if (!expectedChallenge) {
    return res.status(400).json({ error: "No pending login. Start again." });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: req.body.authResp,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.id,
        publicKey: cred.public_key,
        counter: cred.counter,
        transports: safeJSON(cred.transports),
      },
      requireUserVerification: false,
    });
  } catch (e) {
    return res.status(400).json({ error: "Login could not be verified." });
  }

  if (!verification.verified) {
    return res.status(400).json({ error: "Login failed verification." });
  }

  db.prepare("UPDATE credentials SET counter = ? WHERE id = ?").run(
    verification.authenticationInfo.newCounter,
    cred.id
  );
  db.prepare("UPDATE users SET current_challenge = NULL WHERE id = ?").run(user.id);

  startSession(res, user.id);
  res.json({ ok: true, user: publicUser(user) });
}

/* -------------------------------- SESSIONS ------------------------------- */
/*
 * Minimal signed-cookie sessions: a random token stored server-side would be
 * ideal, but to keep the dependency count low we store the userId in an
 * httpOnly cookie signed with SESSION_SECRET via express's cookie-signing.
 * For a higher-security setup, swap this for a server-side session table.
 */

export function startSession(res, userId) {
  res.cookie("uid", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    signed: true,
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export function endSession(res) {
  res.clearCookie("uid", { path: "/" });
}

export function currentUser(req) {
  const uid = req.signedCookies?.uid;
  if (!uid) return null;
  return getUserById(uid) || null;
}

export function logout(req, res) {
  endSession(res);
  res.json({ ok: true });
}

export function me(req, res) {
  const user = currentUser(req);
  res.json({ user: user ? publicUser(user) : null });
}

/* -------------------------------- helpers -------------------------------- */

function publicUser(u) {
  return { id: u.id, username: u.username, status: u.status, role: u.role };
}
function safeJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}
