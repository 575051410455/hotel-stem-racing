import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Where Proxy rewrites an Event Pass link whose token doesn't exist (src/proxy.ts). It reaches
 * notFound() while prerendering, so the build stores it with a 404 and the not-found page in ../.
 * /p/[token] can't do this itself: its shell, and so its 200, is sent before the lookup finishes.
 */
export default function UnknownEventPass() {
  notFound();
}
