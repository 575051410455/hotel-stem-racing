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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <p className="min-w-0 text-sm leading-normal font-semibold">
            ระบบหลังบ้าน{" "}
            <span className="font-normal text-muted-foreground">{event.name}</span>
          </p>
          <Suspense fallback={null}>
            <StaffMenu />
          </Suspense>
        </div>
      </header>
      <BackOfficeQueryProvider>{children}</BackOfficeQueryProvider>
    </>
  );
}
