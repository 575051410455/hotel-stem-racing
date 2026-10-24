import type { Metadata } from "next";
import { KeyboardFocus } from "@/components/site/KeyboardFocus";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { languages } from "@/lib/language";
import { currentLanguage, getDictionary } from "./_dictionaries";
import "../globals.css";

// The public pages' root layout, one per language: Thai at the unprefixed addresses (the Proxy
// rewrites them to /th/…) and English under /en. Each language prerenders.
export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { registrationPage } = getDictionary(await currentLanguage());
  return { title: registrationPage.title, description: registrationPage.description };
}

export default async function PublicLayout({ children }: LayoutProps<"/[lang]">) {
  const language = await currentLanguage();
  const dictionary = getDictionary(language);

  return (
    <html lang={language}>
      <body>
        <KeyboardFocus />
        <SiteHeader language={language} copy={dictionary} />
        <main id="maincontent" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter language={language} contactListName={dictionary.contactListName} />
      </body>
    </html>
  );
}
