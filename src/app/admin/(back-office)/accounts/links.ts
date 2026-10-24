// Links to an Account's page. Pure; safe in browser and server.

/** `/admin/accounts/{id}`: one Account, where an Admin edits it and sets its password. */
export function accountHref(accountId: string): string {
  return `/admin/accounts/${encodeURIComponent(accountId)}`;
}
