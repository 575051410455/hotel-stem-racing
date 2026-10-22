import type { Ref } from "react";
import { contactChannels } from "@/lib/contact";
import { event } from "@/lib/event";

/**
 * Shown instead of the registration form once the last Event Day has ended: rendered by `/`,
 * and by the form itself when a submission comes back "registration closed".
 */
export function RegistrationClosed({ ref }: { ref?: Ref<HTMLElement> }) {
  const channels = contactChannels();

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="registration-closed-title"
      className="mx-auto flex w-[min(100%,528px)] flex-col gap-4 rounded-input border border-line bg-surface p-5 tab:p-8"
    >
      <h2 id="registration-closed-title" className="text-[1.125rem] font-black italic tab:text-[1.25rem]">
        ปิดรับลงทะเบียนแล้ว
      </h2>
      <p>ขณะนี้ปิดรับลงทะเบียนเข้าร่วมงาน {event.name} แล้ว ขอขอบคุณทุกท่านที่ให้ความสนใจ</p>
      {channels.length > 0 && (
        <div className="flex flex-col gap-2">
          <p>หากมีข้อสงสัย กรุณาติดต่อผู้จัดงาน</p>
          <ul aria-label="ช่องทางติดต่อผู้จัดงาน" className="flex flex-col gap-2">
            {channels.map((channel) => (
              <li key={channel.kind}>
                <a href={channel.href} className="font-bold text-link underline">
                  {channel.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
