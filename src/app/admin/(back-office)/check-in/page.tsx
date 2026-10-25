import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { eventDayOn } from "@/lib/registrations/event-day-availability";
import { PageContent, PageHeader, PageTitle } from "../_shell/page-header";
import { CheckInDesk } from "./check-in-desk";

export const metadata: Metadata = { title: "Check-In" };

// Check-In at the entrance. The header is the static shell; the desk is Staff-only and needs
// today's date, so it renders at request time behind its own boundary.
export default function CheckInPage() {
  return (
    <>
      <PageHeader>
        <PageTitle>Check-In</PageTitle>
      </PageHeader>
      {/* Full width: the desk centres its own card. */}
      <PageContent>
        <Suspense fallback={<p className="text-center text-sm leading-normal text-muted-foreground">Loading…</p>}>
          <CheckInStation />
        </Suspense>
      </PageContent>
    </>
  );
}

async function CheckInStation() {
  await requireStaff();
  // After the session read, so this is request time: today's Event Day in Bangkok, if any.
  return <CheckInDesk today={eventDayOn(new Date())?.date ?? null} />;
}
