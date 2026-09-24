import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// El manejador se crea en cada petición para leer las claves ya cargadas
export const GET = (req: Request) => toNextJsHandler(getAuth()).GET(req);
export const POST = (req: Request) => toNextJsHandler(getAuth()).POST(req);
