import "server-only";
import { betterAuth } from "better-auth";
import { eq } from "drizzle-orm";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DEFAULT_LISTS } from "@/lib/demo-data";
import { sendEmail } from "@/server/email";
import { accountExistsTemplate, resetPasswordTemplate, verifyEmailTemplate } from "@/server/email-templates";

export const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function createAuth() {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    // Sign up and log in with email and password.
    // The email has to be confirmed before the first login.
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      // "Forgot your password": emails a link to /entrar/nueva-contrasena
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({ to: user.email, ...resetPasswordTemplate(user.name, url) });
      },
      // After changing the password, log out every other device
      revokeSessionsOnPasswordReset: true,
      // Signing up with an email that already has an account: the page shows the same
      // "check your email" message (so nobody can find out who is registered),
      // and the owner gets an email explaining how to log in
      onExistingUserSignUp: async ({ user }) => {
        const logins = await db.select({ providerId: schema.account.providerId }).from(schema.account).where(eq(schema.account.userId, user.id));
        const hasGoogle = logins.some((l) => l.providerId === "google");
        await sendEmail({ to: user.email, ...accountExistsTemplate(user.name, hasGoogle) });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({ to: user.email, ...verifyEmailTemplate(user.name, url) });
      },
      sendOnSignUp: true,
      // Trying to log in without confirming sends a new link
      sendOnSignIn: true,
      // Clicking the link logs the user in
      autoSignInAfterVerification: true,
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
    // Limit requests per IP (stricter on login and sign-up), stored in the database
    rateLimit: {
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        // Emails cost money and can be abused, so these are stricter
        "/send-verification-email": { window: 60, max: 2 },
        "/request-password-reset": { window: 60, max: 2 },
      },
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
  } catch (err) {
    // Log it: a database outage would otherwise look like "not logged in"
    console.error("Could not read the session", err);
    return null;
  }
}
