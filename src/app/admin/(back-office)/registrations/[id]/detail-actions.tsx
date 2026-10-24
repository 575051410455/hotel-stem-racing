"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EventPassEmailStatus, ResendEventPass } from "../../_registration-list/event-pass-email";

/**
 * The Event Pass link, to share with an Attendee who lost theirs: open it, or copy it into a
 * chat. Anyone with the link can open the pass, so it is shown on this Admin-only page only.
 */
export function EventPassLink({ link }: { link: string }) {
  const [copied, setCopied] = useState<"copied" | "failed" | null>(null);
  const resetTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function copy() {
    window.clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(link);
      setCopied("copied");
      resetTimer.current = window.setTimeout(() => setCopied(null), 3000);
    } catch {
      // No clipboard (an insecure origin, or permission refused): the link is selectable text.
      setCopied("failed");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-sm leading-normal wrap-anywhere select-all">{link}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied === "copied" ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
          คัดลอกลิงก์
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={link} target="_blank" rel="noreferrer">
            <ExternalLinkIcon aria-hidden="true" />
            เปิด Event Pass
          </a>
        </Button>
        <p role="status" className="text-sm leading-normal">
          {copied === "copied" && <span className="text-success">คัดลอกลิงก์แล้ว</span>}
          {copied === "failed" && <span className="text-destructive">คัดลอกไม่ได้ เลือกลิงก์ด้านบนแล้วคัดลอกเอง</span>}
        </p>
      </div>
    </div>
  );
}

/**
 * Ticket 16's email status and "ส่งอีกครั้ง", as on the list. The status here is server-rendered:
 * a successful send refreshes the page's server data (in ResendEventPass) to show the new count.
 */
export function DetailEventPassEmail({
  registrationId,
  email,
  emailSentCount,
  lastEmailSentAt,
}: {
  registrationId: number;
  email: string;
  emailSentCount: number;
  lastEmailSentAt: string | null;
}) {
  return (
    <div className="flex flex-col items-start gap-3 text-sm">
      <EventPassEmailStatus emailSentCount={emailSentCount} lastEmailSentAt={lastEmailSentAt} />
      <ResendEventPass registrationId={registrationId} email={email} />
    </div>
  );
}
