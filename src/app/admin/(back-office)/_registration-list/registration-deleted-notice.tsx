"use client";

import { XIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { deletedPassCodeIn, withoutDeletedNotice } from "./list-links";

/**
 * "ลบการลงทะเบียน EP-… แล้ว" on /admin after a delete on the detail page, read from `?deleted=`.
 * Derived from the URL rather than state, so a page kept alive by Next (Activity) can't show a
 * stale notice. It takes focus when it appears; any change to the list view, or ปิด, removes it.
 * Uses useSearchParams, so render it below a <Suspense> boundary.
 */
export function RegistrationDeletedNotice() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const passCode = deletedPassCodeIn(searchParams);
  const notice = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (passCode) notice.current?.focus();
  }, [passCode]);

  if (!passCode) return null;

  return (
    <div
      ref={notice}
      tabIndex={-1}
      role="status"
      className="mt-6 flex items-center justify-between gap-3 rounded-md border border-success/40 bg-success/5 py-2 pr-2 pl-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <p className="min-w-0 text-sm leading-normal text-success">
        ลบการลงทะเบียน <span className="font-mono font-medium">{passCode}</span> แล้ว
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="ปิดข้อความ"
        title="ปิดข้อความ"
        onClick={() => window.history.replaceState(null, "", withoutDeletedNotice(pathname, searchParams))}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
