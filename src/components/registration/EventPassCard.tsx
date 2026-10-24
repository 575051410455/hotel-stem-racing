import QRCode from "react-qr-code";
import { eventDayLabel } from "@/lib/event";
import type { Language } from "@/lib/language";
import type { EventPass } from "@/lib/registrations/registrations";
import { DownloadEventPass } from "./DownloadEventPass";

/** The download button redraws this QR onto the card image, so both encode the same link. */
const qrId = "event-pass-qr";

/** The card's wording, from the page's dictionary. `{passCode}` and `{file}` are filled in here and by the button. */
export type EventPassCardCopy = {
  title: string;
  dateAndVenue: string;
  venue: string;
  qrName: string;
  passCodeLabel: string;
  passCodeHint: string;
  nameLabel: string;
  daysLabel: string;
  saveButton: string;
  saving: string;
  fileHint: string;
  downloadStarted: string;
  preview: string;
  saveFailed: string;
  imageAlt: string;
};

/**
 * The Event Pass an Attendee shows at the door: QR, Pass Code, name and Event Days, in the page's
 * language. It never shows email or phone, so sharing the link exposes no contact details.
 */
export function EventPassCard({
  pass,
  link,
  language,
  copy,
}: {
  pass: EventPass;
  link: string;
  language: Language;
  copy: EventPassCardCopy;
}) {
  const withPassCode = (template: string) => template.replace("{passCode}", pass.passCode);

  return (
    <article
      aria-labelledby="event-pass-heading"
      className="mx-auto flex w-[min(100%,528px)] flex-col overflow-hidden rounded-input border border-line bg-surface"
    >
      <div aria-hidden="true" className="bg-brand-gradient h-1.5" />
      <div className="flex flex-col items-center gap-6 p-5 text-center tab:p-8">
        <div className="flex flex-col gap-1">
          <h2 id="event-pass-heading" className="text-[1.125rem] font-black italic tab:text-[1.25rem]">
            {copy.title}
          </h2>
          <p className="text-muted">{copy.dateAndVenue}</p>
        </div>

        <div className="w-full max-w-[280px] bg-white p-4">
          <QRCode
            id={qrId}
            value={link}
            level="M"
            size={248}
            role="img"
            aria-label={withPassCode(copy.qrName)}
            className="h-auto w-full"
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[0.875rem] text-muted">{copy.passCodeLabel}</p>
          <p className="font-mono text-[1.75rem] font-bold tracking-[0.06em] text-ink-pure tab:text-[2rem]">
            {pass.passCode}
          </p>
          <p className="text-[0.875rem] text-muted">{copy.passCodeHint}</p>
        </div>

        <dl className="flex w-full flex-col gap-4 border-t border-line pt-6 text-left">
          <div className="flex flex-col gap-1">
            <dt className="text-[0.875rem] text-muted">{copy.nameLabel}</dt>
            <dd className="text-[1.125rem] font-bold break-words">
              {pass.givenName} {pass.familyName}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-[0.875rem] text-muted">{copy.daysLabel}</dt>
            <dd>
              <ul className="flex flex-col gap-1 font-bold">
                {pass.eventDays.map((date) => (
                  <li key={date}>{eventDayLabel(date, language)}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        <DownloadEventPass
          qrId={qrId}
          passCode={pass.passCode}
          attendeeName={`${pass.givenName} ${pass.familyName}`}
          eventDayLabels={pass.eventDays.map((date) => eventDayLabel(date, language))}
          copy={{
            saveButton: copy.saveButton,
            saving: copy.saving,
            fileHint: copy.fileHint,
            downloadStarted: copy.downloadStarted,
            preview: copy.preview,
            saveFailed: copy.saveFailed,
            imageAlt: withPassCode(copy.imageAlt),
            imageTitle: copy.title,
            imageVenue: copy.venue,
            imagePassCodeLabel: copy.passCodeLabel,
          }}
        />
      </div>
    </article>
  );
}
