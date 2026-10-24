// The public pages' languages and their addresses. Thai is the default and keeps the unprefixed
// paths (`/`, `/p/:token`); English lives under `/en`. Pure; safe in browser, server and Proxy.

export const languages = ["th", "en"] as const;

export type Language = (typeof languages)[number];

export const defaultLanguage: Language = "th";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (languages as readonly string[]).includes(value);
}

/** `path` (unprefixed, starting with `/`) in `language`: `/p/x` → `/en/p/x`; Thai stays `/p/x`. */
export function languagePath(language: Language, path: string): string {
  if (language === defaultLanguage) return path;
  return path === "/" ? `/${language}` : `/${language}${path}`;
}

/**
 * The language a pathname names and the path without it: `/en/p/x` → en and `/p/x`. An
 * unprefixed path is the default language's; `/th/…` reads as Thai too (the Proxy redirects it).
 */
export function splitLanguagePath(pathname: string): { language: Language; path: string; prefixed: boolean } {
  const [, first = "", ...rest] = pathname.split("/");
  if (!isLanguage(first)) return { language: defaultLanguage, path: pathname, prefixed: false };
  return { language: first, path: `/${rest.join("/")}`, prefixed: true };
}
