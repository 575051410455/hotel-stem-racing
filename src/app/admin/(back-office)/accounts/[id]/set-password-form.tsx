"use client";

import { type FormEvent, type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { type AccountKind, canChangeOwnPassword } from "@/lib/auth/access";
import { CANT_REACH_SERVER, FormAlert, SessionExpired } from "../../_shell/form-messages";
import { toastSuccess } from "../../_shell/toasts";
import { PASSWORD_TOO_LONG, PASSWORD_TOO_SHORT, passwordProblems } from "../account-form-rules";
import { PasswordFields } from "../password-fields";
import { type SetAccountPasswordActionResult, setAccountPassword } from "./actions";

type FieldName = "password" | "confirmation";

/** What went wrong: next to a field, or (`form`) for the whole form, above the button. */
type Problems = Partial<Record<FieldName, string>> & { form?: ReactNode };

function resultProblems(result: SetAccountPasswordActionResult | null): Problems {
  switch (result?.status) {
    case "password-set":
      return {};
    case "password-too-short":
      return { password: PASSWORD_TOO_SHORT };
    case "password-too-long":
      return { password: PASSWORD_TOO_LONG };
    case "own-account":
      // The Admin's own page has no such form, so only a stale page lands here.
      return { form: "You can't set your own password here. Change it on My Account." };
    case "not-found":
      // Accounts are never deleted, so only a wrong link lands here.
      return { form: "Couldn't find this Account. Reload the page and try again." };
    case "signed-out":
      return { form: <SessionExpired /> };
    case undefined:
      return { form: CANT_REACH_SERVER };
  }
}

/**
 * "Set a new password" on an Account's page: an Admin types a password twice, or generates one, for
 * someone who forgot theirs. It goes through a Server Action to the Accounts module, which signs the Account out
 * everywhere and records it; then "Password set". A Staff or Admin Account's owner chooses their
 * own at the next sign-in (`kind`, as saved), and the form says so. Not on the Admin's own
 * Account: they change theirs on My Account.
 */
export function SetPasswordForm({ accountId, kind }: { accountId: string; kind: AccountKind }) {
  const formRef = useRef<HTMLFormElement>(null);
  const ids = { warning: useId(), nextSignIn: useId() };
  const [problems, setProblems] = useState<Problems>({});
  const [pending, setPending] = useState(false);
  const ownerChoosesOwn = canChangeOwnPassword(kind);

  // Next keeps this page alive, hidden, after navigating away (Activity). Each visit starts afresh,
  // and no typed password stays behind in the hidden page.
  useLayoutEffect(() => {
    const form = formRef.current;
    return () => {
      form?.reset();
      setProblems({});
      setPending(false);
    };
  }, []);

  /** Puts the cursor in the first field with a problem, its text selected for retyping. */
  function focusFirstProblem(found: Problems) {
    const first = (["password", "confirmation"] as const).find((name) => found[name]);
    const input = first && formRef.current?.elements.namedItem(first);
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }
  }

  function showProblems(found: Problems) {
    setProblems(found);
    focusFirstProblem(found);
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    // Checked in the browser so the Admin can fix them without a request; the Accounts module
    // enforces the same limits. The confirmation only guards against a typo here.
    const inputProblems: Problems = passwordProblems(password, confirmation);
    if (Object.keys(inputProblems).length > 0) return showProblems(inputProblems);

    setPending(true);
    setProblems({});
    let result: SetAccountPasswordActionResult | null = null;
    try {
      result = await setAccountPassword(accountId, password);
    } catch {
      result = null;
    }
    setPending(false);

    if (result?.status === "password-set") {
      formRef.current?.reset();
      toastSuccess("Password set");
      return;
    }
    showProblems(resultProblems(result));
  }

  return (
    // method="dialog" makes a submit before hydration a no-op instead of a GET that would put the
    // password in the URL. Once hydrated, handleSubmit handles everything.
    <form ref={formRef} method="dialog" onSubmit={handleSubmit} noValidate className="w-full max-w-sm">
      <FieldGroup>
        <PasswordFields
          labels={{ password: "New password", confirmation: "Confirm new password" }}
          problems={problems}
          onGenerate={() => setProblems((found) => ({ ...found, password: undefined, confirmation: undefined }))}
        />
        <Field>
          <FieldDescription id={ids.warning}>Setting a password signs this Account out everywhere.</FieldDescription>
          {/* Someone else chose it (the Admin), so a Staff or Admin Account's owner chooses their own. */}
          {ownerChoosesOwn && (
            <FieldDescription id={ids.nextSignIn}>
              They&apos;ll be asked to choose their own password at their next sign-in.
            </FieldDescription>
          )}
          <FormAlert>{problems.form}</FormAlert>
          <Button
            type="submit"
            disabled={pending}
            aria-describedby={ownerChoosesOwn ? `${ids.warning} ${ids.nextSignIn}` : ids.warning}
          >
            {pending ? "Setting password…" : "Set password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
