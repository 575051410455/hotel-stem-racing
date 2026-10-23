import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { OverviewSection } from "./_overview/overview-section";
import { PageContent, PageHeader, PageTitle } from "./_shell/page-header";
import { RegistrationDeletedNotice } from "./_registration-list/registration-deleted-notice";
import { RegistrationListSection } from "./_registration-list/registration-list-section";

// /admin: the overview (cards, role table, daily chart; redesign 02–03) and the Registration list (11). Each
// section checks the session itself.
export default function BackOfficeHomePage() {
  return (
    <>
      <PageHeader>
        <PageTitle>ผู้ลงทะเบียน</PageTitle>
      </PageHeader>
      <PageContent>
        <OverviewSection />
        {/* After the overview, not first: a boundary that resolves to nothing would shift the page. */}
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
