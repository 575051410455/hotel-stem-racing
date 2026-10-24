import Link from "next/link";
import { Container } from "@/components/site/Container";
import { languagePath } from "@/lib/language";
import { currentLanguage, getDictionary } from "../_dictionaries";

export default async function EventPassNotFound() {
  const language = await currentLanguage();
  const copy = getDictionary(language).eventPassNotFound;

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
