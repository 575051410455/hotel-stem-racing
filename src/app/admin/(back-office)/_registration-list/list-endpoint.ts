// Where the Registration list's rows come from, and the cache key they sit under. Kept apart from
// query.ts, whose search-param helpers bring zod: pages that only refresh the list or call a row
// endpoint (bulk send, the detail page) import this, so zod stays out of their bundles.

export const REGISTRATION_LIST_ENDPOINT = "/api/back-office/registrations";

/**
 * Every cached list page sits under this key, so a row action (delete, resend, …) can refresh
 * them all: `queryClient.invalidateQueries({ queryKey: registrationListKey })`.
 */
export const registrationListKey = ["back-office", "registrations"] as const;
