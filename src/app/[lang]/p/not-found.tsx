import { NotFoundNotice } from "@/components/site/NotFoundNotice";
import { languagePath } from "@/lib/language";
import { currentLanguage, getDictionary } from "../_dictionaries";

export default async function EventPassNotFound() {
  const language = await currentLanguage();
  return <NotFoundNotice copy={getDictionary(language).eventPassNotFound} homeHref={languagePath(language, "/")} />;
}
