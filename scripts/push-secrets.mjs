// Sube a Cloudflare las claves secretas que hay en .env.local (sin mostrarlas).
// Uso: npm run cf:secrets   (antes: npx wrangler login)
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const KEYS = ["DATABASE_URL", "BETTER_AUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "CRON_SECRET"];

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const missing = KEYS.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Faltan en .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

const payload = JSON.stringify(Object.fromEntries(KEYS.map((k) => [k, env[k]])));
const r = spawnSync("npx", ["wrangler", "secret", "bulk"], { input: payload, stdio: ["pipe", "inherit", "inherit"], shell: true });
process.exit(r.status ?? 1);
