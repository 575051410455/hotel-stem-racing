"use client";

import { EllipsisVerticalIcon, LogOutIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { signOut } from "@/app/admin/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import type { CurrentStaff } from "@/lib/auth/session";

/** Who the menu shows: only what the browser needs from the session. */
export type SignedInAccount = Pick<CurrentStaff, "name" | "email">;

/**
 * The Staff account menu's button and dropdown (My Account, sign out); `StaffAccountMenu` passes in
 * who is signed in.
 */
export function StaffAccountDropdown({ account }: { account: SignedInAccount }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [signingOut, startSignOut] = useTransition();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <span className="sr-only">Signed in as </span>
              <AccountSummary account={account} />
              <EllipsisVerticalIcon aria-hidden="true" className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <AccountSummary account={account} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                {/* On a phone the sidebar is a sheet over the page: close it, as the page links do. */}
                <Link href="/admin/account" onClick={() => setOpenMobile(false)}>
                  <UserRoundIcon aria-hidden="true" />
                  My Account
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* signOut redirects to the sign-in page, so the menu never needs to close itself. */}
            <DropdownMenuItem disabled={signingOut} onSelect={() => startSignOut(() => signOut())}>
              <LogOutIcon aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** A person icon (no initials: a Thai name can start with a leading vowel), the name and the email. */
export function AccountSummary({ account: { name, email } }: { account: SignedInAccount }) {
  return (
    <>
      <Avatar className="size-8 rounded-lg">
        <AvatarFallback className="rounded-lg">
          <UserRoundIcon aria-hidden="true" className="size-4" />
        </AvatarFallback>
      </Avatar>
      <span className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{email}</span>
      </span>
    </>
  );
}
