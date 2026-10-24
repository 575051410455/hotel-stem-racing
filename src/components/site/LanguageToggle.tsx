"use client";

import { usePathname } from "next/navigation";
import { type Language, languagePath, splitLanguagePath } from "@/lib/language";

/** Each language by its own name, whatever the page's language. */
const choices = [
  { language: "th", short: "TH", name: "ภาษาไทย" },
  { language: "en", short: "EN", name: "English" },
] as const satisfies readonly { language: Language; short: string; name: string }[];

/**
 * The `TH | EN` switch at the top right of every public page. Each half is a plain link to this
 * page in that language (`/p/x` ↔ `/en/p/x`), so it works before scripts load, and it is a full
 * page load: the other language is a different root layout (`<html lang>`). Reads the address,
 * so on a request-time page render it below a <Suspense> boundary (`LanguageToggleFallback`).
 * The registration form listens for clicks on `[data-language-switch]` to keep its answers.
 */
export function LanguageToggle({ language, name }: { language: Language; name: string }) {
  // The address bar's path; the Proxy may have rewritten it to /th/… internally, so strip either.
  const { path } = splitLanguagePath(usePathname());
  return <LanguageLinks language={language} name={name} path={path} />;
}

/** The toggle before the address is known: both halves lead to the registration page. */
export function LanguageToggleFallback({ language, name }: { language: Language; name: string }) {
  return <LanguageLinks language={language} name={name} path="/" />;
}

function LanguageLinks({ language, name, path }: { language: Language; name: string; path: string }) {
  return (
    <nav aria-label={name} className="ml-auto shrink-0">
      <ul className="flex items-center rounded-pill border border-line-strong p-0.5 text-[0.875rem] font-bold">
        {choices.map((choice) => {
          const current = choice.language === language;
          return (
            <li key={choice.language}>
              <a
                href={languagePath(choice.language, path)}
                hrefLang={choice.language}
                lang={choice.language}
                data-language-switch
                aria-current={current ? "page" : undefined}
                className={`flex h-11 min-w-11 items-center justify-center rounded-pill px-3 no-underline ${
                  current ? "bg-ink-pure text-white" : "text-ink-pure hover:underline"
                }`}
              >
                {/* The name starts with the visible code ("EN English"), so a voice command
                    naming what's on screen ("tap EN") finds the link (WCAG 2.5.3). */}
                {choice.short}
                <span className="sr-only"> {choice.name}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
