import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { RegistrationDeletedToast } from "./registration-deleted-toast";
import { RegistrationList } from "./registration-list";

/**
 * The Registration list on /admin. The heading is part of the static shell; the list (with the
 * toast after a delete) is Staff-only and reads the URL, so it renders at request time behind its
 * own boundary.
 */
export function RegistrationListSection() {
  return (
    <section aria-labelledby="registration-list-heading" className="mt-10">
      <h2 id="registration-list-heading" className="text-lg leading-normal font-semibold">
        รายการลงทะเบียน
      </h2>
      <Suspense
        fallback={
          <p role="status" className="mt-4 text-sm leading-normal text-muted-foreground">
            กำลังโหลดรายการลงทะเบียน…
          </p>
        }
      >
        <StaffOnlyRegistrationList />
      </Suspense>
    </section>
  );
}

async function StaffOnlyRegistrationList() {
  // The rows come from a Staff-only endpoint; this keeps the controls from signed-out visitors too.
  await requireStaff();
  return (
    <>
      <RegistrationDeletedToast />
      <RegistrationList />
    </>
  );
}
