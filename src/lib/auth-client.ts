import { createAuthClient } from "better-auth/react";

// No baseURL, so it uses the same domain the app runs on
export const authClient = createAuthClient();
