import { createAuthClient } from "better-auth/react";

// Sin baseURL usa el mismo dominio en el que se sirve la app
export const authClient = createAuthClient();
