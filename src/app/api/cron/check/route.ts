import { asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { product, userSettings } from "@/db/schema";
import { checkProduct } from "@/server/checks";

// Automatic price check. A scheduled job calls it with:
//   Authorization: Bearer <CRON_SECRET>
// It checks the products that are due, based on each user's frequency.

const BATCH = 40; // max products per run
const PARALLEL = 5; // checks running at the same time

// Compares two strings in constant time (hashing first so both have the same length),
// so the response time doesn't give hints about the secret
async function sameSecret(a: string, b: string) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !(await sameSecret(auth, `Bearer ${secret}`))) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = Date.now();
  // User frequency in hours (24 if they never changed it)
  const hours = sql<number>`case coalesce(${userSettings.freq}, '24h') when '1h' then 1 when '6h' then 6 else 24 end`;
  const due = await db
    .select({ p: product })
    .from(product)
    .leftJoin(userSettings, eq(userSettings.userId, product.userId))
    .where(
      or(
        isNull(product.lastCheckedAt),
        // Last checked more than `hours` ago (5 min of slack so runs that fire a bit early still count)
        lt(product.lastCheckedAt, sql`now() - (${hours} * interval '1 hour') + interval '5 minutes'`),
      ),
    )
    .orderBy(asc(product.lastCheckedAt))
    .limit(BATCH);

  let ok = 0;
  const failed: { id: string; error?: string }[] = [];
  // Check PARALLEL products at a time. Only pause if the group hit a real store,
  // so we don't flood them (sample catalog products don't use the network)
  for (let i = 0; i < due.length; i += PARALLEL) {
    const group = due.slice(i, i + PARALLEL).map((d) => d.p);
    const results = await Promise.all(group.map((p) => checkProduct(p)));
    results.forEach((r, k) => {
      if (r.ok) ok++;
      else failed.push({ id: group[k].id, error: r.error });
    });
    if (group.some((p) => !p.catalogId)) await new Promise((res) => setTimeout(res, 500));
  }

  return Response.json({ checked: due.length, ok, failed, ms: Date.now() - now });
}

// Don't let Next.js prerender this route
export const dynamic = "force-dynamic";
