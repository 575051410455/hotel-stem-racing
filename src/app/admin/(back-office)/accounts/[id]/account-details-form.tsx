"use client";

import { type FormEvent, type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type AccountKind, isAccountKind } from "@/lib/auth/access";
import { KIND_LABELS } from "@/lib/auth/kind-labels";
import { CANT_REACH_SERVER, FormAlert, SessionExpired } from "../../_shell/form-messages";
import { toastSuccess } from "../../_shell/toasts";
import {
  EMAIL_INVALID,
  EMAIL_TAKEN,
  emailProblems,
  KIND_CHOICES,
  KIND_INVALID,
  NAME_EMPTY,
  NAME_TOO_LONG,
  nameProblems,
} from "../account-form-rules";
import { type UpdateAccountActionResult, updateAccount } from "./actions";

type FieldName = "name" | "email" | "kind";

/** What went wrong: next to a field, or (`form`) for the whole form, above the button. */
type Problems = Partial<Record<FieldName, string>> & { form?: ReactNode };

const OWN_KIND = "You can't change your own kind.";

function resultProblems(result: UpdateAccountActionResult | null): Problems {
  switch (result?.status) {
    case "updated":
      return {};
    case "invalid-name":
      return { name: NAME_EMPTY };
    case "name-too-long":
      return { name: NAME_TOO_LONG };
    case "invalid-email":
      return { email: EMAIL_INVALID };
    case "email-taken":
      return { email: EMAIL_TAKEN };
    case "own-kind":
      // The kind is locked on the Admin's own page, so only a stale page lands here.
      return { kind: OWN_KIND };
    case "last-enabled-admin":
      return { kind: "This is the last enabled Admin Account, so it stays an Admin. Make another Account an Admin first." };
    case "invalid-kind":
      return { kind: KIND_INVALID };
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
 * An Admin changes an Account's name, email and kind, on its page. It goes through a Server Action
 * to the Accounts module, which saves and records only what changed; then "Account updated". A kind
 * change signs the Account out everywhere, and the form says so. On the Admin's own Account the
 * kind is locked. Give it a `key` of the saved values, so it starts again from them once they
 * change (after a save, or someone else's).
 */
export function AccountDetailsForm({
  account,
  isOwnAccount,
}: {
  account: { id: string; name: string; email: string; kind: AccountKind };
  isOwnAccount: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const ids = { form: useId(), kindNote: useId() };
  const [kind, setKind] = useState<AccountKind>(account.kind);
  const [problems, setProblems] = useState<Problems>({});
  const [pending, setPending] = useState(false);

  // Next keeps this page alive, hidden, after navigating away (Activity). Each visit starts again
  // from the saved values, without what was typed and not saved.
  useLayoutEffect(() => {
    const form = formRef.current;
    const savedKind = account.kind;
    return () => {
      form?.reset();
      setKind(savedKind);
      setProblems({});
      setPending(false);
    };
  }, [account.kind]);

  /** Puts the cursor in the first field with a problem, its text selected for retyping. */
  function focusFirstProblem(found: Problems) {
    const first = (["name", "email", "kind"] as const).find((name) => found[name]);
    if (first === "kind") {
      formRef.current?.querySelector<HTMLButtonElement>('[role="radio"][data-state="checked"]')?.focus();
      return;
    }
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
    const typed = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
    };

    // Checked in the browser so the Admin can fix them without a request; the Accounts module
    // enforces the same rules.
    const inputProblems: Problems = { ...nameProblems(typed.name), ...emailProblems(typed.email) };
    if (Object.keys(inputProblems).length > 0) return showProblems(inputProblems);

    setPending(true);
    setProblems({});
    let result: UpdateAccountActionResult | null = null;
    try {
      result = await updateAccount(account.id, { ...typed, kind });
    } catch {
      result = null;
    }
    setPending(false);

    if (result?.status === "updated") {
      // As saved: trimmed, and the email in lower case.
      const fields = formRef.current?.elements;
      const nameInput = fields?.namedItem("name");
      const emailInput = fields?.namedItem("email");
      if (nameInput instanceof HTMLInputElement) nameInput.value = result.account.name;
      if (emailInput instanceof HTMLInputElement) emailInput.value = result.account.email;
      toastSuccess("Account updated");
      return;
    }
    showProblems(resultProblems(result));
  }

  function fieldProps(name: Exclude<FieldName, "kind">) {
    const problem = problems[name];
    const errorId = `${ids.form}-${name}-error`;
    return {
      id: `${ids.form}-${name}`,
      name,
      required: true,
      "aria-invalid": problem ? true : undefined,
      "aria-describedby": problem ? errorId : undefined,
    } as const;
  }

  function fieldError(name: FieldName) {
    return <FieldError id={`${ids.form}-${name}-error`}>{problems[name]}</FieldError>;
  }

  return (
    // method="dialog": a submit before hydration does nothing, rather than a GET to this page.
    <form ref={formRef} method="dialog" onSubmit={handleSubmit} noValidate className="w-full max-w-sm">
      <FieldGroup>
        <Field data-invalid={problems.name ? true : undefined}>
          <FieldLabel htmlFor={`${ids.form}-name`}>Name</FieldLabel>
          <Input {...fieldProps("name")} type="text" autoComplete="off" defaultValue={account.name} />
          {fieldError("name")}
        </Field>
        <Field data-invalid={problems.email ? true : undefined}>
          <FieldLabel htmlFor={`${ids.form}-email`}>Email</FieldLabel>
          <Input
            {...fieldProps("email")}
            type="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={account.email}
          />
          {fieldError("email")}
        </Field>
        <FieldSet>
          <FieldLegend variant="label">Kind</FieldLegend>
          <RadioGroup
            name="kind"
            value={kind}
            onValueChange={(value) => {
              if (isAccountKind(value)) setKind(value);
            }}
            disabled={isOwnAccount}
            aria-invalid={problems.kind ? true : undefined}
            aria-describedby={[ids.kindNote, problems.kind && `${ids.form}-kind-error`].filter(Boolean).join(" ")}
          >
            {KIND_CHOICES.map(({ kind: choice, explanation }) => (
              <Field key={choice} orientation="horizontal" data-disabled={isOwnAccount ? true : undefined}>
                <RadioGroupItem
                  value={choice}
                  id={`${ids.form}-kind-${choice}`}
                  aria-describedby={`${ids.form}-kind-${choice}-explanation`}
                />
                <FieldContent>
                  <FieldLabel htmlFor={`${ids.form}-kind-${choice}`}>{KIND_LABELS[choice]}</FieldLabel>
                  <FieldDescription id={`${ids.form}-kind-${choice}-explanation`}>{explanation}</FieldDescription>
                </FieldContent>
              </Field>
            ))}
          </RadioGroup>
          <FieldDescription id={ids.kindNote}>
            {isOwnAccount ? OWN_KIND : "Changing the kind signs this Account out everywhere."}
          </FieldDescription>
          {fieldError("kind")}
        </FieldSet>
        <Field>
          <FormAlert>{problems.form}</FormAlert>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
