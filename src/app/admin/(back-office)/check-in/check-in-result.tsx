// The big Check-In result Staff read at the entrance. Hook-free, so the typed form (ticket 13),
// the camera scanner (18) and Kiosk mode (19) can all render it. Text alone carries every
// result; colour and icon only reinforce it.

import Link from "next/link";
import type { ReactNode } from "react";
import { event } from "@/lib/event";
import type { CheckedInAttendee, CheckInResult } from "@/lib/registrations/check-in";
import { type AttendeeRole, attendeeRoleLabels } from "@/lib/registrations/fields";
import { cn } from "@/lib/utils";

/** What `checkInScan` returns: a Check-In outcome, or that the Staff session has ended. */
export type CheckInScanResult = CheckInResult | { status: "signed-out" };

/** One submitted scan as the page shows it: pending until its result arrives. */
export type CheckInAttempt = {
  scan: string;
  result: CheckInScanResult | { status: "failed" } | { status: "pending" };
};

// BACK_OFFICE_SIGN_IN_PATH, which lives in a server-only module; this file also renders in the browser.
export const SIGN_IN_PATH = "/admin/login";

// The form's label for "Other" asks the Attendee to specify; at the door it is just "Other".
const roleLabels: Record<AttendeeRole, string> = { ...attendeeRoleLabels, other: "อื่น ๆ" };

const eventDayLabels = new Map<string, string>(event.eventDays.map(({ date, label }) => [date, label]));
const eventDayLabel = (date: string) => eventDayLabels.get(date) ?? date;

/** "09:05" in Bangkok time, whatever the device's time zone. */
export function bangkokTime(instant: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: event.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/** Shared with the Kiosk, so its results read in the same colours. */
export type Tone = "success" | "repeat" | "warning" | "neutral";

export const tones: Record<Tone, string> = {
  success: "border-green-800 bg-green-700 text-white",
  repeat: "border-amber-500 bg-amber-300 text-neutral-950",
  warning: "border-orange-800 bg-orange-700 text-white",
  neutral: "border-neutral-400 bg-white text-neutral-950",
};

export function CheckInResultPanel({ attempt }: { attempt: CheckInAttempt }) {
  const { result, scan } = attempt;
  switch (result.status) {
    case "pending":
      return (
        <Panel tone="neutral" icon={null} headline="กำลังตรวจสอบ…">
          <ScannedText scan={scan} />
        </Panel>
      );
    case "checked-in":
      return (
        <Panel tone="success" icon={<CheckIcon />} headline="เช็คอินสำเร็จ">
          <AttendeeLines attendee={result.attendee} />
          <EventDayLine date={result.eventDay} />
        </Panel>
      );
    case "already-checked-in":
      return (
        <Panel
          tone="repeat"
          icon={<ClockIcon />}
          headline={`เช็คอินแล้วเมื่อ ${bangkokTime(result.checkedInAt)}`}
        >
          <AttendeeLines attendee={result.attendee} />
          <p className="mt-3 text-base leading-normal">
            ไม่ได้บันทึกซ้ำ ตรวจสอบว่าเป็นเจ้าของ Event Pass
            {result.outsideRegisteredDay ? " (ไม่ได้ลงทะเบียนวันนี้)" : ""}
          </p>
          <EventDayLine date={result.eventDay} />
        </Panel>
      );
    case "checked-in-outside-registered-day":
      return (
        <Panel tone="warning" icon={<AlertIcon />} headline="ไม่ได้ลงทะเบียนวันนี้">
          <p className="text-lg leading-normal font-semibold">บันทึกการเช็คอินแล้ว</p>
          <AttendeeLines attendee={result.attendee} />
          <p className="mt-3 text-base leading-normal">
            ลงทะเบียนไว้: {result.attendee.eventDays.map(eventDayLabel).join(" และ ")}
          </p>
          <EventDayLine date={result.eventDay} />
        </Panel>
      );
    case "not-an-event-pass":
      return (
        <Panel tone="neutral" icon={<CrossIcon />} headline="ไม่ใช่ Event Pass">
          <ScannedText scan={scan} />
          <p className="mt-2 text-base leading-normal">ไม่ได้บันทึกการเช็คอิน ตรวจสอบรหัสแล้วลองอีกครั้ง</p>
        </Panel>
      );
    case "not-an-event-day":
      return (
        <Panel tone="neutral" icon={<CrossIcon />} headline="วันนี้ไม่ใช่วันจัดงาน">
          <p className="text-base leading-normal">
            เลือกวันเข้าร่วมงานที่จะเช็คอินด้านบน แล้วกดเช็คอินอีกครั้ง ยังไม่ได้บันทึกการเช็คอิน
          </p>
        </Panel>
      );
    case "signed-out":
      return (
        <Panel tone="neutral" icon={<CrossIcon />} headline="หมดเวลาเข้าสู่ระบบ">
          <p className="text-base leading-normal">
            ยังไม่ได้บันทึกการเช็คอิน{" "}
            <Link href={SIGN_IN_PATH} className="font-semibold underline underline-offset-4">
              เข้าสู่ระบบอีกครั้ง
            </Link>
          </p>
        </Panel>
      );
    case "failed":
      return (
        <Panel tone="neutral" icon={<CrossIcon />} headline="เช็คอินไม่สำเร็จ">
          <p className="text-base leading-normal">
            เกิดข้อผิดพลาดในการเชื่อมต่อ ยังไม่ได้บันทึกการเช็คอิน กดเช็คอินอีกครั้ง
          </p>
        </Panel>
      );
  }
}

function Panel({
  tone,
  icon,
  headline,
  children,
}: {
  tone: Tone;
  icon: ReactNode;
  headline: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border-2 p-5 tab:p-6", tones[tone])}>
      <p className="flex items-center gap-3 text-3xl leading-tight font-bold tab:text-4xl">
        {icon}
        <span>{headline}</span>
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
        {roleLabels[attendee.role]} · <span className="font-mono tracking-wide whitespace-nowrap">{attendee.passCode}</span>
      </p>
    </>
  );
}

function EventDayLine({ date }: { date: string }) {
  return <p className="mt-3 text-sm leading-normal opacity-90">เช็คอินสำหรับ{eventDayLabel(date)}</p>;
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
function Icon({ children, className }: { children: ReactNode; className?: string }) {
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
  <Icon className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m8 12 3 3 5-6" />
  </Icon>
);

export const ClockIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Icon>
);

export const AlertIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
);

export const CrossIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </Icon>
);
