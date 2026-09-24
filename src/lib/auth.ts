import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function createAuth() {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
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
    advanced: {
      // Detrás de Cloudflare, la IP real del visitante llega en esta cabecera
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
    // nextCookies permite que las Server Actions escriban cookies de sesión
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | null = null;

/**
 * Se crea en la primera petición y no al importar el módulo: en Cloudflare Workers
 * las claves secretas solo están disponibles mientras se atiende una petición.
 */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}

/** Sesión actual (o null) desde un Server Component, Server Action o Route Handler. */
export async function getSession() {
  // Leer las cabeceras primero hace que la página se genere en cada visita, nunca en el build
  const h = await headers();
  if (!process.env.DATABASE_URL) return null;
  try {
    return await getAuth().api.getSession({ headers: h });
  } catch {
    return null;
  }
}
