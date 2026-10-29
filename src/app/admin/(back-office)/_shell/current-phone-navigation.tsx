import { getStaffForOwnAccount } from "@/lib/auth/session";
import { PhoneNavigation } from "./phone-navigation";

/** Request-time session read, below Suspense; the browser receives only navigation/menu fields. */
export async function CurrentPhoneNavigation() {
  const staff = await getStaffForOwnAccount();
  if (!staff) return null;
  return (
    <PhoneNavigation
      kind={staff.mustChangePassword ? null : staff.kind}
      account={{ name: staff.name, email: staff.email }}
    />
  );
}
