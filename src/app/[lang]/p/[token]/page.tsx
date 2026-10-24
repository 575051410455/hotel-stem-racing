import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventPassCard } from "@/components/registration/EventPassCard";
import { Container } from "@/components/site/Container";
import type { Language } from "@/lib/language";
import { eventPassLink, registrations } from "@/lib/server/registrations";
import { currentLanguage, type Dictionary, getDictionary } from "../../_dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getDictionary(await currentLanguage()).eventPassPage.title,
    // The link is the pass: keep it out of search results and out of Referer headers.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function EventPassPage({ params }: PageProps<"/[lang]/p/[token]">) {
  const language = await currentLanguage();
  const dictionary = getDictionary(language);
  const copy = dictionary.eventPassPage;

  return (
    <Container className="flex flex-col gap-6 py-8 tab:gap-8 tab:py-10">
      <section className="mx-auto flex w-[min(100%,528px)] flex-col gap-2">
        <h1 className="text-[1.25rem] font-black italic tab:text-[1.5rem]">{copy.thankYou}</h1>
        <p>{copy.seeYou}</p>
        <p className="text-[0.875rem] text-muted">{copy.saveThis}</p>
      </section>
      <Suspense fallback={<EventPassPlaceholder text={copy.loading} />}>
        <EventPass params={params} language={language} dictionary={dictionary} />
      </Suspense>
    </Container>
  );
}

// Params and the database read are request-time data, so they stay under <Suspense>.
async function EventPass({
  params,
  language,
  dictionary,
}: Pick<PageProps<"/[lang]/p/[token]">, "params"> & { language: Language; dictionary: Dictionary }) {
  const { token } = await params;
  const lookup = await registrations().getEventPass(token);
  if (lookup.status === "not-found") notFound();

  return (
    <EventPassCard
      pass={lookup.pass}
      link={eventPassLink(lookup.pass.token)}
      language={language}
      copy={dictionary.eventPassCard}
    />
  );
}

function EventPassPlaceholder({ text }: { text: string }) {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex h-[640px] w-[min(100%,528px)] items-center justify-center rounded-input border border-line bg-surface text-muted"
    >
      {text}
    </div>
  );
}
