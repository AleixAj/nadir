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
        // Let the user pick an account even if they are already logged into Google
        prompt: "select_account",
      },
    },
    user: {
      // Allows deleting the account from Settings (products are deleted in cascade)
      deleteUser: { enabled: true },
    },
    session: {
      // Also keep the session in a signed cookie, so fewer database queries
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    advanced: {
      // Behind Cloudflare the real visitor IP comes in this header
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
    // nextCookies lets Server Actions set session cookies
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | null = null;

// Created on the first request, not on import: on Cloudflare Workers
// secrets are only available while handling a request.
export function getAuth() {
  instance ??= createAuth();
  return instance;
}

// Current session (or null). Works in Server Components, Server Actions and Route Handlers
export async function getSession() {
  // Reading headers first makes the page render on every request, never at build time
  const h = await headers();
  if (!process.env.DATABASE_URL) return null;
  try {
    return await getAuth().api.getSession({ headers: h });
  } catch {
    return null;
  }
}
