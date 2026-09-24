import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const isGoogleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Deja elegir cuenta aunque ya haya una sesión de Google abierta
      prompt: "select_account",
    },
  },
  user: {
    // Permite borrar la cuenta desde Ajustes (sus productos se borran en cascada)
    deleteUser: { enabled: true },
  },
  session: {
    // La sesión se guarda también en una cookie firmada: menos consultas a la base de datos
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // nextCookies permite que las Server Actions escriban cookies de sesión
  plugins: [nextCookies()],
});

/** Sesión actual (o null) desde un Server Component, Server Action o Route Handler. */
export async function getSession() {
  if (!process.env.DATABASE_URL) return null;
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}
