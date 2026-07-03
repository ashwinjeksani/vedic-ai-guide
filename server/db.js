import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// On Render, mount a persistent disk at /var/data and set DB_PATH=/var/data/sanatana.db
// so the database survives redeploys. Locally it falls back to a file beside this script.
const DB_PATH = process.env.DB_PATH || join(__dirname, "sanatana.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'allowlisted'
      role          TEXT NOT NULL DEFAULT 'user',      -- 'user' | 'admin'
      current_challenge TEXT,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id            TEXT PRIMARY KEY,                  -- base64url credential ID
      user_id       TEXT NOT NULL,
      public_key    BLOB NOT NULL,
      counter       INTEGER NOT NULL DEFAULT 0,
      transports    TEXT,
      created_at    INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS request_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reqlog_user ON request_log(user_id);
  `);
}

// Promote the very first registered user (or a username set via ADMIN_USERNAME) to admin.
export function maybePromoteAdmin(userId, username) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const row = db.prepare("SELECT COUNT(*) AS n FROM users").get();
  const isFirstUser = row.n === 1; // this user was just inserted
  if ((adminUsername && username === adminUsername) || (!adminUsername && isFirstUser)) {
    db.prepare("UPDATE users SET role = 'admin', status = 'allowlisted' WHERE id = ?").run(userId);
    return true;
  }
  return false;
}

export default db;

// `npm run init-db` initializes the schema without starting the server.
if (process.argv.includes("--init")) {
  initSchema();
  console.log("Database initialized at", DB_PATH);
}
