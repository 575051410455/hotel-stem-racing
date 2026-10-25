import { ENGLISH_NAME_MESSAGE } from "@/lib/auth/name-rules";
import { dismissToast, toastError } from "./toasts";

// A name that isn't in English is refused with a toast as well as the message under Name (New
// Account, an Account's page, My Account): the one form error that also toasts (spec story 69).

const TOAST_ID = "name-not-english";

/**
 * After a form's check, the browser's or the server's, given the message under Name (if any): shows
 * the toast while the name is refused for not being in English, and closes it once it isn't, so a
 * fixed name doesn't leave it behind. Refused again, it still shows once.
 */
export function updateNameToast(nameMessage: string | undefined) {
  if (nameMessage === ENGLISH_NAME_MESSAGE) toastError(ENGLISH_NAME_MESSAGE, { id: TOAST_ID });
  else dismissToast(TOAST_ID);
}
