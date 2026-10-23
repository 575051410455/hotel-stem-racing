"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SIGN_IN_PATH } from "@/lib/auth/access";
import { staffAuthClient } from "@/lib/auth/client";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";
import { toastSuccess } from "../_shell/toasts";

type FieldName = "currentPassword" | "newPassword" | "confirmation";

/** What went wrong: next to a field, or (`form`) for the whole form, above the button. */
type Problems = Partial<Record<FieldName, string>> & { form?: ReactNode };

const TOO_SHORT = `รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
const TOO_LONG = `รหัสผ่านใหม่ยาวได้ไม่เกิน ${MAX_PASSWORD_LENGTH} ตัวอักษร`;
const WRONG_CURRENT_PASSWORD = "รหัสผ่านปัจจุบันไม่ถูกต้อง";

/** Checked in the browser so Staff can fix them without a request; the server enforces the same limits. */
function checkInput(currentPassword: string, newPassword: string, confirmation: string): Problems {
  const problems: Problems = {};
  if (!currentPassword) problems.currentPassword = "กรุณากรอกรหัสผ่านปัจจุบัน";
  if (newPassword.length < MIN_PASSWORD_LENGTH) problems.newPassword = TOO_SHORT;
  else if (newPassword.length > MAX_PASSWORD_LENGTH) problems.newPassword = TOO_LONG;
  if (!confirmation) problems.confirmation = "กรุณากรอกรหัสผ่านใหม่อีกครั้ง";
  else if (confirmation !== newPassword) problems.confirmation = "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน";
  return problems;
}

type ChangeFailure = { status: number; code?: string; retryAfterSeconds?: number };

function failureProblems({ status, code, retryAfterSeconds }: ChangeFailure, newPassword: string): Problems {
  if (status === 429) {
    return {
      form: retryAfterSeconds
        ? `พยายามเปลี่ยนรหัสผ่านหลายครั้งเกินไป กรุณารอ ${retryAfterSeconds} วินาทีแล้วลองใหม่`
        : "พยายามเปลี่ยนรหัสผ่านหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่",
    };
  }
  if (status === 401) {
    return {
      form: (
        <>
          หมดเวลาการเข้าสู่ระบบ{" "}
          <Link href={SIGN_IN_PATH} className="font-medium underline underline-offset-4">
            เข้าสู่ระบบอีกครั้ง
          </Link>
        </>
      ),
    };
  }
  if (code === "INVALID_PASSWORD") return { currentPassword: WRONG_CURRENT_PASSWORD };
  if (code === "PASSWORD_TOO_SHORT") return { newPassword: TOO_SHORT };
  // The server also refuses a current password over the limit, which can't be the right one.
  if (code === "PASSWORD_TOO_LONG") {
    return newPassword.length > MAX_PASSWORD_LENGTH
      ? { newPassword: TOO_LONG }
      : { currentPassword: WRONG_CURRENT_PASSWORD };
  }
  if (status === 0) return { form: "เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" };
  return { form: "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
}

/**
 * Staff change their own password. It goes from the browser to Better Auth's change-password
 * endpoint, like sign-in, so it is rate-limited, and it signs every other device out; this one gets
 * a fresh session cookie and stays signed in.
 */
export function ChangePasswordForm({ email }: { email: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const ids = { form: useId(), hint: useId(), warning: useId() };
  const [problems, setProblems] = useState<Problems>({});
  const [pending, setPending] = useState(false);

  /** Puts the cursor in the first field with a problem, its text selected for retyping. */
  function focusFirstProblem(found: Problems) {
    const first = (["currentPassword", "newPassword", "confirmation"] as const).find((name) => found[name]);
    const input = first && formRef.current?.elements.namedItem(first);
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    const inputProblems = checkInput(currentPassword, newPassword, confirmation);
    if (Object.keys(inputProblems).length > 0) {
      setProblems(inputProblems);
      focusFirstProblem(inputProblems);
      return;
    }

    setPending(true);
    setProblems({});
    let retryAfterSeconds: number | undefined;
    let failure: ChangeFailure | null = null;
    try {
      const result = await staffAuthClient.changePassword(
        { currentPassword, newPassword, revokeOtherSessions: true },
        {
          onError(context) {
            const retryAfter = Number(context.response.headers.get("X-Retry-After"));
            if (retryAfter > 0) retryAfterSeconds = retryAfter;
          },
        },
      );
      if (result.error) failure = { status: result.error.status, code: result.error.code, retryAfterSeconds };
    } catch {
      failure = { status: 0 };
    }
    setPending(false);

    if (failure) {
      const found = failureProblems(failure, newPassword);
      setProblems(found);
      focusFirstProblem(found);
      return;
    }
    formRef.current?.reset();
    toastSuccess("เปลี่ยนรหัสผ่านแล้ว");
  }

  function fieldProps(name: FieldName, describedBy?: string) {
    const problem = problems[name];
    const errorId = `${ids.form}-${name}-error`;
    return {
      id: `${ids.form}-${name}`,
      name,
      type: "password",
      required: true,
      "aria-invalid": problem ? true : undefined,
      "aria-describedby": [describedBy, problem && errorId].filter(Boolean).join(" ") || undefined,
    } as const;
  }

  function fieldError(name: FieldName) {
    return <FieldError id={`${ids.form}-${name}-error`}>{problems[name]}</FieldError>;
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="w-full max-w-sm">
      {/* Tells password managers which Account the new password belongs to. */}
      <input
        type="email"
        name="username"
        autoComplete="username"
        value={email}
        readOnly
        hidden
      />
      <FieldGroup>
        <Field data-invalid={problems.currentPassword ? true : undefined}>
          <FieldLabel htmlFor={`${ids.form}-currentPassword`}>รหัสผ่านปัจจุบัน</FieldLabel>
          <Input {...fieldProps("currentPassword")} autoComplete="current-password" />
          {fieldError("currentPassword")}
        </Field>
        <Field data-invalid={problems.newPassword ? true : undefined}>
          <FieldLabel htmlFor={`${ids.form}-newPassword`}>รหัสผ่านใหม่</FieldLabel>
          <Input {...fieldProps("newPassword", ids.hint)} autoComplete="new-password" />
          <FieldDescription id={ids.hint}>อย่างน้อย {MIN_PASSWORD_LENGTH} ตัวอักษร</FieldDescription>
          {fieldError("newPassword")}
        </Field>
        <Field data-invalid={problems.confirmation ? true : undefined}>
          <FieldLabel htmlFor={`${ids.form}-confirmation`}>ยืนยันรหัสผ่านใหม่</FieldLabel>
          <Input {...fieldProps("confirmation")} autoComplete="new-password" />
          {fieldError("confirmation")}
        </Field>
        <Field>
          <FieldDescription id={ids.warning}>อุปกรณ์อื่นที่ใช้บัญชีนี้จะต้องเข้าสู่ระบบใหม่</FieldDescription>
          {/* Always rendered, even empty, so screen readers announce each new message. */}
          <p role="alert" className="text-sm leading-normal text-destructive">
            {problems.form}
          </p>
          <Button type="submit" disabled={pending} aria-describedby={ids.warning}>
            {pending ? "กำลังเปลี่ยนรหัสผ่าน…" : "เปลี่ยนรหัสผ่าน"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
