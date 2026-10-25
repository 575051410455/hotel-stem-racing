// The public pages' languages and their addresses. Thai is the default and keeps the unprefixed
// paths (`/p/:token`); English lives under `/en`. The home page is the exception: the bare domain
// (`/`) leads to it in `homeLanguage`, so both languages' home pages are prefixed (`/th`, `/en`).
// Pure; safe in browser, server and Proxy.

export const languages = ["th", "en"] as const;

export type Language = (typeof languages)[number];

export const defaultLanguage: Language = "th";

/** The language the bare domain (`/`) opens in. */
export const homeLanguage: Language = "en";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (languages as readonly string[]).includes(value);
}

/**
 * `path` (unprefixed, starting with `/`) in `language`: `/p/x` → `/en/p/x`; Thai stays `/p/x`.
 * The home page `/` is `/th` or `/en`.
 */
export function languagePath(language: Language, path: string): string {
  if (path === "/") return `/${language}`;
  return language === defaultLanguage ? path : `/${language}${path}`;
}

/**
 * The language a pathname names and the path without it: `/en/p/x` → en and `/p/x`. An
 * unprefixed path is the default language's; `/th/…` reads as Thai too (the Proxy redirects it
 * to the unprefixed form, except Thai's home page `/th`).
 */
export function splitLanguagePath(pathname: string): { language: Language; path: string; prefixed: boolean } {
  const [, first = "", ...rest] = pathname.split("/");
  if (!isLanguage(first)) return { language: defaultLanguage, path: pathname, prefixed: false };
  return { language: first, path: `/${rest.join("/")}`, prefixed: true };
}
