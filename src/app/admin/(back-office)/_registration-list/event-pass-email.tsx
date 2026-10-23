"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth/access";
import type { ResendEventPassResult } from "@/lib/registrations/resend-event-pass";
import { toastError, toastSuccess } from "../_shell/toasts";
import { formatCreatedAt } from "./format";
import { REGISTRATION_LIST_ENDPOINT, registrationListKey } from "./list-endpoint";
import type { RegistrationListItem } from "./query";

// The Event Pass email status of one Registration, and Staff's "send again" action. Shown in
// the Registration list's "อีเมล Event Pass" column; the detail view can reuse both parts.

const formatCount = new Intl.NumberFormat("th-TH").format;

type EmailStatus = Pick<RegistrationListItem, "emailSentCount" | "lastEmailSentAt">;

/**
 * "ส่งแล้ว 2 ครั้ง" with the last-sent time in Bangkok, or "ยังไม่ได้ส่ง". Sent means a count
 * above 0: while a Duplicate Registration re-send is in flight, the time is set early (ticket 06).
 */
export function EventPassEmailStatus({ emailSentCount, lastEmailSentAt }: EmailStatus) {
  if (emailSentCount < 1) return <span className="text-muted-foreground">ยังไม่ได้ส่ง</span>;
  return (
    <span className="flex flex-col leading-normal">
      <span>ส่งแล้ว {formatCount(emailSentCount)} ครั้ง</span>
      {lastEmailSentAt && (
        <span className="text-xs text-muted-foreground">
          ล่าสุด{" "}
          <time dateTime={lastEmailSentAt} className="tabular-nums">
            {formatCreatedAt(lastEmailSentAt)}
          </time>
        </span>
      )}
    </span>
  );
}

/** The list cell: the status, then the resend action under it. */
export function EventPassEmailCell({ registration }: { registration: RegistrationListItem }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <EventPassEmailStatus {...registration} />
      <ResendEventPass registrationId={registration.id} email={registration.email} />
    </div>
  );
}

/** What a resend can come back with, as the browser sees it. */
type ResendOutcome = ResendEventPassResult | { status: "signed-out" } | { status: "error" };

const resendStatuses: readonly string[] = ["sent", "failed", "email-not-configured", "not-found"];

/** POST /api/back-office/registrations/{id}/resend. Never throws: anything unexpected is "error". */
async function requestResend(registrationId: number): Promise<ResendOutcome> {
  try {
    const response = await fetch(`${REGISTRATION_LIST_ENDPOINT}/${registrationId}/resend`, {
      method: "POST",
      headers: { accept: "application/json" },
    });
    if (response.status === 401) return { status: "signed-out" };
    const body: unknown = await response.json();
    const status = (body as { status?: unknown } | null)?.status;
    if (typeof status !== "string" || !resendStatuses.includes(status)) return { status: "error" };
    if (status === "failed") {
      const reason = (body as { reason?: unknown }).reason;
      return { status, reason: typeof reason === "string" ? reason : "" };
    }
    return { status } as ResendOutcome;
  } catch {
    return { status: "error" };
  }
}

/**
 * "ส่งอีกครั้ง": asks in place before sending (no browser dialog) and sends one email to the
 * registered address. Every outcome is a toast in Thai; nothing here throws into the page. After a
 * send, the list and the page's server data refresh, so the email status (the list row's, or the
 * detail page's) and the overview numbers update.
 */
export function ResendEventPass({ registrationId, email }: { registrationId: number; email: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const resend = useMutation({
    mutationFn: () => requestResend(registrationId),
    // On the mutation rather than on `mutate`, so the toast shows even if Staff have left the page.
    onSuccess: (outcome) => {
      toastResendOutcome(outcome, email, () => router.push(SIGN_IN_PATH));
      if (outcome.status !== "sent") return;
      void queryClient.invalidateQueries({ queryKey: registrationListKey });
      router.refresh();
    },
  });

  const openButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const promptId = useId();

  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
    else if (returnFocus.current) openButton.current?.focus();
    returnFocus.current = false;
  }, [confirming]);

  function ask() {
    setConfirming(true);
  }

  function cancel() {
    returnFocus.current = true;
    setConfirming(false);
  }

  function send() {
    returnFocus.current = true;
    setConfirming(false);
    resend.mutate();
  }

  if (confirming) {
    return (
      <div
        role="group"
        aria-labelledby={promptId}
        className="flex w-56 flex-col gap-1.5"
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === "Escape") cancel();
        }}
      >
        <p id={promptId} className="text-sm leading-normal whitespace-normal">
          ส่ง Event Pass ไปที่ <span className="font-medium wrap-anywhere">{email}</span> อีกครั้ง?
        </p>
        <div className="flex gap-2">
          <Button ref={confirmButton} type="button" size="xs" onClick={send}>
            ส่ง
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={cancel}>
            ยกเลิก
          </Button>
        </div>
      </div>
    );
  }

  const sending = resend.isPending;
  return (
    <Button ref={openButton} type="button" variant="outline" size="xs" disabled={sending} onClick={ask}>
      {sending && <LoaderCircleIcon aria-hidden="true" className="animate-spin" />}
      {sending ? "กำลังส่ง…" : "ส่งอีกครั้ง"}
    </Button>
  );
}

/** The outcome as a toast. The address is its description: the toast may show on another page. */
function toastResendOutcome(outcome: ResendOutcome, email: string, signIn: () => void) {
  switch (outcome.status) {
    case "sent":
      toastSuccess("ส่ง Event Pass แล้ว", { description: email });
      return;
    case "signed-out":
      toastError("หมดเวลาการเข้าสู่ระบบ", {
        description: email,
        action: { label: "เข้าสู่ระบบอีกครั้ง", onClick: signIn },
      });
      return;
    default:
      toastError(resendProblem(outcome), { description: email });
  }
}

/** Why a resend didn't go out, in Thai for Staff; a nodemailer code is kept for the operator. */
function resendProblem(outcome: Exclude<ResendOutcome, { status: "sent" | "signed-out" }>): string {
  switch (outcome.status) {
    case "email-not-configured":
      return "ส่งไม่ได้ เพราะยังไม่ได้ตั้งค่าการส่งอีเมล (SMTP)";
    case "not-found":
      return "ไม่พบการลงทะเบียนนี้ อาจถูกลบไปแล้ว";
    case "error":
      return "ส่งไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง";
    case "failed":
      return sendFailureMessage(outcome.reason);
  }
}

/**
 * A failed Event Pass email in Thai for Staff, from the sender's English error ("EAUTH: Invalid
 * login…"): "ส่งไม่สำเร็จ: <what to do> (EAUTH)". The nodemailer code is kept for the operator.
 */
export function sendFailureMessage(reason: string): string {
  const code = /^([A-Z][A-Z0-9_]+):/.exec(reason)?.[1];
  return `ส่งไม่สำเร็จ: ${failureReason(reason, code)}${code ? ` (${code})` : ""}`;
}

function failureReason(reason: string, code: string | undefined): string {
  // Gmail's daily limit ("550 5.4.5 Daily user sending limit exceeded") arrives as EENVELOPE,
  // so check it first: it isn't the address's fault, and a bulk send (17) can hit it.
  if (/5\.4\.5|sending limit|quota/i.test(reason)) {
    return "เกินโควตาการส่งอีเมลต่อวันของบัญชีผู้ส่ง ส่งต่อได้เมื่อโควตารีเซ็ต";
  }
  switch (code) {
    case "EAUTH":
    case "ENOAUTH":
    case "EOAUTH2":
      return "เซิร์ฟเวอร์อีเมลไม่ยอมรับบัญชีผู้ส่ง ตรวจสอบการตั้งค่า SMTP";
    case "ECONNECTION":
    case "ESOCKET":
    case "ETIMEDOUT":
    case "EDNS":
    case "ETLS":
      return "เชื่อมต่อเซิร์ฟเวอร์อีเมลไม่ได้ ลองอีกครั้งภายหลัง";
    case "EENVELOPE":
      return "เซิร์ฟเวอร์อีเมลไม่รับที่อยู่อีเมลนี้ ตรวจสอบอีเมลของผู้เข้าร่วมงาน";
  }
  if (reason.startsWith("Recipient rejected")) {
    return "เซิร์ฟเวอร์อีเมลไม่รับที่อยู่อีเมลนี้ ตรวจสอบอีเมลของผู้เข้าร่วมงาน";
  }
  if (reason.startsWith("APP_URL")) return "ยังไม่ได้ตั้งค่า APP_URL จึงสร้างลิงก์ Event Pass ไม่ได้";
  return "เกิดข้อผิดพลาด ลองอีกครั้งภายหลัง";
}
