"use client";

import { type MouseEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CANT_REACH_SERVER, SessionExpired } from "../../_shell/form-messages";
import { toastError, toastSuccess } from "../../_shell/toasts";
import {
  type DisableAccountActionResult,
  type EnableAccountActionResult,
  disableAccount,
  enableAccount,
} from "./actions";

/** Why disabling or enabling didn't happen. */
function refusalMessage(result: DisableAccountActionResult | EnableAccountActionResult | null): ReactNode {
  switch (result?.status) {
    case "last-enabled-admin":
      return "This is the last enabled Admin Account, so it stays enabled. Make another Account an Admin first.";
    case "own-account":
      // The Admin's own page has neither button, so only a stale page lands here.
      return "You can't disable or enable your own Account.";
    case "not-found":
      // Accounts are never deleted, so only a wrong link lands here.
      return "Couldn't find this Account. Reload the page and try again.";
    case "signed-out":
      return <SessionExpired />;
    default:
      return CANT_REACH_SERVER;
  }
}

/**
 * "Disable Account" or "Enable Account" on an Account's page, by its `status`; not on the Admin's
 * own Account. Disabling asks first, in a dialog that names the Account; enabling acts at once, so
 * undoing a mistaken disable is one click. The Server Actions read the page again, which then shows
 * the other button in the same place, with the focus on it. `describedBy` is the section's line
 * about what the button does.
 */
export function AccountAccess({
  account,
  status,
  describedBy,
}: {
  account: { id: string; name: string; email: string };
  status: "enabled" | "disabled";
  describedBy: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusAfterChange = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // The button that replaced the one just used takes the focus, so it isn't lost with the old one.
  useEffect(() => {
    if (!focusAfterChange.current) return;
    focusAfterChange.current = false;
    buttonRef.current?.focus();
  }, [status]);

  // Next keeps this page alive, hidden, after navigating away (Activity): come back to a closed dialog.
  useLayoutEffect(
    () => () => {
      setOpen(false);
      setPending(false);
    },
    [],
  );

  async function handleDisable(event: MouseEvent<HTMLButtonElement>) {
    // Keeps the dialog open, its buttons disabled, while the request runs; it closes below.
    event.preventDefault();
    setPending(true);
    let result: DisableAccountActionResult | null = null;
    try {
      result = await disableAccount(account.id);
    } catch {
      result = null;
    }
    setPending(false);
    setOpen(false);

    if (result?.status === "disabled") {
      focusAfterChange.current = true;
      return toastSuccess("Account disabled");
    }
    toastError(refusalMessage(result));
  }

  async function handleEnable() {
    setPending(true);
    let result: EnableAccountActionResult | null = null;
    try {
      result = await enableAccount(account.id);
    } catch {
      result = null;
    }
    setPending(false);

    if (result?.status === "enabled") {
      focusAfterChange.current = true;
      return toastSuccess("Account enabled");
    }
    toastError(refusalMessage(result));
  }

  if (status === "disabled") {
    return (
      <Button ref={buttonRef} type="button" disabled={pending} aria-describedby={describedBy} onClick={handleEnable}>
        {pending ? "Enabling…" : "Enable Account"}
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button
          ref={buttonRef}
          type="button"
          variant="outline"
          aria-describedby={describedBy}
          className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          Disable Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disable this Account?</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            <span className="font-medium text-foreground">{account.name}</span> ({account.email}) is signed out
            everywhere at once and can&apos;t sign in until an Admin enables the Account again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={handleDisable}>
            {pending ? "Disabling…" : "Disable Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
