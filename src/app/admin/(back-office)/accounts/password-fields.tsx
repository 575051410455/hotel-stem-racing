"use client";

import { CopyIcon, EyeIcon, EyeOffIcon, KeyRoundIcon } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";
import { randomPassword } from "@/lib/auth/random-password";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "../_shell/toasts";

type FieldName = "password" | "confirmation";

/**
 * Password and Confirm, for a password an Admin sets for someone else: on New Account and under
 * "Set a new password" on an Account's page (account-management ticket 12). The inputs are named
 * `password` and `confirmation`, inside the form that reads and checks them.
 *
 * - **Generate** fills both with `randomPassword()` (in the browser) and shows them.
 * - **Copy** puts the password on the clipboard, for a message to its owner.
 * - **Show / hide:** typed passwords are hidden to begin with; one toggle shows or hides both.
 *
 * Resetting the form (after saving, or when Next hides the page) empties both and hides them again.
 */
export function PasswordFields({
  labels,
  problems,
  onGenerate,
  pending,
}: {
  labels: Record<FieldName, string>;
  /** Messages under each field, from the form's checks or the server. */
  problems: Partial<Record<FieldName, string>>;
  /** Both fields now hold the same strong password, so the form can drop their messages. */
  onGenerate: () => void;
  /** Keep the displayed and copied password in step with the value already sent to the server. */
  pending: boolean;
}) {
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const ids = { password: useId(), confirmation: useId(), hint: useId() };
  const [shown, setShown] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // The form resets after a save and when Next hides the page (Activity): a generated or shown
  // password is hidden again, and the next one typed starts hidden.
  useLayoutEffect(() => {
    const form = passwordRef.current?.form;
    function hideAgain() {
      setShown(false);
      setHasPassword(false);
      setAnnouncement("");
    }
    form?.addEventListener("reset", hideAgain);
    return () => {
      form?.removeEventListener("reset", hideAgain);
      hideAgain();
    };
  }, []);

  function generate() {
    const password = randomPassword();
    for (const input of [passwordRef.current, confirmationRef.current]) {
      if (input) input.value = password;
    }
    setShown(true);
    setHasPassword(true);
    setAnnouncement("Password generated. It's shown in both fields.");
    onGenerate();
  }

  async function copy() {
    const password = passwordRef.current?.value;
    if (!password) return;
    try {
      // Called straight from the click, so Safari on an iPad allows it.
      await navigator.clipboard.writeText(password);
      toastSuccess("Password copied");
    } catch {
      // No clipboard (an insecure origin, or permission refused): show it, so it can be selected and
      // copied by hand. A hidden password can't be.
      setShown(true);
      toastError("Couldn't copy the password. Select it and copy it yourself.");
    }
  }

  function inputProps(name: FieldName, describedBy?: string) {
    const problem = problems[name];
    return {
      id: ids[name],
      name,
      type: shown ? "text" : "password",
      autoComplete: "new-password",
      // Shown as text, the keyboard mustn't capitalise or correct it.
      autoCapitalize: "none",
      autoCorrect: "off",
      spellCheck: false,
      required: true,
      className: cn(shown && "font-mono"),
      "aria-invalid": problem ? true : undefined,
      "aria-describedby": [describedBy, problem && `${ids[name]}-error`].filter(Boolean).join(" ") || undefined,
    } as const;
  }

  function fieldError(name: FieldName) {
    return <FieldError id={`${ids[name]}-error`}>{problems[name]}</FieldError>;
  }

  return (
    <>
      <Field data-invalid={problems.password ? true : undefined}>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor={ids.password}>{labels.password}</FieldLabel>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={generate}>
            <KeyRoundIcon aria-hidden="true" />
            Generate password
          </Button>
          <p role="status" className="sr-only">
            {announcement}
          </p>
        </div>
        <InputGroup>
          <InputGroupInput
            ref={passwordRef}
            {...inputProps("password", ids.hint)}
            disabled={pending}
            onChange={(event) => setHasPassword(event.currentTarget.value !== "")}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-sm"
              aria-label={shown ? "Hide password" : "Show password"}
              aria-controls={`${ids.password} ${ids.confirmation}`}
              disabled={pending}
              onClick={() => setShown((wasShown) => !wasShown)}
            >
              {shown ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
            </InputGroupButton>
            <InputGroupButton size="icon-sm" aria-label="Copy password" disabled={pending || !hasPassword} onClick={copy}>
              <CopyIcon aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription id={ids.hint}>
          {MIN_PASSWORD_LENGTH} to {MAX_PASSWORD_LENGTH} characters
        </FieldDescription>
        {fieldError("password")}
      </Field>
      <Field data-invalid={problems.confirmation ? true : undefined}>
        <FieldLabel htmlFor={ids.confirmation}>{labels.confirmation}</FieldLabel>
        <Input ref={confirmationRef} {...inputProps("confirmation")} disabled={pending} />
        {fieldError("confirmation")}
      </Field>
    </>
  );
}
