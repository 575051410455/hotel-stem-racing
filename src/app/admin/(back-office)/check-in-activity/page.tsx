import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { defaultActivityDay } from "@/lib/registrations/check-in-activity-view";
import { PageContent, PageHeader, PageTitle } from "../_shell/page-header";
import { CheckInActivity } from "./check-in-activity";

export default function CheckInActivityPage() {
  return (
    <>
      <PageHeader>
        <PageTitle>Check-In Activity</PageTitle>
      </PageHeader>
      <PageContent>
        <Suspense fallback={<p role="status">Loading Check-In Activity…</p>}>
          <AdminActivity />
        </Suspense>
      </PageContent>
    </>
  );
}

async function AdminActivity() {
  await requireAdmin();
  return <CheckInActivity defaultDay={defaultActivityDay(new Date())} />;
}
