import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connect = () =>
  // Placeholder URL so the build doesn't fail when the database isn't set up yet
  drizzle(neon(process.env.DATABASE_URL ?? "postgresql://user:password@localhost/nadir"), { schema });

type Db = ReturnType<typeof connect>;
let instance: Db | null = null;

// Lazy connection: created on the first query, not when the module is imported.
// On Cloudflare Workers env vars are only available while handling a request,
// so this way we always read the right values.
export const db = new Proxy({} as Db, {
  get(_, prop) {
    instance ??= connect();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
