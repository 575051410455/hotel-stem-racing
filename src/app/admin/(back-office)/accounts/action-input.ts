// Reading what the browser sent to the Accounts pages' Server Actions. A Server Action is a public
// endpoint, so its arguments can be anything.

/** A text field of what the browser sent, or "" when it's missing or not text. */
export function text(input: unknown, field: string): string {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>)[field] : undefined;
  return typeof value === "string" ? value : "";
}
