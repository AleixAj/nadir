import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DEFAULT_LISTS } from "@/lib/demo-data";

export const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function createAuth() {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    // Sign up and log in with email and password (no email verification yet)
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Log the user in right after creating the account
      autoSignIn: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        // Let the user pick an account even if they are already logged into Google
        prompt: "select_account",
      },
    },
    databaseHooks: {
      user: {
        create: {
          // Every new account starts with the default lists
          after: async (newUser) => {
            await db.insert(schema.userList).values(
              DEFAULT_LISTS.map((l) => ({ userId: newUser.id, name: l.name, color: l.color })),
            );
          },
        },
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
