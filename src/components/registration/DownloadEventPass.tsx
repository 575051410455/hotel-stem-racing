"use client";

import { useEffect, useId, useState } from "react";
import { eventPassFileName, renderEventPassPng } from "./event-pass-png";

type Status =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "downloaded" }
  /** The browser ignores `download`: show the card so the Attendee can long-press to save it. */
  | { kind: "preview"; url: string }
  | { kind: "failed" };

/**
 * "บันทึก Event Pass": draws the Event Pass card as a PNG named after the Pass Code and
 * downloads it. Reads the QR the server already rendered (by `qrId`), so the card encodes
 * exactly the same Event Pass link, and it never receives the token.
 */
export function DownloadEventPass({
  qrId,
  passCode,
  attendeeName,
  eventDayLabels,
}: {
  qrId: string;
  passCode: string;
  attendeeName: string;
  eventDayLabels: string[];
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const hintId = useId();
  const fileName = eventPassFileName(passCode);
  const working = status.kind === "working";
  const message = {
    idle: undefined,
    working: undefined,
    downloaded: `เริ่มดาวน์โหลดไฟล์ ${fileName} แล้ว`,
    preview: "กดค้างที่รูปด้านล่างเพื่อบันทึกลงในเครื่อง",
    failed: "บันทึกไฟล์ไม่สำเร็จ กรุณาบันทึกภาพหน้าจอหน้านี้ไว้แทน",
  }[status.kind];

  const previewUrl = status.kind === "preview" ? status.url : undefined;
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function save() {
    if (working) return;
    setStatus({ kind: "working" });
    try {
      const qr = document.getElementById(qrId);
      if (!(qr instanceof SVGSVGElement)) throw new Error("The Event Pass QR is not on the page");
      const png = await renderEventPassPng({ qr, passCode, attendeeName, eventDayLabels });
      const url = URL.createObjectURL(png);
      if (!("download" in HTMLAnchorElement.prototype)) {
        setStatus({ kind: "preview", url });
        return;
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      // Revoking straight away can cancel the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus({ kind: "downloaded" });
    } catch (error) {
      // The pass on the page still works; the Attendee is told to take a screenshot instead.
      console.error(error);
      setStatus({ kind: "failed" });
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={save}
        aria-disabled={working}
        aria-describedby={hintId}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-accent px-6 text-base font-bold text-white transition-colors hover:bg-accent-dark active:shadow-[#000_3px_2px_6px_inset] aria-disabled:opacity-60 aria-disabled:hover:bg-accent aria-disabled:active:shadow-none tab:h-14"
      >
        <DownloadIcon />
        {working ? "กำลังสร้างไฟล์…" : "บันทึก Event Pass"}
      </button>
      <div className="text-[0.875rem]">
        <p id={hintId} className="text-muted">
          ไฟล์รูปภาพ {fileName} สำหรับเก็บไว้ในเครื่องหรือพิมพ์
        </p>
        {/* Always rendered, so the live region exists before a message arrives. */}
        <p role="status" className={message && (status.kind === "failed" ? "mt-2 text-accent" : "mt-2")}>
          {message}
        </p>
      </div>
      {previewUrl && (
        // A blob: URL made in the browser; next/image can't optimise it and needn't.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={`บัตรเข้างาน รหัส ${passCode}`}
          width={1024}
          height={1204}
          className="h-auto w-full border border-line"
        />
      )}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0" fill="currentColor">
      <path d="M10 2a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42L9 11.59V3a1 1 0 0 1 1-1ZM4 15a1 1 0 0 1 1 1v.5h10V16a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V16a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
