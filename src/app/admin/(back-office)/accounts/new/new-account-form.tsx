"use client";

import { useRouter } from "next/navigation";
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
import { type AccountKind, canChangeOwnPassword, isAccountKind } from "@/lib/auth/access";
import { KIND_LABELS } from "@/lib/auth/kind-labels";
import { CANT_REACH_SERVER, FormAlert, SessionExpired } from "../../_shell/form-messages";
import { updateNameToast } from "../../_shell/name-toast";
import { toastSuccess } from "../../_shell/toasts";
import {
  EMAIL_INVALID,
  EMAIL_TAKEN,
  emailProblems,
  KIND_CHOICES,
  KIND_INVALID,
  NAME_EMPTY,
  NAME_HINT,
  NAME_NOT_ENGLISH,
  NAME_TOO_LONG,
  nameProblems,
  PASSWORD_TOO_LONG,
  PASSWORD_TOO_SHORT,
  passwordProblems,
} from "../account-form-rules";
import { PasswordFields } from "../password-fields";
import { type CreateAccountActionResult, createAccount } from "./actions";

/** Where the Admin goes once the Account is created. */
const ACCOUNTS_PATH = "/admin/accounts";

/** Chosen to begin with: a helper at the entrance is the commonest new Account, and the least a person can be given. */
const FIRST_KIND: AccountKind = "staff";

type FieldName = "name" | "email" | "kind" | "password" | "confirmation";

/** What went wrong: next to a field, or (`form`) for the whole form, above the button. */
type Problems = Partial<Record<FieldName, string>> & { form?: ReactNode };

type Typed = { name: string; email: string; password: string; confirmation: string };

/**
 * Checked in the browser so the Admin can fix them without a request; the Accounts module enforces
 * the same rules, except the confirmation, which only guards against a typo here.
 */
function checkInput({ name, email, password, confirmation }: Typed): Problems {
  return { ...nameProblems(name), ...emailProblems(email), ...passwordProblems(password, confirmation) };
}

function resultProblems(result: CreateAccountActionResult | null): Problems {
  switch (result?.status) {
    case "created":
      return {};
    case "invalid-name":
      return { name: NAME_EMPTY };
    case "name-too-long":
      return { name: NAME_TOO_LONG };
    case "name-not-english":
      return { name: NAME_NOT_ENGLISH };
    case "invalid-email":
      return { email: EMAIL_INVALID };
    case "email-taken":
      return { email: EMAIL_TAKEN };
    case "password-too-short":
      return { password: PASSWORD_TOO_SHORT };
    case "password-too-long":
      return { password: PASSWORD_TOO_LONG };
    case "invalid-kind":
      return { kind: KIND_INVALID };
    case "signed-out":
      return { form: <SessionExpired /> };
    case undefined:
      return { form: CANT_REACH_SERVER };
  }
}

/**
 * An Admin creates an Account of any kind, with a password they type twice or generate, on
 * /admin/accounts/new. It goes through a Server Action to the Accounts module, which records it
 * with the Admin as actor; then "Account created" and back to the list. A Staff or Admin Account's
 * owner chooses their own password at the first sign-in, and the form says so.
 */
export function NewAccountForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const ids = { form: useId(), nameHint: useId(), firstSignIn: useId() };
  const [kind, setKind] = useState<AccountKind>(FIRST_KIND);
  const [problems, setProblems] = useState<Problems>({});
  const [pending, setPending] = useState(false);

  // Next keeps this page alive, hidden, after navigating away (Activity). Each visit starts afresh,
  // and no typed password stays behind in the hidden page.
  useLayoutEffect(() => {
    const form = formRef.current;
    return () => {
      form?.reset();
      setKind(FIRST_KIND);
      setProblems({});
      setPending(false);
    };
  }, []);

  /** Puts the cursor in the first field with a problem, its text selected for retyping. */
  function focusFirstProblem(found: Problems) {
    const first = (["name", "email", "kind", "password", "confirmation"] as const).find((name) => found[name]);
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
    updateNameToast(found.name);
    focusFirstProblem(found);
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const typed = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      confirmation: String(form.get("confirmation") ?? ""),
    };

    const inputProblems = checkInput(typed);
    if (Object.keys(inputProblems).length > 0) return showProblems(inputProblems);

    setPending(true);
    setProblems({});
    let result: CreateAccountActionResult | null = null;
    try {
      result = await createAccount({ name: typed.name, email: typed.email, kind, password: typed.password });
    } catch {
      result = null;
    }

    if (result?.status === "created") {
      // Stays pending until the list shows: the form is done. Hiding the page resets it.
      updateNameToast(undefined);
      toastSuccess("Account created");
      router.push(ACCOUNTS_PATH);
      return;
    }
    setPending(false);
    showProblems(resultProblems(result));
  }

  function fieldProps(name: Exclude<FieldName, "kind">, describedBy?: string) {
    const problem = problems[name];
    const errorId = `${ids.form}-${name}-error`;
    return {
      id: `${ids.form}-${name}`,
      name,
      required: true,
      "aria-invalid": problem ? true : undefined,
      "aria-describedby": [describedBy, problem && errorId].filter(Boolean).join(" ") || undefined,
    } as const;
  }

  function fieldError(name: FieldName) {
    return <FieldError id={`${ids.form}-${name}-error`}>{problems[name]}</FieldError>;
  }

  return (
    // method="dialog" makes a submit before hydration a no-op instead of a GET that would put the
    // password in the URL. Once hydrated, handleSubmit handles everything.
    <form ref={formRef} method="dialog" onSubmit={handleSubmit} noValidate className="w-full max-w-sm">
      <FieldGroup>
        <Field data-invalid={problems.name ? true : undefined}>
          <FieldLabel htmlFor={`${ids.form}-name`}>Name</FieldLabel>
          <Input {...fieldProps("name", ids.nameHint)} type="text" autoComplete="off" />
          <FieldDescription id={ids.nameHint}>{NAME_HINT}</FieldDescription>
          {fieldError("name")}
        </Field>
        <Field data-invalid={problems.email ? true : undefined}>
          <FieldLabel htmlFor={`${ids.form}-email`}>Email</FieldLabel>
          <Input {...fieldProps("email")} type="email" autoComplete="off" autoCapitalize="none" spellCheck={false} />
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
            aria-invalid={problems.kind ? true : undefined}
            aria-describedby={problems.kind ? `${ids.form}-kind-error` : undefined}
          >
            {KIND_CHOICES.map(({ kind: choice, explanation }) => (
              <Field key={choice} orientation="horizontal">
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
          {fieldError("kind")}
        </FieldSet>
        <PasswordFields
          labels={{ password: "Password", confirmation: "Confirm password" }}
          problems={problems}
          pending={pending}
          onGenerate={() => setProblems((found) => ({ ...found, password: undefined, confirmation: undefined }))}
        />
        <Field>
          {/* Someone else chose the password (the Admin), so a Staff or Admin Account's owner chooses their own. */}
          {canChangeOwnPassword(kind) && (
            <FieldDescription id={ids.firstSignIn}>
              They&apos;ll be asked to choose their own password when they first sign in.
            </FieldDescription>
          )}
          <FormAlert>{problems.form}</FormAlert>
          <Button
            type="submit"
            disabled={pending}
            aria-describedby={canChangeOwnPassword(kind) ? ids.firstSignIn : undefined}
          >
            {pending ? "Creating Account…" : "Create Account"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
