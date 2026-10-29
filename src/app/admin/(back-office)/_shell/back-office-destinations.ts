import { type LucideIcon, MailIcon, ScanLineIcon, UsersIcon, UsersRoundIcon } from "lucide-react";
import { type AccountKind, canManageAccounts, canUseBackOffice, canUseCheckInDesk } from "@/lib/auth/access";

export type BackOfficeDestination = {
  href: string;
  label: string;
  icon: LucideIcon;
  may: (kind: AccountKind) => boolean;
  isCurrent?: (pathname: string) => boolean;
};

const destinations: BackOfficeDestination[] = [
  {
    href: "/admin",
    label: "Registrations",
    icon: UsersIcon,
    may: canUseBackOffice,
    isCurrent: (path) => path === "/admin" || path.startsWith("/admin/registrations/"),
  },
  { href: "/admin/check-in", label: "Check-In", icon: ScanLineIcon, may: canUseCheckInDesk },
  { href: "/admin/email", label: "Email", icon: MailIcon, may: canUseBackOffice },
  {
    href: "/admin/accounts",
    label: "Accounts",
    icon: UsersRoundIcon,
    may: canManageAccounts,
    isCurrent: (path) => path === "/admin/accounts" || path.startsWith("/admin/accounts/"),
  },
];

/** One destination and permission definition for both navigation presentations. */
export function backOfficeDestinations(kind: AccountKind | null): BackOfficeDestination[] {
  return kind ? destinations.filter((destination) => destination.may(kind)) : [];
}

export function isCurrentDestination(destination: BackOfficeDestination, pathname: string | null): boolean {
  return pathname !== null && (destination.isCurrent?.(pathname) ?? pathname === destination.href);
}
