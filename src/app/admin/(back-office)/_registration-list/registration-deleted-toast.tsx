"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toastSuccess } from "../_shell/toasts";
import { deletedPassCodeIn, withoutDeletedParam } from "./list-links";

/**
 * "ลบการลงทะเบียน EP-… แล้ว" as a toast on /admin after a delete on the detail page, read from
 * `?deleted=`. Once shown, the parameter leaves the URL (replacing the entry), so neither a reload
 * nor Back shows it again. An Effect, so a page Next keeps hidden (Activity) can't fire it; the
 * toast's id dedupes a second run (Strict Mode). Renders nothing.
 * Uses useSearchParams, so render it below a <Suspense> boundary.
 */
export function RegistrationDeletedToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const passCode = deletedPassCodeIn(searchParams);

  useEffect(() => {
    if (!passCode) return;
    toastSuccess(
      <>
        ลบการลงทะเบียน <span className="font-mono">{passCode}</span> แล้ว
      </>,
      { id: `registration-deleted-${passCode}` },
    );
    window.history.replaceState(null, "", withoutDeletedParam(pathname, searchParams));
  }, [passCode, pathname, searchParams]);

  return null;
}
