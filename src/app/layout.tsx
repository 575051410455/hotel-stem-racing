import type { Metadata } from "next";
import { KeyboardFocus } from "@/components/site/KeyboardFocus";
import { event } from "@/lib/event";
import "./globals.css";

export const metadata: Metadata = {
  title: `ลงทะเบียนเข้าร่วมงาน ${event.name}`,
  description: `ลงทะเบียนเข้าร่วมงาน ${event.name} ${event.dateRangeLabel} ณ ${event.venue}`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th">
      <body>
        <KeyboardFocus />
        {children}
      </body>
    </html>
  );
}
