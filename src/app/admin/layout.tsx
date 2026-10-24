import type { Metadata } from "next";
import { KeyboardFocus } from "@/components/site/KeyboardFocus";
import { event } from "@/lib/event";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: `ระบบหลังบ้าน · ${event.name}`,
    template: `%s · ระบบหลังบ้าน · ${event.name}`,
  },
  robots: { index: false, follow: false },
};

// The Back Office's root layout (the public pages and the Kiosk have their own): `.back-office`
// scopes the shadcn/ui theme in globals.css. Thai until thai-english ticket 06 makes it English.
// Don't read the session here. Pages check it themselves (see src/lib/auth/session.ts).
export default function BackOfficeRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="th">
      <body>
        <KeyboardFocus />
        <div className="back-office flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
