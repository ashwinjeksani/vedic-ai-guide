/*
 * Drop this into your Vite frontend (e.g. src/auth.js) and
 * `npm install @simplewebauthn/browser` in the frontend project.
 *
 * It gives you: register(username), login(username), me(), logout().
 * All calls hit the backend routes defined in server/index.js.
 */
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

export async function register(username) {
  const options = await post("/api/auth/register/options", { username });
  const attResp = await startRegistration({ optionsJSON: options });
  return post("/api/auth/register/verify", { username, attResp });
}

export async function login(username) {
  const options = await post("/api/auth/login/options", { username });
  const authResp = await startAuthentication({ optionsJSON: options });
  return post("/api/auth/login/verify", { username, authResp });
}

export async function me() {
  const res = await fetch("/api/auth/me", { credentials: "same-origin" });
  return (await res.json()).user;
}

export async function logout() {
  return post("/api/auth/logout");
}

/* Admin helpers (only work when logged in as the admin account). */
export async function adminListUsers() {
  const res = await fetch("/api/admin/users", { credentials: "same-origin" });
  if (!res.ok) throw new Error("admin_only");
  return (await res.json()).users;
}
export async function adminSetStatus(userId, status) {
  return post("/api/admin/set-status", { userId, status });
}
