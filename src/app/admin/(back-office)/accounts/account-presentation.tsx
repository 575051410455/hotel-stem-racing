import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Account } from "@/lib/auth/accounts";
import { accountInitials } from "@/lib/auth/account-initials";
import { KIND_LABELS } from "@/lib/auth/kind-labels";

/** The name beside each Avatar gives its full accessible label; initials are decorative. */
export function AccountAvatar({
  account,
  size = "default",
}: {
  account: Pick<Account, "name" | "email">;
  size?: "default" | "lg";
}) {
  return (
    <Avatar size={size} aria-hidden="true">
      <AvatarFallback className="font-semibold">{accountInitials(account.name, account.email)}</AvatarFallback>
    </Avatar>
  );
}

export function AccountKindBadge({ kind }: { kind: Account["kind"] }) {
  return <Badge variant="secondary">{KIND_LABELS[kind]}</Badge>;
}

export function AccountStatusBadges({ account }: { account: Pick<Account, "disabledAt" | "mustChangePassword"> }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {account.disabledAt ? (
        <Badge variant="secondary">Disabled</Badge>
      ) : (
        <Badge variant="outline" className="border-green-700/40 text-green-800 dark:text-green-400">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-green-700 dark:bg-green-400" />
          Enabled
        </Badge>
      )}
      {account.mustChangePassword && <Badge variant="outline">Must change password</Badge>}
    </span>
  );
}
