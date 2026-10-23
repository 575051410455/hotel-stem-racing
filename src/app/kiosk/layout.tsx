import type { Metadata } from "next";
import { event } from "@/lib/event";

export const metadata: Metadata = {
  title: `จุดเช็คอินด้วยตนเอง · ${event.name}`,
  robots: { index: false, follow: false },
};

// The Kiosk page (ticket 23) sits outside /admin's signed-in layout, so it has no Back Office
// navigation at all. `.back-office` only scopes the shadcn/ui theme its Staff panel uses.
// Don't read the session here: the page checks it (see src/lib/auth/session.ts).
export default function KioskLayout({ children }: LayoutProps<"/kiosk">) {
  return <div className="back-office flex flex-1 flex-col">{children}</div>;
}
