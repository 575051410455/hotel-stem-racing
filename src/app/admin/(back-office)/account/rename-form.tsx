"use client";

import { type FormEvent, type ReactNode, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_NAME_LENGTH } from "@/lib/auth/name-rules";
import { CANT_REACH_SERVER, FormAlert, SessionExpired } from "../_shell/form-messages";
import { toastSuccess } from "../_shell/toasts";
import { type RenameOwnAccountResult, renameOwnAccount } from "./actions";

const EMPTY = "Please enter your name";
const TOO_LONG = `Your name can be at most ${MAX_NAME_LENGTH} characters`;

/** What went wrong: next to the field, or (`form`) for the whole form, above the button. */
type Problems = { name?: string; form?: ReactNode };

/** Checked in the browser so Staff can fix it without a request; the Accounts module enforces the same rules. */
function checkInput(name: string): Problems {
  if (!name) return { name: EMPTY };
  if (name.length > MAX_NAME_LENGTH) return { name: TOO_LONG };
  return {};
}

function resultProblems(result: RenameOwnAccountResult | null): Problems {
  switch (result?.status) {
    case "renamed":
      return {};
    case "invalid-name":
      return { name: EMPTY };
    case "name-too-long":
      return { name: TOO_LONG };
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

  function showProblems(found: Problems) {
    setProblems(found);
    if (found.name) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const typed = String(new FormData(formEvent.currentTarget).get("name") ?? "").trim();

    const inputProblems = checkInput(typed);
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
            aria-describedby={problems.name ? errorId : undefined}
          />
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
