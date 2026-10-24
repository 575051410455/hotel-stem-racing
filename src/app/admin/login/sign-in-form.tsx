"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { homePath, isAccountKind, MY_ACCOUNT_PATH, mustChooseOwnPassword } from "@/lib/auth/access";
import { staffAuthClient } from "@/lib/auth/client";

type SignInFailure = { status: number; code?: string; retryAfterSeconds?: number };

function signInErrorMessage({ status, code, retryAfterSeconds }: SignInFailure): string {
  if (status === 429) {
    return retryAfterSeconds
      ? `Too many sign-in attempts. Wait ${retryAfterSeconds} seconds and try again.`
      : "Too many sign-in attempts. Wait a moment and try again.";
  }
  if (status === 401 || code === "INVALID_EMAIL_OR_PASSWORD") return "Wrong email or password";
  // Only after the right password (staff-auth.ts), so it never tells a stranger which emails have Accounts.
  if (code === "ACCOUNT_DISABLED") return "This Account is disabled. Ask an Admin to turn it back on.";
  if (code === "INVALID_EMAIL") return "Please enter a valid email";
  if (status === 0) return "Can't reach the server. Check your internet connection and try again.";
  return "Sign-in failed. Please try again.";
}

export function SignInForm() {
  const router = useRouter();
  const errorId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setPending(true);
    setError(null);
    let retryAfterSeconds: number | undefined;
    let failure: SignInFailure | null = null;
    let home = "/admin";
    try {
      const result = await staffAuthClient.signIn.email(
        { email, password },
        {
          onError(context) {
            const retryAfter = Number(context.response.headers.get("X-Retry-After"));
            if (retryAfter > 0) retryAfterSeconds = retryAfter;
          },
        },
      );
      if (result.error) {
        failure = { status: result.error.status, code: result.error.code, retryAfterSeconds };
      } else {
        // A Kiosk Account goes straight to the Kiosk page, and an Account whose password someone
        // else set straight to My Account to choose its own. This only saves a hop: /admin would
        // send it there too, because the server decides what each Account may open. (Better Auth
        // types this user loosely, so the kind and the flag are checked rather than trusted.)
        const { kind, mustChangePassword } = result.data.user as { kind?: unknown; mustChangePassword?: unknown };
        if (isAccountKind(kind)) {
          home = mustChooseOwnPassword(kind, mustChangePassword === true) ? MY_ACCOUNT_PATH : homePath(kind);
        }
      }
    } catch {
      failure = { status: 0 };
    }

    if (failure) {
      setError(signInErrorMessage(failure));
      setPending(false);
      passwordRef.current?.select();
      return;
    }
    router.replace(home);
  }

  return (
    // method="dialog" makes a submit before hydration a no-op instead of a GET that would put the
    // email and password in the URL. Once hydrated, handleSubmit handles everything.
    <form method="dialog" onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="staff-email">Email</FieldLabel>
          <Input
            id="staff-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </Field>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="staff-password">Password</FieldLabel>
          <Input
            ref={passwordRef}
            id="staff-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </Field>
        <Field>
          {/* Always rendered, even empty, so screen readers announce each new message. */}
          <p id={errorId} role="alert" className="text-sm leading-normal text-destructive">
            {error}
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          {/* There is no self-service reset: the operator sets a new password with `npm run staff`. */}
          <FieldDescription className="text-center">Forgot your password? Ask the organisers to set a new one.</FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
