import { OverviewSection } from "./_overview/overview-section";
import { PageContent, PageHeader, PageTitle } from "./_shell/page-header";
import { RegistrationListSection } from "./_registration-list/registration-list-section";

// /admin: the overview (cards, role table, daily chart; redesign 02–03) and the Registration list
// (11). Each section checks the session itself. A delete's confirmation is a toast (redesign 05),
// fired from the list section.
export default function BackOfficeHomePage() {
  return (
    <>
      <PageHeader>
        <PageTitle>ผู้ลงทะเบียน</PageTitle>
      </PageHeader>
      <PageContent>
        <OverviewSection />
        <RegistrationListSection />
      </PageContent>
    </>
  );
}
