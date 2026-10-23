"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircleIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth/access";
import type { DeleteRegistrationResult } from "@/lib/registrations/detail";
import { REGISTRATION_LIST_ENDPOINT, registrationListKey } from "../../_registration-list/list-endpoint";

/** What a delete can come back with, as the browser sees it. */
type DeleteOutcome = DeleteRegistrationResult | { status: "signed-out" } | { status: "error" };

/** DELETE /api/back-office/registrations/{id}. Never throws: anything unexpected is "error". */
async function requestDelete(registrationId: number): Promise<DeleteOutcome> {
  try {
    const response = await fetch(`${REGISTRATION_LIST_ENDPOINT}/${registrationId}`, {
      method: "DELETE",
      headers: { accept: "application/json" },
    });
    if (response.status === 401) return { status: "signed-out" };
    const body = (await response.json()) as { status?: unknown; passCode?: unknown } | null;
    if (body?.status === "deleted" && typeof body.passCode === "string") {
      return { status: "deleted", passCode: body.passCode };
    }
    return body?.status === "not-found" ? { status: "not-found" } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

/**
 * "ลบการลงทะเบียน": asks in place first (no browser dialog), then deletes the Registration and its
 * Check-Ins and returns to the list (`afterDeleteHref`, which says so). Focus starts on ยกเลิก,
 * so a stray Enter can't delete; Escape cancels too. Every other outcome is shown in Thai here.
 */
export function DeleteRegistration({
  registrationId,
  attendeeName,
  passCode,
  afterDeleteHref,
  listHref,
}: {
  registrationId: number;
  attendeeName: string;
  passCode: string;
  /** The list view the detail was opened from, plus `?deleted=` for the list's toast. */
  afterDeleteHref: string;
  listHref: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const promptId = useId();

  const remove = useMutation({
    mutationFn: () => requestDelete(registrationId),
    onSuccess: (outcome) => {
      if (outcome.status !== "deleted") {
        // Close the question; the reason shows under the button, which gets focus back.
        returnFocus.current = true;
        setConfirming(false);
        return;
      }
      // Every cached list page may hold the row; the list's counts are server-rendered and
      // re-render on this navigation. Replace, so Back can't return to a deleted Registration.
      void queryClient.invalidateQueries({ queryKey: registrationListKey });
      router.replace(afterDeleteHref);
    },
  });

  useEffect(() => {
    if (confirming) cancelButton.current?.focus();
    else if (returnFocus.current) openButton.current?.focus();
    returnFocus.current = false;
  }, [confirming]);

  // Next keeps this page alive (hidden) after navigating away; come back to a closed question.
  const { reset } = remove;
  useLayoutEffect(
    () => () => {
      setConfirming(false);
      reset();
    },
    [reset],
  );

  const outcome = remove.data;
  const deleting = remove.isPending || outcome?.status === "deleted";

  function cancel() {
    returnFocus.current = true;
    setConfirming(false);
  }

  if (confirming || deleting) {
    return (
      <div
        role="group"
        aria-labelledby={promptId}
        className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4"
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === "Escape" && !deleting) cancel();
        }}
      >
        <p id={promptId} className="text-sm leading-normal">
          ลบการลงทะเบียนของ <span className="font-medium">{attendeeName}</span> (
          <span className="font-mono">{passCode}</span>) ถาวร? Event Pass นี้จะใช้เช็คอินไม่ได้อีก
          และกู้คืนไม่ได้
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleting}
            onClick={() => remove.mutate()}
          >
            {deleting ? <LoaderCircleIcon aria-hidden="true" className="animate-spin" /> : <Trash2Icon aria-hidden="true" />}
            {deleting ? "กำลังลบ…" : "ลบถาวร"}
          </Button>
          <Button ref={cancelButton} type="button" variant="outline" size="sm" disabled={deleting} onClick={cancel}>
            ยกเลิก
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        ref={openButton}
        type="button"
        variant="outline"
        size="sm"
        className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
        onClick={() => {
          remove.reset();
          setConfirming(true);
        }}
      >
        <Trash2Icon aria-hidden="true" />
        ลบการลงทะเบียน
      </Button>
      {outcome && <DeleteFeedback outcome={outcome} listHref={listHref} />}
    </div>
  );
}

function DeleteFeedback({ outcome, listHref }: { outcome: DeleteOutcome; listHref: string }) {
  const feedback = "text-sm leading-normal";
  switch (outcome.status) {
    case "deleted":
      return null;
    case "not-found":
      return (
        <p role="alert" className={feedback}>
          ไม่พบการลงทะเบียนนี้ อาจถูกลบไปแล้ว{" "}
          <Link href={listHref} className="underline underline-offset-2">
            กลับไปรายการลงทะเบียน
          </Link>
        </p>
      );
    case "signed-out":
      return (
        <p role="alert" className={feedback}>
          หมดเวลาการเข้าสู่ระบบ ยังไม่ได้ลบ{" "}
          <Link href={SIGN_IN_PATH} className="underline underline-offset-2">
            เข้าสู่ระบบอีกครั้ง
          </Link>
        </p>
      );
    case "error":
      return (
        <p role="alert" className={`${feedback} text-destructive`}>
          ลบไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง
        </p>
      );
  }
}
