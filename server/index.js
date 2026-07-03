import express from "express";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initSchema } from "./db.js";
import {
  registerOptions,
  registerVerify,
  authOptions,
  authVerify,
  me,
  logout,
} from "./auth.js";
import { chat, adminListUsers, adminSetStatus } from "./routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.warn(
    "WARNING: SESSION_SECRET is not set. Set a long random value in Render env vars."
  );
}

initSchema();

const app = express();
app.set("trust proxy", 1); // Render terminates TLS in front of the app
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(SESSION_SECRET || "dev-insecure-secret"));

// --- auth ---
app.post("/api/auth/register/options", registerOptions);
app.post("/api/auth/register/verify", registerVerify);
app.post("/api/auth/login/options", authOptions);
app.post("/api/auth/login/verify", authVerify);
app.get("/api/auth/me", me);
app.post("/api/auth/logout", logout);

// --- gated proxy ---
app.post("/api/chat", chat);

// --- admin ---
app.get("/api/admin/users", adminListUsers);
app.post("/api/admin/set-status", adminSetStatus);

// --- static frontend (the built Vite app) ---
const publicDir = join(__dirname, "..", "public");
app.use(express.static(publicDir));
// SPA fallback: send index.html for any non-API route.
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(join(publicDir, "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Sanatana server listening on :${PORT}`);
});
