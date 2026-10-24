"use client";

import { type FormEvent, type ReactNode, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ENGLISH_NAME_MESSAGE, MAX_NAME_LENGTH, nameProblem } from "@/lib/auth/name-rules";
import { CANT_REACH_SERVER, FormAlert, SessionExpired } from "../_shell/form-messages";
import { updateNameToast } from "../_shell/name-toast";
import { toastSuccess } from "../_shell/toasts";
import { type RenameOwnAccountResult, renameOwnAccount } from "./actions";

const EMPTY = "Please enter your name";
const TOO_LONG = `Your name can be at most ${MAX_NAME_LENGTH} characters`;

/** What went wrong: next to the field, or (`form`) for the whole form, above the button. */
type Problems = { name?: string; form?: ReactNode };

/**
 * Checked in the browser so Staff can fix it without a request; the Accounts module enforces the
 * same rules. Like the module, a name saved unchanged isn't checked, so an old name in Thai can stay.
 */
function checkInput(name: string, savedName: string): Problems {
  if (name === savedName) return {};
  switch (nameProblem(name)) {
    case "empty":
      return { name: EMPTY };
    case "too-long":
      return { name: TOO_LONG };
    case "not-english":
      return { name: ENGLISH_NAME_MESSAGE };
    case null:
      return {};
  }
}

function resultProblems(result: RenameOwnAccountResult | null): Problems {
  switch (result?.status) {
    case "renamed":
      return {};
    case "invalid-name":
      return { name: EMPTY };
    case "name-too-long":
      return { name: TOO_LONG };
    case "name-not-english":
      return { name: ENGLISH_NAME_MESSAGE };
    case "signed-out":
      return { form: <SessionExpired /> };
    case undefined:
      return { form: CANT_REACH_SERVER };
    default:
      // not-allowed or not-found: a Kiosk Account never reaches this page, so only a race lands here.
      return { form: "Couldn't save your name. Please try again." };
  }
}

/**
 * The signed-in Staff member's display name, which they may change themselves (My Account). It goes
 * through a Server Action to the Accounts module; Better Auth's own rename endpoint is refused.
 */
export function RenameForm({ name }: { name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ids = { form: useId() };
  const [problems, setProblems] = useState<Problems>({});
  const [pending, setPending] = useState(false);
  const errorId = `${ids.form}-name-error`;
  const hintId = `${ids.form}-name-hint`;

  function showProblems(found: Problems) {
    setProblems(found);
    updateNameToast(found.name);
    if (found.name) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const typed = String(new FormData(formEvent.currentTarget).get("name") ?? "").trim();

    const inputProblems = checkInput(typed, name);
    if (Object.keys(inputProblems).length > 0) return showProblems(inputProblems);

    setPending(true);
    setProblems({});
    let result: RenameOwnAccountResult | null = null;
    try {
      result = await renameOwnAccount(typed);
    } catch {
      result = null;
    }
    setPending(false);

    if (result?.status === "renamed") {
      if (inputRef.current) inputRef.current.value = result.name;
      updateNameToast(undefined);
      toastSuccess("Name saved");
      return;
    }
    showProblems(resultProblems(result));
  }

  return (
    // method="dialog": a submit before hydration does nothing, rather than a GET to this page.
    <form method="dialog" onSubmit={handleSubmit} noValidate className="w-full max-w-sm">
      <FieldGroup>
        <Field data-invalid={problems.name ? true : undefined}>
          <FieldLabel htmlFor={`${ids.form}-name`}>Name</FieldLabel>
          <Input
            ref={inputRef}
            id={`${ids.form}-name`}
            name="name"
            type="text"
            autoComplete="name"
            required
            defaultValue={name}
            aria-invalid={problems.name ? true : undefined}
            aria-describedby={problems.name ? `${hintId} ${errorId}` : hintId}
          />
          <FieldDescription id={hintId}>In English</FieldDescription>
          <FieldError id={errorId}>{problems.name}</FieldError>
        </Field>
        <Field>
          <FormAlert>{problems.form}</FormAlert>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save name"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
