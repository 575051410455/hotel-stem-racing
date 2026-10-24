// The public pages' wording, one hand-written dictionary per language. Both have exactly the same
// keys: a missing or extra English entry is a type error. Server-only (next/root-params refuses a
// Client Component); client components get the strings they need from their server parent.

import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { isLanguage, type Language } from "@/lib/language";
import { en } from "./en";
import { th } from "./th";

export type Dictionary = typeof th;

const dictionaries: Record<Language, Dictionary> = { th, en };

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language];
}

/** The language of the public page being rendered, from its `[lang]` segment. */
export async function currentLanguage(): Promise<Language> {
  const language = await lang();
  if (!isLanguage(language)) notFound();
  return language;
}
