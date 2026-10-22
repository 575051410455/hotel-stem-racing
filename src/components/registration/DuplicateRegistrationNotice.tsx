import type { Ref } from "react";
import { type ContactChannel, contactChannels } from "@/lib/contact";
import type { RegistrationFormState } from "./form-state";

export type DuplicateRegistrationState = Extract<RegistrationFormState, { status: "duplicate" }>;

function ContactChannelList({ channels }: { channels: ContactChannel[] }) {
  return (
    <ul aria-label="ช่องทางติดต่อผู้จัดงาน" className="flex flex-col gap-2">
      {channels.map((channel) => (
        <li key={channel.kind}>
          <a href={channel.href} className="font-bold text-link underline">
            {channel.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Shown instead of the registration form when a submission is a Duplicate Registration. It never
 * shows the Event Pass: that only goes to the registered email, which appears masked.
 */
export function DuplicateRegistrationNotice({
  result,
  ref,
}: {
  result: DuplicateRegistrationState;
  ref?: Ref<HTMLElement>;
}) {
  const channels = contactChannels();
  const email = <strong className="[overflow-wrap:anywhere]">{result.maskedEmail}</strong>;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="duplicate-registration-title"
      className="mx-auto flex w-[min(100%,528px)] flex-col gap-4 rounded-input border border-line bg-surface p-5 tab:p-8"
    >
      <h2 id="duplicate-registration-title" className="text-[1.125rem] font-black italic tab:text-[1.25rem]">
        ท่านลงทะเบียนแล้ว
      </h2>

      {result.passResent ? (
        <div className="flex flex-col gap-2">
          <p>เราได้ส่ง Event Pass ไปที่ {email} อีกครั้ง</p>
          <p className="text-[0.875rem] text-muted">หากไม่พบในกล่องจดหมาย กรุณาตรวจสอบโฟลเดอร์จดหมายขยะ (Spam)</p>
        </div>
      ) : result.emailConfigured ? (
        // Re-sent less than 10 minutes ago, or the re-send failed.
        <p>
          กรุณาตรวจสอบ Event Pass ในกล่องจดหมายของอีเมลที่ท่านใช้ลงทะเบียน ({email})
          รวมถึงโฟลเดอร์จดหมายขยะ (Spam)
        </p>
      ) : (
        <p>ท่านลงทะเบียนไว้ด้วยอีเมล {email}</p>
      )}

      {/* Without email, the organisers are the way to the pass; otherwise a fallback. */}
      {(!result.emailConfigured || (!result.passResent && channels.length > 0)) && (
        <div className="flex flex-col gap-2">
          <p>
            {result.emailConfigured
              ? "หากยังไม่พบ กรุณาติดต่อผู้จัดงาน"
              : "หากต้องการรับ Event Pass อีกครั้ง กรุณาติดต่อผู้จัดงาน"}
          </p>
          {channels.length > 0 && <ContactChannelList channels={channels} />}
        </div>
      )}

      <p>
        {/* A full page load on purpose: a <Link> to the same route would keep this form's state. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="font-bold text-link underline">
          ลงทะเบียนให้ผู้อื่น
        </a>
      </p>
    </section>
  );
}
