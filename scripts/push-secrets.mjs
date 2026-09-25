// Uploads the secret keys from .env.local to Cloudflare (without printing them).
// Usage: npm run cf:secrets   (run `npx wrangler login` first)
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const KEYS = ["DATABASE_URL", "BETTER_AUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "CRON_SECRET", "RESEND_API_KEY"];
// Uploaded only if they are in .env.local
const OPTIONAL = ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"];

/** Reads KEY=value lines from an env file, skipping blanks and comments. */
function readEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const eq = line.indexOf("=");
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

const env = readEnvFile(".env.local");

const missing = KEYS.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

// `wrangler secret bulk` reads a JSON object from stdin
const keys = [...KEYS, ...OPTIONAL.filter((k) => env[k])];
const payload = JSON.stringify(Object.fromEntries(keys.map((k) => [k, env[k]])));
const result = spawnSync("npx", ["wrangler", "secret", "bulk"], { input: payload, stdio: ["pipe", "inherit", "inherit"], shell: true });
process.exit(result.status ?? 1);
