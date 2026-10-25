"use client";

import { type MouseEvent, useState } from "react";
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
import { CANT_REACH_SERVER, SessionExpired } from "../_shell/form-messages";
import { toastError, toastInfo, toastSuccess } from "../_shell/toasts";
import {
  type SignOutDeviceActionResult,
  type SignOutOtherDevicesActionResult,
  signOutDevice,
  signOutOtherDevices,
} from "./actions";

// The sign-out buttons of My Account's Signed-in devices. The Server Actions read Signed-in devices
// again, so a device that is signed out leaves the list; these only show how it went.

/**
 * "Sign out" on one of the owner's other devices: no confirmation, since it's easy to sign in
 * again. Sends only the device's id. `describedBy` names the row it belongs to for screen readers.
 */
export function SignOutDeviceButton({ deviceId, describedBy }: { deviceId: string; describedBy: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    let result: SignOutDeviceActionResult | null = null;
    try {
      result = await signOutDevice(deviceId);
    } catch {
      result = null;
    }
    setPending(false);

    switch (result?.status) {
      case "device-signed-out":
        return toastSuccess("Signed out of that device");
      case "not-found":
        // Signed out meanwhile: by itself, from another device, or its sign-in ran out.
        return toastInfo("That device is already signed out");
      case "signed-out":
        return toastError(<SessionExpired />);
      default:
        return toastError(CANT_REACH_SERVER);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      aria-describedby={describedBy}
      onClick={handleClick}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

/**
 * "Sign out all other devices", behind a confirmation. The dialog stays open, its buttons disabled,
 * until the devices are signed out. Render it only when there is another device.
 */
export function SignOutOtherDevicesButton() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    // Keeps the dialog open while the request runs; it closes below.
    event.preventDefault();
    setPending(true);
    let result: SignOutOtherDevicesActionResult | null = null;
    try {
      result = await signOutOtherDevices();
    } catch {
      result = null;
    }
    setPending(false);
    setOpen(false);

    switch (result?.status) {
      case "other-devices-signed-out":
        return toastSuccess("Signed out of your other devices");
      case "signed-out":
        return toastError(<SessionExpired />);
      default:
        return toastError(CANT_REACH_SERVER);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline">
          Sign out all other devices
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out all other devices?</AlertDialogTitle>
          <AlertDialogDescription>
            Every other device signed in to your Account is signed out. This one stays signed in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={handleConfirm}>
            {pending ? "Signing out…" : "Sign out other devices"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
