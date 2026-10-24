import Link from "next/link";
import type { ReactNode } from "react";
import { SIGN_IN_PATH } from "@/lib/auth/access";

// What the Back Office forms (My Account, the Accounts pages) say about a request itself, above their
// buttons, rather than about a field.

/** The session ended while the form was open. */
export function SessionExpired() {
  return (
    <>
      Session expired.{" "}
      <Link href={SIGN_IN_PATH} className="font-medium underline underline-offset-4">
        Sign in again
      </Link>
    </>
  );
}

export const CANT_REACH_SERVER = "Can't reach the server. Check your internet connection and try again.";

/** A form's message above its button. Always rendered, even empty, so screen readers announce each new message. */
export function FormAlert({ children }: { children: ReactNode }) {
  return <p role="alert" className="text-sm leading-normal text-destructive">{children}</p>;
}
