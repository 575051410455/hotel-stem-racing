import { getCurrentStaff } from "@/lib/auth/session";
import { BackOfficeNav } from "./back-office-nav";

/**
 * The page links the signed-in Account may open: everything for an Admin Account, the check-in desk
 * for a Staff Account. Reads the session, so render it below a <Suspense> boundary with
 * `<BackOfficeNav kind={null} />` as the fallback.
 */
export async function CurrentBackOfficeNav() {
  const staff = await getCurrentStaff();
  return <BackOfficeNav kind={staff?.kind ?? null} />;
}
