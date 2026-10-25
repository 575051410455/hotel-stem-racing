import { getCurrentStaff } from "@/lib/auth/session";
import { BackOfficeNav } from "./back-office-nav";

/**
 * The page links the signed-in Account may open: everything for an Admin Account, the check-in desk
 * for a Staff Account, and none while the Account must choose its own password (each page would
 * send it back to My Account, which the account menu links to). Reads the session, so render it
 * below a <Suspense> boundary with `<BackOfficeNav kind={null} />` as the fallback.
 */
export async function CurrentBackOfficeNav() {
  const staff = await getCurrentStaff();
  return <BackOfficeNav kind={staff?.kind ?? null} />;
}
