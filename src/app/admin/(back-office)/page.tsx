import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { PageContent, PageHeader, PageTitle } from "./_shell/page-header";
import { RegistrationDeletedNotice } from "./_registration-list/registration-deleted-notice";
import { RegistrationListSection } from "./_registration-list/registration-list-section";
import { CountsPanel } from "./counts-panel";

// /admin: counts (12) and the Registration list (11). Each section checks the session itself.
export default function BackOfficeHomePage() {
  return (
    <>
      <PageHeader>
        <PageTitle>ผู้ลงทะเบียน</PageTitle>
      </PageHeader>
      <PageContent>
        <CountsPanel />
        {/* After the counts, not first: a boundary that resolves to nothing would shift the page. */}
        <Suspense fallback={null}>
          <StaffOnlyDeletedNotice />
        </Suspense>
        <RegistrationListSection />
      </PageContent>
    </>
  );
}

async function StaffOnlyDeletedNotice() {
  await requireStaff();
  return <RegistrationDeletedNotice />;
}
