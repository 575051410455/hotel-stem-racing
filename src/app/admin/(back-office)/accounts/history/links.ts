// Links to the Account History. Pure; safe in browser and server.

export const ACCOUNT_HISTORY_PATH = "/admin/accounts/history";

/**
 * `/admin/accounts/history?account=…&page=2`: everyone's changes, or one Account's, on a page. The
 * first page and "every Account" are left out, so the plain link stays plain.
 */
export function accountHistoryHref({ accountId, page = 1 }: { accountId?: string; page?: number } = {}): string {
  const query = new URLSearchParams();
  if (accountId) query.set("account", accountId);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `${ACCOUNT_HISTORY_PATH}?${text}` : ACCOUNT_HISTORY_PATH;
}
