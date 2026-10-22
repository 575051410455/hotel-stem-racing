import QRCode from "react-qr-code";
import { event } from "@/lib/event";
import type { EventPass } from "@/lib/registrations/registrations";

const eventDayLabel = (date: string) =>
  event.eventDays.find((day) => day.date === date)?.label ?? date;

/**
 * The Event Pass an Attendee shows at the door: QR, Pass Code, name and Event Days.
 * It never shows email or phone, so sharing the link exposes no contact details.
 */
export function EventPassCard({ pass, link }: { pass: EventPass; link: string }) {
  return (
    <article
      aria-labelledby="event-pass-heading"
      className="mx-auto flex w-[min(100%,528px)] flex-col overflow-hidden rounded-input border border-line bg-surface"
    >
      <div aria-hidden="true" className="bg-brand-gradient h-1.5" />
      <div className="flex flex-col items-center gap-6 p-5 text-center tab:p-8">
        <div className="flex flex-col gap-1">
          <h2 id="event-pass-heading" className="text-[1.125rem] font-black italic tab:text-[1.25rem]">
            บัตรเข้างาน {event.name}
          </h2>
          <p className="text-muted">
            วันที่ {event.dateRangeLabel} · {event.venue}
          </p>
        </div>

        <div className="w-full max-w-[280px] bg-white p-4">
          <QRCode
            value={link}
            level="M"
            size={248}
            role="img"
            aria-label={`QR บัตรเข้างาน รหัส ${pass.passCode}`}
            className="h-auto w-full"
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[0.875rem] text-muted">รหัส Event Pass</p>
          <p className="font-mono text-[1.75rem] font-bold tracking-[0.06em] text-ink-pure tab:text-[2rem]">
            {pass.passCode}
          </p>
          <p className="text-[0.875rem] text-muted">ถ้าสแกนไม่ได้ แจ้งรหัสนี้</p>
        </div>

        <dl className="flex w-full flex-col gap-4 border-t border-line pt-6 text-left">
          <div className="flex flex-col gap-1">
            <dt className="text-[0.875rem] text-muted">ชื่อ–นามสกุล</dt>
            <dd className="text-[1.125rem] font-bold break-words">
              {pass.givenName} {pass.familyName}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-[0.875rem] text-muted">วันที่เข้าร่วมงาน</dt>
            <dd>
              <ul className="flex flex-col gap-1 font-bold">
                {pass.eventDays.map((date) => (
                  <li key={date}>{eventDayLabel(date)}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
