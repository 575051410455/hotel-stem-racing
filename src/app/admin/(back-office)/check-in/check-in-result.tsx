// The big Check-In result Staff read at the entrance. Hook-free, so the typed form (ticket 13),
// the camera scanner (18) and Kiosk mode (19) can all render it. Text alone carries every
// result; colour and icon only reinforce it.

import Link from "next/link";
import type { ReactNode } from "react";
import { SIGN_IN_PATH } from "@/lib/auth/access";
import { bangkokTime } from "@/lib/bangkok-time";
import { eventDayLabel } from "@/lib/event";
import type { CheckedInAttendee, CheckInResult } from "@/lib/registrations/check-in";
import { attendeeRoleShortLabels } from "@/lib/registrations/fields";
import { cn } from "@/lib/utils";

/** What `checkInScan` returns: a Check-In outcome, or that the Staff session has ended. */
export type CheckInScanResult = CheckInResult | { status: "signed-out" };

/** One submitted scan as the page shows it: pending until its result arrives. */
export type CheckInAttempt = {
  scan: string;
  result: CheckInScanResult | { status: "failed" } | { status: "pending" };
};

/** Shared with the Kiosk, so its results read in the same colours. */
export type Tone = "success" | "repeat" | "warning" | "neutral";

export const tones: Record<Tone, string> = {
  success: "border-green-800 bg-green-700 text-white",
  repeat: "border-amber-500 bg-amber-300 text-neutral-950",
  warning: "border-orange-800 bg-orange-700 text-white",
  neutral: "border-neutral-400 bg-white text-neutral-950",
};

/** What the desk and the Kiosk show alike for a result: its colour, icon and headline. */
export type CheckInHeading = {
  tone: Tone;
  Icon: ((props: { className?: string }) => ReactNode) | null;
  thai: string;
  /** The Kiosk's second line, for Attendees who don't read Thai. */
  english: string;
};

export function checkInHeading(result: CheckInAttempt["result"]): CheckInHeading {
  switch (result.status) {
    case "pending":
      return { tone: "neutral", Icon: null, thai: "กำลังตรวจสอบ…", english: "Checking…" };
    case "checked-in":
      return { tone: "success", Icon: CheckIcon, thai: "เช็คอินสำเร็จ", english: "You’re checked in" };
    case "already-checked-in": {
      const time = bangkokTime(result.checkedInAt);
      return {
        tone: "repeat",
        Icon: ClockIcon,
        thai: `เช็คอินแล้วเมื่อ ${time}`,
        english: `Already checked in at ${time}`,
      };
    }
    case "checked-in-outside-registered-day":
      return { tone: "warning", Icon: AlertIcon, thai: "ไม่ได้ลงทะเบียนวันนี้", english: "Not registered for today" };
    case "not-an-event-pass":
      return { tone: "neutral", Icon: CrossIcon, thai: "ไม่ใช่ Event Pass", english: "Not an Event Pass" };
    case "not-an-event-day":
      return { tone: "neutral", Icon: CrossIcon, thai: "วันนี้ไม่ใช่วันจัดงาน", english: "Today isn’t an Event Day" };
    case "failed":
      return { tone: "neutral", Icon: CrossIcon, thai: "เช็คอินไม่สำเร็จ", english: "Check-in didn’t go through" };
    case "signed-out":
      return { tone: "neutral", Icon: CrossIcon, thai: "หมดเวลาเข้าสู่ระบบ", english: "Session expired" };
  }
}

export function CheckInResultPanel({ attempt }: { attempt: CheckInAttempt }) {
  return <Panel heading={checkInHeading(attempt.result)}>{panelDetails(attempt)}</Panel>;
}

/** What Staff need under the headline: who it is, and what to do next. */
function panelDetails({ result, scan }: CheckInAttempt): ReactNode {
  switch (result.status) {
    case "pending":
      return <ScannedText scan={scan} />;
    case "checked-in":
      return (
        <>
          <AttendeeLines attendee={result.attendee} />
          <EventDayLine date={result.eventDay} />
        </>
      );
    case "already-checked-in":
      return (
        <>
          <AttendeeLines attendee={result.attendee} />
          <p className="mt-3 text-base leading-normal">
            ไม่ได้บันทึกซ้ำ ตรวจสอบว่าเป็นเจ้าของ Event Pass
            {result.outsideRegisteredDay ? " (ไม่ได้ลงทะเบียนวันนี้)" : ""}
          </p>
          <EventDayLine date={result.eventDay} />
        </>
      );
    case "checked-in-outside-registered-day":
      return (
        <>
          <p className="text-lg leading-normal font-semibold">บันทึกการเช็คอินแล้ว</p>
          <AttendeeLines attendee={result.attendee} />
          <p className="mt-3 text-base leading-normal">
            ลงทะเบียนไว้: {result.attendee.eventDays.map((day) => eventDayLabel(day, "th")).join(" และ ")}
          </p>
          <EventDayLine date={result.eventDay} />
        </>
      );
    case "not-an-event-pass":
      return (
        <>
          <ScannedText scan={scan} />
          <p className="mt-2 text-base leading-normal">ไม่ได้บันทึกการเช็คอิน ตรวจสอบรหัสแล้วลองอีกครั้ง</p>
        </>
      );
    case "not-an-event-day":
      return (
        <p className="text-base leading-normal">
          เลือกวันเข้าร่วมงานที่จะเช็คอินด้านบน แล้วกดเช็คอินอีกครั้ง ยังไม่ได้บันทึกการเช็คอิน
        </p>
      );
    case "signed-out":
      return (
        <p className="text-base leading-normal">
          ยังไม่ได้บันทึกการเช็คอิน{" "}
          <Link href={SIGN_IN_PATH} className="font-semibold underline underline-offset-4">
            เข้าสู่ระบบอีกครั้ง
          </Link>
        </p>
      );
    case "failed":
      return (
        <p className="text-base leading-normal">
          เกิดข้อผิดพลาดในการเชื่อมต่อ ยังไม่ได้บันทึกการเช็คอิน กดเช็คอินอีกครั้ง
        </p>
      );
  }
}

function Panel({ heading: { tone, Icon, thai }, children }: { heading: CheckInHeading; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border-2 p-5 tab:p-6", tones[tone])}>
      <p className="flex items-center gap-3 text-3xl leading-tight font-bold tab:text-4xl">
        {Icon && <Icon />}
        <span>{thai}</span>
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function AttendeeLines({ attendee }: { attendee: CheckedInAttendee }) {
  return (
    <>
      <p className="text-2xl leading-normal font-semibold break-words tab:text-3xl">
        {attendee.givenName} {attendee.familyName}
      </p>
      <p className="text-lg leading-normal">
        {attendeeRoleShortLabels.th[attendee.role]} · <span className="font-mono tracking-wide whitespace-nowrap">{attendee.passCode}</span>
      </p>
    </>
  );
}

function EventDayLine({ date }: { date: string }) {
  return <p className="mt-3 text-sm leading-normal opacity-90">เช็คอินสำหรับ{eventDayLabel(date, "th")}</p>;
}

function ScannedText({ scan }: { scan: string }) {
  const shown = scan.trim();
  return (
    <p className="font-mono text-base leading-normal break-all">
      “{shown.length > 80 ? `${shown.slice(0, 80)}…` : shown}”
    </p>
  );
}

// Icons (lucide shapes, 36px unless sized), decorative: the headline says it all.
function IconFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-9 shrink-0", className)}
    >
      {children}
    </svg>
  );
}

export const CheckIcon = ({ className }: { className?: string }) => (
  <IconFrame className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m8 12 3 3 5-6" />
  </IconFrame>
);

export const ClockIcon = ({ className }: { className?: string }) => (
  <IconFrame className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </IconFrame>
);

export const AlertIcon = ({ className }: { className?: string }) => (
  <IconFrame className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </IconFrame>
);

export const CrossIcon = ({ className }: { className?: string }) => (
  <IconFrame className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </IconFrame>
);
