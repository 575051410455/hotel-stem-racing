import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentLanguage, getDictionary } from "../_dictionaries";

// The tab title comes from here: ../not-found.tsx renders inside this page's metadata.
export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await currentLanguage()).pageNotFound.title };
}

/**
 * Every public address no page answers (the Proxy sends unknown paths here as /th/… or /en/…), so
 * it gets the public layout and ../not-found.tsx in its language instead of a bare 404.
 */
export default function MissingPage() {
  notFound();
}
