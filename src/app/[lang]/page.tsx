import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import { RegistrationClosed } from "@/components/registration/RegistrationClosed";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { Container } from "@/components/site/Container";
import { homeLanguage, type Language, languagePath } from "@/lib/language";
import { openEventDays } from "@/lib/registrations/event-day-availability";
import { appUrl } from "@/lib/server/registrations";
import { currentLanguage, type Dictionary, getDictionary } from "./_dictionaries";
import { submitRegistration } from "./actions";

/**
 * Pairs the Thai and English registration pages for search engines, with the one the bare domain
 * opens as the default. The links must be absolute: they resolve against the layout's
 * `metadataBase`, from APP_URL at build time (a build arg in Docker). Without it they are left out
 * rather than pointing at localhost.
 */
export function generateMetadata(): Metadata {
  if (!appUrl()) return {};
  return {
    alternates: {
      languages: {
        th: languagePath("th", "/"),
        en: languagePath("en", "/"),
        "x-default": languagePath(homeLanguage, "/"),
      },
    },
  };
}

export default async function RegistrationPage() {
  const language = await currentLanguage();
  const dictionary = getDictionary(language);
  const copy = dictionary.registrationPage;

  return (
    <>
      <Image
        src="/brand/banner.jpg"
        alt={copy.bannerAlt}
        width={5000}
        height={1250}
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="h-auto w-full"
      />
      <Container className="flex flex-col gap-8 py-8 tab:gap-10 tab:py-10">
        <section className="mx-auto flex w-[min(100%,528px)] flex-col gap-2">
          <h1 className="text-[1.25rem] font-black italic tab:text-[1.5rem]">{copy.heading}</h1>
          <p>{copy.introduction}</p>
          <p className="text-muted">{copy.dateAndVenue}</p>
        </section>
        <Suspense fallback={<RegistrationPlaceholder text={copy.loading} />}>
          <Registration language={language} dictionary={dictionary} />
        </Suspense>
      </Container>
    </>
  );
}

// Which Event Days are still open depends on the current time, so it is read per request.
async function Registration({ language, dictionary }: { language: Language; dictionary: Dictionary }) {
  await connection();
  const { contactListName } = dictionary;
  const closedCopy = { ...dictionary.registrationClosed, contactListName };
  // Offer only 1 November for new Registrations; keep all Event Days for existing passes and Check-Ins.
  const eventDays = openEventDays(new Date()).filter((day) => day.date === "2026-11-01");
  if (eventDays.length === 0) return <RegistrationClosed copy={closedCopy} language={language} />;

  return (
    <RegistrationForm
      action={submitRegistration.bind(null, language)}
      eventDays={eventDays}
      language={language}
      copy={{
        form: dictionary.registrationForm,
        botProtection: dictionary.botProtection,
        duplicate: { ...dictionary.duplicateRegistration, contactListName },
        closed: closedCopy,
      }}
    />
  );
}

function RegistrationPlaceholder({ text }: { text: string }) {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex h-[640px] w-[min(100%,528px)] items-center justify-center rounded-input border border-line bg-surface text-muted"
    >
      {text}
    </div>
  );
}
