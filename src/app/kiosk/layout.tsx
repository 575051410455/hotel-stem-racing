import type { Metadata } from "next";
import { KeyboardFocus } from "@/components/site/KeyboardFocus";
import { event } from "@/lib/event";
import "../globals.css";

export const metadata: Metadata = {
  title: `จุดเช็คอินด้วยตนเอง · ${event.name}`,
  robots: { index: false, follow: false },
};

// The Kiosk's root layout (ticket 23): outside /admin, so it has no Back Office navigation at all.
// Thai, with its English lines marked lang="en", because Attendees read it. `.back-office` only
// scopes the shadcn/ui theme its Staff panel uses.
// Don't read the session here: the page checks it (see src/lib/auth/session.ts).
export default function KioskLayout({ children }: LayoutProps<"/kiosk">) {
  return (
    <html lang="th">
      <body>
        <KeyboardFocus />
        <div className="back-office flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
