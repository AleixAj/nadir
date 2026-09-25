import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rateLimit } from "@/db/schema";

// Simple counter per key, stored in the database (the same table Better Auth uses for
// login limits), so it works across all Cloudflare Workers.
// Returns true if the action is allowed, false if the limit was reached.
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const [row] = await db.select().from(rateLimit).where(eq(rateLimit.key, key));

  // First time, or the last window is over: start counting again
  if (!row || now - row.lastRequest > windowMs) {
    await db
      .insert(rateLimit)
      .values({ id: crypto.randomUUID(), key, count: 1, lastRequest: now })
      .onConflictDoUpdate({ target: rateLimit.key, set: { count: 1, lastRequest: now } });
    return true;
  }
  if (row.count >= max) return false;
  await db.update(rateLimit).set({ count: row.count + 1 }).where(eq(rateLimit.key, key));
  return true;
}

export const TOO_MANY = "Has hecho demasiadas peticiones seguidas. Espera un poco y vuelve a probar.";
