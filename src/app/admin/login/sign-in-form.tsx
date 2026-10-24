"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { homePath, isAccountKind } from "@/lib/auth/access";
import { staffAuthClient } from "@/lib/auth/client";

type SignInFailure = { status: number; code?: string; retryAfterSeconds?: number };

function signInErrorMessage({ status, code, retryAfterSeconds }: SignInFailure): string {
  if (status === 429) {
    return retryAfterSeconds
      ? `พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ ${retryAfterSeconds} วินาทีแล้วลองใหม่`
      : "พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }
  if (status === 401 || code === "INVALID_EMAIL_OR_PASSWORD") return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (code === "INVALID_EMAIL") return "กรุณากรอกอีเมลให้ถูกต้อง";
  if (status === 0) return "เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  return "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
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
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
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
        // A Kiosk Account goes straight to the Kiosk page. This only saves a hop: /admin would
        // send it there too, because the server decides what each Account may open. (Better Auth
        // types this user loosely, so the kind is checked rather than trusted.)
        const { kind } = result.data.user as { kind?: unknown };
        if (isAccountKind(kind)) home = homePath(kind);
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
          <FieldLabel htmlFor="staff-email">อีเมล</FieldLabel>
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
          <FieldLabel htmlFor="staff-password">รหัสผ่าน</FieldLabel>
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
            {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </Button>
          {/* There is no self-service reset: the operator sets a new password with `npm run staff`. */}
          <FieldDescription className="text-center">ลืมรหัสผ่าน? ติดต่อผู้จัดงานเพื่อตั้งรหัสผ่านใหม่</FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
