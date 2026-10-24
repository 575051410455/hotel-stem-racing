import "server-only";
import { cache } from "react";
import { registrations } from "@/lib/server/registrations";

/**
 * The Registration module's head counts, read once per request: the summary cards and the role
 * table each call it from their own boundary. Call `requireAdmin()` first.
 */
export const readHeadCounts = cache(() => registrations().headCounts());
