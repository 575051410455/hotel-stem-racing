import { Skeleton } from "@/components/ui/skeleton";
import { getStaffForOwnAccount } from "@/lib/auth/session";
import { StaffAccountDropdown } from "./staff-account-dropdown";

/**
 * The signed-in Staff member at the foot of the sidebar, with My Account and sign-out. Shown too
 * while the Account must choose its own password, so its owner can still sign out. Reads the
 * session, so render it below a <Suspense> boundary (`StaffAccountMenuSkeleton` is the fallback).
 */
export async function StaffAccountMenu() {
  const staff = await getStaffForOwnAccount();
  if (!staff) return null;
  // Only what the menu shows: the rest of the Account (its id, its session's id) stays on the server.
  return <StaffAccountDropdown account={{ name: staff.name, email: staff.email }} />;
}

/** The menu's outline while the session is read. Fixed widths: random ones can't be prerendered. */
export function StaffAccountMenuSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-12 items-center gap-2 px-2">
      <Skeleton className="size-8 rounded-lg" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  );
}
