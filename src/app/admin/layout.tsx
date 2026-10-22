import type { Metadata } from "next";
import { event } from "@/lib/event";

export const metadata: Metadata = {
  title: {
    default: `ระบบหลังบ้าน · ${event.name}`,
    template: `%s · ระบบหลังบ้าน · ${event.name}`,
  },
  robots: { index: false, follow: false },
};

// The Back Office root: `.back-office` scopes the shadcn/ui theme in globals.css.
// Don't read the session here. Pages check it themselves (see src/lib/auth/session.ts).
export default function BackOfficeRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="back-office flex flex-1 flex-col">{children}</div>;
}
