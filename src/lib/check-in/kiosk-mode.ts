// Kiosk mode (pure): whether /admin/check-in runs as a Kiosk. It lives in the address, as
// `?kiosk=1`, so a Kiosk iPad can be bookmarked straight into it.

const KIOSK_PARAM = "kiosk";

/** True only for exactly `kiosk=1`; anything else is the Staff desk. */
export function isKioskMode(search: Pick<URLSearchParams, "get">): boolean {
  return search.get(KIOSK_PARAM) === "1";
}

/**
 * The same address with Kiosk mode turned on or off, keeping any other parameters and the hash.
 * `window.location` fits `current`.
 */
export function kioskUrl(current: { pathname: string; search: string; hash?: string }, on: boolean): string {
  const params = new URLSearchParams(current.search);
  if (on) params.set(KIOSK_PARAM, "1");
  else params.delete(KIOSK_PARAM);
  const query = params.toString();
  return `${current.pathname}${query ? `?${query}` : ""}${current.hash ?? ""}`;
}
