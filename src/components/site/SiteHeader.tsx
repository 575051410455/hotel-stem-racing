import Link from "next/link";
import { Suspense } from "react";
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
      <Container className="flex h-14 items-center gap-4 tab:h-24 tab:gap-6">
        <Link href={languagePath(language, "/")} aria-label={copy.homeLinkName} className="flex items-center">
          <Wordmark />
        </Link>
        {/* Partner divider: shown because this site is co-branded with the venue.
            Hidden on the narrowest phones, where the banner right below carries both marks. */}
        <span aria-hidden="true" className="h-6 w-px bg-divider max-[399px]:hidden tab:h-8" />
        <PartnerWordmark className="max-[399px]:hidden" />
        {/* The address is request-time on the Event Pass page; prerendered pages never show the fallback. */}
        <Suspense fallback={<LanguageToggleFallback language={language} name={copy.languageToggleName} />}>
          <LanguageToggle language={language} name={copy.languageToggleName} />
        </Suspense>
      </Container>
    </header>
  );
}
