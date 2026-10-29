"use client";

import { LogOutIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { signOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { type AccountKind, MY_ACCOUNT_PATH } from "@/lib/auth/access";
import { cn } from "@/lib/utils";
import { backOfficeDestinations, isCurrentDestination } from "./back-office-destinations";
import { usePhoneNavigation } from "./phone-navigation-layout";
import { AccountSummary, type SignedInAccount } from "./staff-account-dropdown";

type PhoneNavigationProps = { kind: AccountKind | null; account: SignedInAccount };

export function PhoneNavigation(props: PhoneNavigationProps) {
  const { isPhone } = usePhoneNavigation();
  return isPhone ? <Suspense fallback={null}><PhoneNavigationContents {...props} /></Suspense> : null;
}

const iconButton = "flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-transparent text-neutral-700 outline-offset-2 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700 min-[360px]:size-12";
const activeIcon = "border-blue-800 bg-blue-700 text-white hover:bg-blue-800";

function PhoneNavigationContents({ kind, account }: PhoneNavigationProps) {
  const pathname = usePathname();
  const { keyboardOpen } = usePhoneNavigation();
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const items = backOfficeDestinations(kind);

  return (
    <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
      <nav aria-label="Back Office bottom navigation" className="back-office-bottom-nav max-[359px]:gap-0.5" hidden={keyboardOpen}>
        {items.map((item) => {
          const current = isCurrentDestination(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={current ? "page" : undefined}
              className={cn(iconButton, current && activeIcon)}
            >
              <Icon aria-hidden="true" className="size-6" />
            </Link>
          );
        })}
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Account"
            title="Account"
            aria-current={pathname === MY_ACCOUNT_PATH ? "page" : undefined}
            className={cn(iconButton, (accountOpen || pathname === MY_ACCOUNT_PATH) && activeIcon)}
          >
            <UserRoundIcon aria-hidden="true" className="size-6" />
          </button>
        </SheetTrigger>
      </nav>
      <SheetContent
        side="bottom"
        className="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain rounded-t-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [&>div]:shrink-0"
      >
        <SheetHeader className="px-0 pr-8">
          <SheetTitle>Account menu</SheetTitle>
          <SheetDescription>Manage your Account or sign out.</SheetDescription>
        </SheetHeader>
        <div className="flex min-w-0 items-center gap-3 rounded-xl bg-muted p-3">
          <AccountSummary account={account} />
        </div>
        <div className="grid gap-2">
          <SheetClose asChild>
            <Button asChild variant="outline" className="min-h-12 justify-start">
              <Link href={MY_ACCOUNT_PATH}><UserRoundIcon aria-hidden="true" />My Account</Link>
            </Button>
          </SheetClose>
          <Button
            type="button"
            variant="outline"
            className="min-h-12 justify-start"
            disabled={signingOut}
            onClick={() => startSignOut(() => signOut())}
          >
            <LogOutIcon aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
