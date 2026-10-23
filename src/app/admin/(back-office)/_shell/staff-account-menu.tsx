import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentStaff } from "@/lib/auth/session";
import { StaffAccountDropdown } from "./staff-account-dropdown";

/**
 * The signed-in Staff member at the foot of the sidebar, with change password and sign-out. Reads
 * the session, so render it below a <Suspense> boundary (`StaffAccountMenuSkeleton` is the fallback).
 */
export async function StaffAccountMenu() {
  const staff = await getCurrentStaff();
  if (!staff) return null;
  return <StaffAccountDropdown account={staff} />;
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
