import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/site/Container";
import { KeyboardFocus } from "@/components/site/KeyboardFocus";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PartnerWordmark, Wordmark } from "@/components/site/Wordmark";
import { type Language, languagePath } from "@/lib/language";
import { en } from "./[lang]/_dictionaries/en";
import { th } from "./[lang]/_dictionaries/th";
import "./globals.css";

export const metadata: Metadata = {
  title: `${th.pageNotFound.heading} · ${en.pageNotFound.heading}`,
};

/**
 * The 404 for every address no page answers: unknown public paths (the Proxy sends them to /th/…
 * or /en/…), unknown or malformed Event Pass links (the Proxy rewrites them to a path with no
 * page), and stray /admin or /api paths. Next serves it with its HTML rendered on the server,
 * which a page calling notFound() doesn't get under Cache Components. It can't know the
 * language, so it says everything in Thai, then English, as the Kiosk does.
 */
export default function GlobalNotFound() {
  return (
    <html lang="th">
      <body>
        <KeyboardFocus />
        <header className="border-b border-line bg-bg">
          <Container className="flex h-14 items-center gap-4 tab:h-24 tab:gap-6">
            <Link href="/" aria-label={th.homeLinkName} className="flex items-center">
              <Wordmark />
            </Link>
            <span aria-hidden="true" className="h-6 w-px bg-divider max-[399px]:hidden tab:h-8" />
            <PartnerWordmark className="max-[399px]:hidden" />
          </Container>
        </header>
        <main id="maincontent" tabIndex={-1}>
          <Container className="py-8 tab:py-10">
            <section className="mx-auto flex w-[min(100%,528px)] flex-col gap-6 rounded-input border border-line bg-surface p-5 tab:p-8">
              <NotFoundInLanguage language="th" />
              <div aria-hidden="true" className="h-px bg-line" />
              <NotFoundInLanguage language="en" />
            </section>
          </Container>
        </main>
        <SiteFooter language="th" contactListName={th.contactListName} />
      </body>
    </html>
  );
}

function NotFoundInLanguage({ language }: { language: Language }) {
  const copy = (language === "th" ? th : en).pageNotFound;
  const Heading = language === "th" ? "h1" : "h2";
  return (
    <div lang={language} className="flex flex-col gap-4">
      <Heading className="text-[1.25rem] font-black italic tab:text-[1.5rem]">{copy.heading}</Heading>
      <p>{copy.body}</p>
      <p>
        <Link href={languagePath(language, "/")} className="font-bold text-link underline">
          {copy.action}
        </Link>
      </p>
    </div>
  );
}
