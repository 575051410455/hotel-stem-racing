import { createAuthClient } from "better-auth/react";

/**
 * Browser client for the Better Auth endpoints under /api/auth on the current origin.
 * Sign-in goes through it, not a Server Action, because Better Auth only rate-limits HTTP requests
 * to its handler. Calls made with `auth.api` on the server are not limited.
 */
export const staffAuthClient = createAuthClient();
