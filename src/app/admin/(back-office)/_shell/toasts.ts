import { type ReactNode, useEffect } from "react";
import { type ExternalToast, toast } from "sonner";

// Back Office action feedback (spec "Toasts"): the results of resending an Event Pass email, of a
// bulk send, of a delete and of changing a password, shown by the Toaster the Back Office layout
// mounts. Check-In results, form validation errors and the list's load errors stay on the page,
// never in a toast; the one exception is a name that isn't in English (name-toast.ts).

/** About as long as it takes to read a short line; success needs no action. */
const SUCCESS_MS = 4_000;

type ToastOptions = Pick<ExternalToast, "id" | "description" | "action">;

/** How many Kiosk mode screens are up (see useNoToasts); while any is, toasts are dropped. */
let suppressors = 0;

/** Something Staff did worked. Closes by itself. */
export function toastSuccess(title: ReactNode, options?: ToastOptions) {
  if (suppressors > 0) return;
  toast.success(title, { ...options, duration: SUCCESS_MS });
}

/** News that needs no action, such as a bulk send Staff stopped. Closes by itself. */
export function toastInfo(title: ReactNode, options?: ToastOptions) {
  if (suppressors > 0) return;
  toast.info(title, { ...options, duration: SUCCESS_MS });
}

/** Something didn't work. Stays until Staff close it, so it can't be missed. */
export function toastError(title: ReactNode, options?: ToastOptions) {
  if (suppressors > 0) return;
  toast.error(title, { ...options, duration: Infinity, closeButton: true });
}

/** Closes the toast shown with this `id`, if it is still up. */
export function dismissToast(id: string) {
  toast.dismiss(id);
}

/**
 * While `active`, no toast shows: it dismisses every open toast, and drops new ones (say a resend
 * that finishes meanwhile) until it ends. For Kiosk mode at the check-in desk, which Attendees see:
 * it covers the Back Office, but the Toaster sits above it.
 */
export function useNoToasts(active: boolean) {
  useEffect(() => {
    if (!active) return;
    toast.dismiss();
    suppressors += 1;
    return () => {
      suppressors -= 1;
    };
  }, [active]);
}
