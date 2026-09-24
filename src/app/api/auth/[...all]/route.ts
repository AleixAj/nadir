import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// Build the handler on each request so it reads the secrets that are loaded by then
export const GET = (req: Request) => toNextJsHandler(getAuth()).GET(req);
export const POST = (req: Request) => toNextJsHandler(getAuth()).POST(req);
