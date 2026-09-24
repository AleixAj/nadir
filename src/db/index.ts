import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/** true si hay cadena de conexión. Sin ella la app funciona solo en modo demo. */
export const isDbConfigured = () => Boolean(process.env.DATABASE_URL);

const connect = () =>
  // Con una cadena de relleno, el build no falla aunque aún no esté configurada la base de datos
  drizzle(neon(process.env.DATABASE_URL ?? "postgresql://user:password@localhost/nadir"), { schema });

type Db = ReturnType<typeof connect>;
let instance: Db | null = null;

/**
 * Conexión perezosa: se crea en la primera consulta, no al importar el módulo.
 * En Cloudflare Workers las variables de entorno están disponibles al atender la
 * petición, así que así se leen siempre los valores correctos.
 */
export const db = new Proxy({} as Db, {
  get(_, prop) {
    instance ??= connect();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
