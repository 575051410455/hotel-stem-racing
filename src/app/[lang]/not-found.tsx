import Link from "next/link";
import { Container } from "@/components/site/Container";
import { languagePath } from "@/lib/language";
import { currentLanguage, getDictionary } from "./_dictionaries";

/** Any other public address that doesn't exist (see ./[...missing]/page.tsx), in the page's language. */
export default async function PageNotFound() {
  const language = await currentLanguage();
  const copy = getDictionary(language).pageNotFound;

  return (
    <Container className="py-8 tab:py-10">
      <section className="mx-auto flex w-[min(100%,528px)] flex-col gap-4 rounded-input border border-line bg-surface p-5 tab:p-8">
        <h1 className="text-[1.25rem] font-black italic tab:text-[1.5rem]">{copy.heading}</h1>
        <p>{copy.body}</p>
        <p>
          <Link href={languagePath(language, "/")} className="font-bold text-link underline">
            {copy.action}
          </Link>
        </p>
      </section>
    </Container>
  );
}
