import { Button } from "@/components/ui/button";
import { getCurrentStaff } from "@/lib/auth/session";
import { signOut } from "../actions";

/** Signed-in Staff name and sign-out. Reads the session, so render it below a <Suspense> boundary. */
export async function StaffMenu() {
  const staff = await getCurrentStaff();
  if (!staff) return null;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <p className="min-w-0 truncate text-sm leading-normal">
        <span className="sr-only">เข้าสู่ระบบในชื่อ </span>
        {staff.name}
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          ออกจากระบบ
        </Button>
      </form>
    </div>
  );
}
