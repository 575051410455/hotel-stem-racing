import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { type Language, languagePath } from "@/lib/language";
import { Container } from "./Container";
import { LanguageToggle, LanguageToggleFallback } from "./LanguageToggle";
import { PartnerWordmark, Wordmark } from "./Wordmark";

export type SiteHeaderCopy = { skipLink: string; homeLinkName: string; languageToggleName: string };

export function SiteHeader({ language, copy }: { language: Language; copy: SiteHeaderCopy }) {
  return (
    <header className="border-b border-line bg-bg">
      <a
        href="#maincontent"
        className="absolute left-4 top-2 z-50 -translate-y-[180%] rounded-input bg-surface px-4 py-2 font-bold text-ink-pure outline-2 outline-accent transition-transform duration-200 ease-in-out focus:translate-y-0 focus:outline"
      >
        {copy.skipLink}
      </a>
      <HeaderBar homeHref={languagePath(language, "/")} homeLinkName={copy.homeLinkName}>
        {/* The address is request-time on the Event Pass page; prerendered pages never show the fallback. */}
        <Suspense fallback={<LanguageToggleFallback language={language} name={copy.languageToggleName} />}>
          <LanguageToggle language={language} name={copy.languageToggleName} />
        </Suspense>
      </HeaderBar>
    </header>
  );
}

/**
 * The header's row: the wordmark linking home, the venue's wordmark, then `children` at the right
 * (the language toggle). The global 404 uses it too, with no toggle.
 */
export function HeaderBar({
  homeHref,
  homeLinkName,
  children,
}: {
  homeHref: string;
  homeLinkName: string;
  children?: ReactNode;
}) {
  return (
    <Container className="flex h-14 items-center gap-3 tab:h-24 tab:gap-6">
      <Link href={homeHref} aria-label={homeLinkName} className="flex items-center">
        <Wordmark />
      </Link>
      {/* Partner divider: shown because this site is co-branded with the venue.
          Hidden below `tab:`: on phones the language toggle needs the room (with both marks it
          was pushed off-screen at 400–510px), and the registration page's banner carries both. */}
      <span aria-hidden="true" className="hidden h-8 w-px bg-divider tab:block" />
      <PartnerWordmark className="hidden tab:inline" />
      {children}
    </Container>
  );
}
