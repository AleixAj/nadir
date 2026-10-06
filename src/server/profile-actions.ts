"use server";

// Server Actions for the profile: change the name and upload or remove the photo.
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { userAvatar } from "@/db/schema";
import type { ActionResult } from "@/lib/account-types";
import { getAuth } from "@/lib/auth";
import { cleanName } from "@/lib/names";
import { fresh, NO_SESSION, requireUser, type SessionUser } from "./action-utils";
import { allow, TOO_MANY } from "./limits";

// Saves the change through Better Auth, so the session cookie gets the new name or photo too
async function saveUser(user: SessionUser, changes: { name?: string; image?: string | null }): Promise<ActionResult> {
  await getAuth().api.updateUser({ body: changes, headers: await headers() });
  return fresh({ ...user, ...changes });
}

const nameSchema = z.string().trim().min(1).max(60);

export async function updateName(name: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: "Escribe un nombre de 1 a 60 caracteres." };
  return saveUser(user, { name: cleanName(parsed.data) });
}

// The browser sends the photo already cropped to 256x256, so it's small.
// We still check the size and that the bytes really are an image.
const MAX_AVATAR_BYTES = 150 * 1024;
const AVATAR_TYPES = ["image/webp", "image/jpeg", "image/png"];

function looksLikeImage(bytes: Buffer, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(1, 4).toString("ascii") === "PNG";
  // WebP files start with "RIFF", then the size, then "WEBP"
  return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

export async function uploadAvatar(dataUrl: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!(await allow(`avatar:${user.id}`, 10, 600))) return { ok: false, error: TOO_MANY };

  // Expected format: "data:image/webp;base64,AAAA..."
  const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  const type = match?.[1] ?? "";
  if (!match || !AVATAR_TYPES.includes(type)) return { ok: false, error: "La imagen tiene que ser JPG, PNG o WebP." };
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_AVATAR_BYTES) return { ok: false, error: "La imagen es demasiado grande." };
  if (!looksLikeImage(bytes, type)) return { ok: false, error: "El archivo no parece una imagen válida." };

  const values = { userId: user.id, contentType: type, data: match[2], updatedAt: new Date() };
  await db.insert(userAvatar).values(values).onConflictDoUpdate({ target: userAvatar.userId, set: values });
  // "?v=" changes on every upload, so browsers don't show the old cached photo
  return saveUser(user, { image: `/api/avatar/${user.id}?v=${Date.now()}` });
}

// Back to the default avatar (the user's initials)
export async function removeAvatar(): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  await db.delete(userAvatar).where(eq(userAvatar.userId, user.id));
  return saveUser(user, { image: null });
}
