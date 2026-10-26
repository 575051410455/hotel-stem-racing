// URL parsing alone also accepts paths, credentials and backslashes. An Origin has only a
// scheme, host (including bracketed IPv6) and optional numeric port; URL validates those next.
const HTTP_ORIGIN = /^https?:\/\/(?:\[[0-9a-f:.]+\]|[^:/?#\\\s@,%]+)(?::\d+)?$/i;

function configuredOrigin(baseURL: string | undefined): string {
  try {
    if (!baseURL || !/^https?:\/\//i.test(baseURL) || /[\s\\]/.test(baseURL)) throw new Error();
    const url = new URL(baseURL);
    if (url.username || url.password) throw new Error();
    return url.origin;
  } catch {
    throw new Error("BETTER_AUTH_URL must be an absolute HTTP(S) URL without credentials");
  }
}

/** Whether browser headers establish the configured origin for a Back Office mutation. */
export function isSameOriginRequest(headers: Pick<Headers, "get">, baseURL: string | undefined): boolean {
  const expectedOrigin = configuredOrigin(baseURL);
  const site = headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") return false;

  const origin = headers.get("origin");
  if (origin === null) return site === "same-origin";
  if (!HTTP_ORIGIN.test(origin)) return false;
  try {
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}
