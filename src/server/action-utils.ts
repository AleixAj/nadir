import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { product, userList } from "@/db/schema";
import type { ActionResult } from "@/lib/account-types";
import { getSession } from "@/lib/auth";
import { getAccountData } from "./account";

// Small helpers shared by the Server Actions (actions.ts, list-actions.ts, profile-actions.ts)

export type SessionUser = { id: string; name: string; email: string; image?: string | null };

export async function requireUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export const NO_SESSION = { ok: false as const, error: "Tu sesión ha caducado. Vuelve a entrar." };

// Sends back the updated account data
export async function fresh(user: SessionUser): Promise<ActionResult> {
  return { ok: true, data: await getAccountData(user) };
}

// Only returns the product if it belongs to this user
export async function ownProduct(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, id), eq(product.userId, userId)));
  return row ?? null;
}

// Returns the list id only if that list belongs to the user (otherwise no list)
export async function ownListId(userId: string, listId: string | null) {
  if (!listId) return null;
  const [row] = await db
    .select({ id: userList.id })
    .from(userList)
    .where(and(eq(userList.id, listId), eq(userList.userId, userId)));
  return row?.id ?? null;
}

export const idSchema = z.string().uuid();
export const listIdSchema = z.string().min(1).max(64).nullable();
