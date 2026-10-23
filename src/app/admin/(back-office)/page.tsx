import { PageContent, PageHeader, PageTitle } from "./_shell/page-header";
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
        <RegistrationListSection />
      </PageContent>
    </>
  );
}
