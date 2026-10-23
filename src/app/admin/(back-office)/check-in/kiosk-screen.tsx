"use client";

// The Kiosk: an iPad that Attendees use by themselves. Two places render it:
// - /kiosk (ticket 23), signed in with a Kiosk Account. Always the Kiosk, recording today's Event
//   Day; the Staff corner only signs the Kiosk out.
// - Kiosk mode at /admin/check-in?kiosk=1 (ticket 19), signed in as Staff. It covers the Back Office
//   header (navigation and sign-out); the desk's Pass Code box and Event Day picker aren't
//   rendered, though the day Staff chose still applies. The Staff corner returns to the desk.
// Attendees see the front camera with a mirrored preview, the instruction in Thai and English, and
// big results that clear themselves. Staff use a small corner button and an in-page confirmation.

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { event } from "@/lib/event";
import type { CheckedInAttendee } from "@/lib/registrations/check-in";
import { cn } from "@/lib/utils";
import { CameraScanner } from "./camera-scanner";
import {
  AlertIcon,
  bangkokTime,
  CheckIcon,
  type CheckInAttempt,
  ClockIcon,
  CrossIcon,
  SIGN_IN_PATH,
  type Tone,
  tones,
} from "./check-in-result";

type ResultStatus = CheckInAttempt["result"]["status"];

/**
 * How long each result stays before the Kiosk returns to its instruction. A welcome only needs a
 * glance; anything that asks the Attendee to do something stays longer. Still checking, and a
 * signed-out Kiosk, stay until something changes.
 */
const RESULT_MS: Partial<Record<ResultStatus, number>> = {
  "checked-in": 5_000,
  "already-checked-in": 6_000,
  "checked-in-outside-registered-day": 8_000,
  "not-an-event-pass": 8_000,
  "not-an-event-day": 8_000,
  failed: 8_000,
};

/** The Staff panel closes by itself if nobody uses it, so it never lingers in front of Attendees. */
const STAFF_PANEL_MS = 15_000;

/** The Event Day Check-Ins are recorded for: its label, or null when today isn't one and none was chosen. */
export type KioskCheckInDay = { label: string | null; chosenByStaff: boolean };

/**
 * What the Staff corner offers. At the desk's Kiosk mode, leaving it for the desk. On the Kiosk
 * page, only signing out: a Kiosk Account has no desk to go back to.
 */
export type KioskExit = { kind: "leave-kiosk-mode"; onLeave: () => void } | { kind: "sign-out"; accountName: string };

export function KioskScreen({
  attempt,
  onPass,
  exit,
  checkInDay,
}: {
  /** The latest scan; a new one replaces the result on screen. */
  attempt: CheckInAttempt | null;
  onPass: (scan: string) => void;
  exit: KioskExit;
  checkInDay: KioskCheckInDay;
}) {
  // The result already on the desk when the Kiosk opened counts as seen, so the Kiosk opens idle.
  const [dismissed, setDismissed] = useState(attempt);
  const shown = attempt !== dismissed ? attempt : null;
  const wakeLockHeld = useScreenWakeLock();

  useEffect(() => {
    const ms = shown && RESULT_MS[shown.result.status];
    if (!shown || !ms) return;
    const timer = setTimeout(() => setDismissed(shown), ms);
    return () => clearTimeout(timer);
  }, [shown]);

  // Every later scan would be refused too, so the camera goes off until Staff sign in again.
  const signedOut = attempt?.result.status === "signed-out";

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-brand-deep text-white select-none">
      <div aria-hidden="true" className="h-2 shrink-0 bg-brand-gradient" />
      <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 tab:px-6">
        {/* One line whatever shows on the right, so the preview's box never changes height. */}
        <p className="min-w-0 truncate text-base leading-normal font-semibold tab:text-lg">
          {event.name}
          <span className="font-normal text-white/70"> · จุดเช็คอินด้วยตนเอง</span>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {checkInDay.chosenByStaff && (
            <p className="rounded-full bg-orange-500 px-3 py-1 text-sm leading-normal font-semibold whitespace-nowrap text-neutral-950">
              บันทึกเป็น{checkInDay.label}
            </p>
          )}
          <StaffCorner exit={exit} checkInDay={checkInDay} wakeLockHeld={wakeLockHeld} />
        </div>
      </div>

      {signedOut ? (
        <SignedOutNotice exit={exit} />
      ) : (
        <div
          className={cn(
            "grid min-h-0 flex-1 gap-4 px-4 pb-4 tab:gap-6 tab:px-6 tab:pb-6",
            // Fixed tracks: the preview's box never changes with the message beside it, so the
            // camera isn't refitted every time a result comes and goes.
            "landscape:grid-cols-2 landscape:grid-rows-[minmax(0,1fr)]",
            "portrait:grid-rows-2",
          )}
        >
          <CameraScanner kiosk mirrorPreview onPass={onPass} />
          <div role="status" aria-live="polite" aria-atomic="true" className="min-h-0 overflow-y-auto">
            {shown ? <KioskResult attempt={shown} /> : <Instruction />}
          </div>
        </div>
      )}
    </div>
  );
}

function Instruction() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center tab:gap-6">
      <QrIcon />
      <p className="text-4xl leading-snug font-bold tab:text-5xl landscape:tab:text-6xl">แสดง QR ของท่านที่กล้อง</p>
      <p lang="en" className="text-2xl leading-snug font-medium text-white/85 tab:text-3xl landscape:tab:text-4xl">
        Show your pass QR to the camera
      </p>
      <p className="mt-2 text-lg leading-normal text-white/70 tab:text-xl">
        ไม่มี Event Pass? ติดต่อเจ้าหน้าที่
        <span lang="en" className="block">
          No Event Pass? Please ask a staff member.
        </span>
      </p>
    </div>
  );
}

function KioskResult({ attempt }: { attempt: CheckInAttempt }) {
  const { result } = attempt;
  switch (result.status) {
    case "pending":
      return <ResultCard tone="neutral" icon={null} thai="กำลังตรวจสอบ…" english="Checking…" />;
    case "checked-in":
      return (
        <ResultCard tone="success" icon={<CheckIcon className={ICON} />} thai="เช็คอินสำเร็จ" english="You’re checked in">
          <AttendeeName attendee={result.attendee} />
          <Note thai="ยินดีต้อนรับ" english="Welcome!" />
        </ResultCard>
      );
    case "already-checked-in": {
      const time = bangkokTime(result.checkedInAt);
      return (
        <ResultCard
          tone="repeat"
          icon={<ClockIcon className={ICON} />}
          thai={`เช็คอินแล้วเมื่อ ${time}`}
          english={`Already checked in at ${time}`}
        >
          <AttendeeName attendee={result.attendee} />
        </ResultCard>
      );
    }
    case "checked-in-outside-registered-day":
      return (
        <ResultCard
          tone="warning"
          icon={<AlertIcon className={ICON} />}
          thai="ไม่ได้ลงทะเบียนวันนี้"
          english="Not registered for today"
        >
          <AttendeeName attendee={result.attendee} />
          <Note thai="บันทึกการเช็คอินแล้ว โปรดแจ้งเจ้าหน้าที่" english="Your check-in is recorded. Please see a staff member." />
        </ResultCard>
      );
    case "not-an-event-pass":
      return (
        <ResultCard tone="neutral" icon={<CrossIcon className={ICON} />} thai="ไม่ใช่ Event Pass" english="Not an Event Pass">
          <Note
            thai="โปรดแสดง QR จากอีเมลหรือหน้า Event Pass ของท่าน"
            english="Please show the QR from your Event Pass email or page."
          />
        </ResultCard>
      );
    case "not-an-event-day":
      return (
        <ResultCard
          tone="neutral"
          icon={<CrossIcon className={ICON} />}
          thai="วันนี้ไม่ใช่วันจัดงาน"
          english="Today isn’t an Event Day"
        >
          <Note thai="โปรดติดต่อเจ้าหน้าที่" english="Please see a staff member." />
        </ResultCard>
      );
    case "failed":
      return (
        <ResultCard
          tone="neutral"
          icon={<CrossIcon className={ICON} />}
          thai="เช็คอินไม่สำเร็จ"
          english="Check-in didn’t go through"
        >
          <Note thai="โปรดลองอีกครั้งในอีกสักครู่" english="Please try again in a moment." />
        </ResultCard>
      );
    case "signed-out":
      // Shown as the whole-screen notice instead; kept here so every result has words.
      return (
        <ResultCard tone="neutral" icon={<CrossIcon className={ICON} />} thai="เจ้าหน้าที่ต้องเข้าสู่ระบบอีกครั้ง" english="Staff must sign in again" />
      );
  }
}

const ICON = "size-12 tab:size-16 landscape:tab:size-20";

function ResultCard({
  tone,
  icon,
  thai,
  english,
  children,
}: {
  tone: Tone;
  icon: ReactNode;
  thai: string;
  english: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-full flex-col items-center justify-center gap-2 rounded-2xl border-4 p-5 text-center tab:p-6 landscape:tab:gap-4 landscape:tab:p-8",
        tones[tone],
      )}
    >
      {icon}
      <p className="text-4xl leading-snug font-bold tab:text-5xl landscape:tab:text-6xl">{thai}</p>
      <p lang="en" className="text-2xl leading-snug font-semibold opacity-90 landscape:tab:text-3xl">
        {english}
      </p>
      {children}
    </div>
  );
}

function AttendeeName({ attendee }: { attendee: CheckedInAttendee }) {
  return (
    <p className="mt-2 max-w-full text-3xl leading-snug font-bold break-words tab:text-4xl landscape:tab:text-5xl">
      {attendee.givenName} {attendee.familyName}
    </p>
  );
}

function Note({ thai, english }: { thai: string; english: string }) {
  return (
    <p className="mt-1 text-xl leading-normal font-medium landscape:tab:text-2xl">
      {thai}
      <span lang="en" className="block text-lg font-normal opacity-90 landscape:tab:text-xl">
        {english}
      </span>
    </p>
  );
}

function SignedOutNotice({ exit }: { exit: KioskExit }) {
  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-10 text-center tab:gap-6">
      <CrossIcon className={ICON} />
      <p className="text-4xl leading-snug font-bold tab:text-6xl">เจ้าหน้าที่ต้องเข้าสู่ระบบอีกครั้ง</p>
      <p lang="en" className="text-2xl leading-snug font-semibold text-white/85 tab:text-4xl">
        Staff must sign in again
      </p>
      <p className="text-lg leading-normal text-white/80 tab:text-xl">
        จุดนี้ยังเช็คอินไม่ได้ โปรดติดต่อเจ้าหน้าที่
        <span lang="en" className="block">
          This kiosk can’t check you in right now. Please see a staff member.
        </span>
      </p>
      <Button asChild size="lg" variant="secondary" className="mt-2 h-14 px-8 text-lg">
        <Link href={SIGN_IN_PATH}>เข้าสู่ระบบอีกครั้ง</Link>
      </Button>
      <p className="text-base leading-normal text-white/70">
        {exit.kind === "sign-out"
          ? "เข้าสู่ระบบด้วยบัญชี Kiosk แล้วหน้านี้จะเปิดขึ้นเอง"
          : "หลังเข้าสู่ระบบ เปิดหน้าเช็คอินแล้วเปิดโหมด Kiosk อีกครั้ง"}{" "}
        ยังไม่ได้บันทึกการเช็คอินที่สแกนล่าสุด
      </p>
    </div>
  );
}

/**
 * The Staff corner: a small, low-key button that opens an in-page panel to leave Kiosk mode, or on
 * the Kiosk page to sign the Kiosk out. Two deliberate taps, so an Attendee won't do it by accident;
 * no browser dialogs.
 */
function StaffCorner({
  exit,
  checkInDay,
  wakeLockHeld,
}: {
  exit: KioskExit;
  checkInDay: KioskCheckInDay;
  wakeLockHeld: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), STAFF_PANEL_MS);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="kiosk-staff-panel"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="flex items-center gap-1.5 rounded-md border border-white/25 px-3 py-2 text-sm leading-none text-white/60"
      >
        <LockIcon />
        เจ้าหน้าที่
      </button>
      {open && (
        <div
          id="kiosk-staff-panel"
          role="group"
          aria-label="สำหรับเจ้าหน้าที่"
          // Normal text selection inside, for a panel Staff may want to read closely.
          className="absolute top-full right-0 z-10 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-white p-5 text-neutral-950 shadow-2xl select-text"
          onKeyDown={(keyEvent) => keyEvent.key === "Escape" && setOpen(false)}
        >
          {exit.kind === "sign-out" ? (
            <>
              <p className="text-lg leading-normal font-semibold">ออกจากระบบ Kiosk นี้?</p>
              <p className="mt-1 text-sm leading-normal">
                หลังออกจากระบบ จุดนี้จะเช็คอินไม่ได้จนกว่าจะเข้าสู่ระบบด้วยบัญชี Kiosk อีกครั้ง
              </p>
            </>
          ) : (
            <>
              <p className="text-lg leading-normal font-semibold">ออกจากโหมด Kiosk?</p>
              <p className="mt-1 text-sm leading-normal">
                กลับไปหน้าเช็คอินของเจ้าหน้าที่ ที่มีช่องพิมพ์ Pass Code การเลือกวัน และเมนู
              </p>
            </>
          )}
          <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm leading-normal">
            {exit.kind === "sign-out" && (
              <li>
                เข้าสู่ระบบในชื่อ <span className="font-medium break-words">{exit.accountName}</span>
              </li>
            )}
            <li className={cn(checkInDay.chosenByStaff && "font-medium text-orange-800")}>
              {checkInDay.label === null
                ? exit.kind === "sign-out"
                  ? "วันนี้ไม่ใช่วันจัดงาน จุดนี้จะเช็คอินได้ในวันจัดงานเท่านั้น"
                  : "วันนี้ไม่ใช่วันจัดงาน การเช็คอินจะไม่สำเร็จ ออกจากโหมดนี้แล้วเลือกวันเข้าร่วมงานเพื่อทดสอบ"
                : checkInDay.chosenByStaff
                  ? `บันทึกการเช็คอินเป็น${checkInDay.label} (ไม่ใช่วันนี้)`
                  : `เช็คอินสำหรับ${checkInDay.label} (วันนี้)`}
            </li>
            <li>
              {wakeLockHeld
                ? "หน้าจอจะเปิดค้างไว้ขณะอยู่ในโหมด Kiosk"
                : "ยังสั่งให้หน้าจอเปิดค้างไม่ได้ ปิดการล็อกอัตโนมัติ (Auto-Lock) ในการตั้งค่า iPad"}
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {exit.kind === "sign-out" ? (
              <form action={signOut}>
                <SignOutButton />
              </form>
            ) : (
              <Button type="button" onClick={exit.onLeave}>
                ออกจากโหมด Kiosk
              </Button>
            )}
            <Button type="button" variant="outline" autoFocus onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Ends the Kiosk's session; `signOut` then goes to the sign-in page. */
function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
    </Button>
  );
}

/**
 * Keeps the screen on while the Kiosk shows, where the browser has the Screen Wake Lock API
 * (Safari 16.4+, Chrome). The browser drops the lock whenever the page is hidden, so it is asked
 * for again on return, and on the next tap if it was refused (some browsers want a user gesture).
 * Returns whether the lock is held.
 */
function useScreenWakeLock(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let requesting = false;
    let stopped = false;

    async function acquire() {
      if (stopped || requesting || document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;
      requesting = true;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (stopped) {
          await lock.release();
          return;
        }
        sentinel = lock;
        setHeld(true);
        lock.addEventListener("release", () => {
          if (!stopped) setHeld(false);
        });
      } catch (failure) {
        // Refused, e.g. in Low Power Mode. Tried again on the next tap or return to the page.
        console.warn("Keeping the screen on was refused", failure);
      } finally {
        requesting = false;
      }
    }

    const retry = () => void acquire();
    void acquire();
    document.addEventListener("visibilitychange", retry);
    document.addEventListener("pointerdown", retry);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", retry);
      document.removeEventListener("pointerdown", retry);
      void sentinel?.release();
    };
  }, []);

  return held;
}

// Decorative icons (lucide shapes).
function QrIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-16 shrink-0 text-white/80 tab:size-24"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
