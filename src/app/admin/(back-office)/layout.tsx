import Link from "next/link";
import { Suspense } from "react";
import { event } from "@/lib/event";
import { BackOfficeQueryProvider } from "./query-provider";
import { StaffMenu } from "./staff-menu";

// Chrome for every signed-in Back Office page (/admin, and /admin/check-in later). The header is
// static; only the Staff menu reads the session, behind its own boundary. This layout does NOT
// protect anything: each page calls `requireStaff()` (layouts don't re-run on client navigation).
export default function SignedInBackOfficeLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-1">
            <p className="min-w-0 text-sm leading-normal font-semibold">
              ระบบหลังบ้าน{" "}
              <span className="font-normal text-muted-foreground">{event.name}</span>
            </p>
            <nav aria-label="เมนูระบบหลังบ้าน" className="flex gap-4 text-sm leading-normal font-medium">
              <Link href="/admin" className="underline underline-offset-4">
                ผู้ลงทะเบียน
              </Link>
              <Link href="/admin/check-in" className="underline underline-offset-4">
                เช็คอิน
              </Link>
              <Link href="/admin/email" className="underline underline-offset-4">
                ส่งอีเมล
              </Link>
            </nav>
          </div>
          <Suspense fallback={null}>
            <StaffMenu />
          </Suspense>
        </div>
      </header>
      <BackOfficeQueryProvider>{children}</BackOfficeQueryProvider>
    </>
  );
}
