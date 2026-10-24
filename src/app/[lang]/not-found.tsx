import { NotFoundNotice } from "@/components/site/NotFoundNotice";
import { languagePath } from "@/lib/language";
import { currentLanguage, getDictionary } from "./_dictionaries";

/** Any other public address that doesn't exist (see ./[...missing]/page.tsx), in the page's language. */
export default async function PageNotFound() {
  const language = await currentLanguage();
  return <NotFoundNotice copy={getDictionary(language).pageNotFound} homeHref={languagePath(language, "/")} />;
}
