"use server";

// Server Actions for the user's lists: create, rename, delete and move products between them.
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { product, userList } from "@/db/schema";
import { LIST_LIMIT, type ActionResult } from "@/lib/account-types";
import { fresh, idSchema, listIdSchema, NO_SESSION, ownListId, ownProduct, requireUser } from "./action-utils";
import { allow, TOO_MANY } from "./limits";

const listSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const LIST_INPUT_ERROR = "Escribe un nombre de 1 a 30 caracteres y elige un color.";
const LIST_NAME_TAKEN = "Ya tienes una lista con ese nombre.";

// Postgres error 23505: a unique index rejected the row (e.g. two lists with the same name)
function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

// True if the user already has another list with this name (ignoring case)
async function listNameTaken(userId: string, name: string, exceptId?: string) {
  const rows = await db.select({ id: userList.id, name: userList.name }).from(userList).where(eq(userList.userId, userId));
  return rows.some((r) => r.id !== exceptId && r.name.toLowerCase() === name.toLowerCase());
}

export async function createList(input: z.input<typeof listSchema>): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!(await allow(`list:${user.id}`, 20, 60))) return { ok: false, error: TOO_MANY };
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: LIST_INPUT_ERROR };

  const [{ n }] = await db.select({ n: count() }).from(userList).where(eq(userList.userId, user.id));
  if (n >= LIST_LIMIT) return { ok: false, error: `Puedes tener hasta ${LIST_LIMIT} listas.` };
  if (await listNameTaken(user.id, parsed.data.name)) return { ok: false, error: LIST_NAME_TAKEN };

  try {
    await db.insert(userList).values({ userId: user.id, ...parsed.data });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: LIST_NAME_TAKEN };
    throw err;
  }
  return fresh(user);
}

export async function updateList(input: z.input<typeof listSchema> & { id: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = listSchema.safeParse(input);
  if (!parsed.success || !listIdSchema.safeParse(input.id).success) return { ok: false, error: LIST_INPUT_ERROR };
  if (await listNameTaken(user.id, parsed.data.name, input.id)) return { ok: false, error: LIST_NAME_TAKEN };

  try {
    await db
      .update(userList)
      .set(parsed.data)
      .where(and(eq(userList.id, input.id), eq(userList.userId, user.id)));
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: LIST_NAME_TAKEN };
    throw err;
  }
  return fresh(user);
}

// Deletes the list. Its products are kept, just without a list (the foreign key sets it to null)
export async function deleteList(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!listIdSchema.safeParse(id).success) return { ok: false, error: "Lista no válida." };
  await db.delete(userList).where(and(eq(userList.id, id), eq(userList.userId, user.id)));
  return fresh(user);
}

// Moves a product to another list (or to no list)
export async function moveProduct(input: { id: string; listId: string | null }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!idSchema.safeParse(input.id).success || !listIdSchema.safeParse(input.listId).success) {
    return { ok: false, error: "Datos no válidos." };
  }
  if (!(await ownProduct(user.id, input.id))) return { ok: false, error: "No encontramos este producto." };

  const listId = await ownListId(user.id, input.listId);
  await db.update(product).set({ listId }).where(and(eq(product.id, input.id), eq(product.userId, user.id)));
  return fresh(user);
}
