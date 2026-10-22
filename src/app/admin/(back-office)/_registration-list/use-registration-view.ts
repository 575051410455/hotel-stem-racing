"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  parseRegistrationView,
  type RegistrationView,
  registrationViewToSearchParams,
} from "@/lib/registrations/search-params";

/**
 * The list's search, filters, sort and page, kept in the URL so refresh, back and shared links
 * show the same view. Changes go through `history.pushState`, which Next's router picks up
 * (useSearchParams updates) without a server round trip; TanStack Query then fetches the rows.
 * Uses useSearchParams, so render it below a <Suspense> boundary.
 */
export function useRegistrationView() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const view = useMemo(() => parseRegistrationView(searchParams), [searchParams]);

  /** Applies `changes`; anything other than a page change starts again from page 1. */
  const changeView = useCallback(
    (changes: Partial<RegistrationView>) => {
      const next: RegistrationView = { ...view, ...changes, page: changes.page ?? 1 };
      const query = registrationViewToSearchParams(next).toString();
      if (query === registrationViewToSearchParams(view).toString()) return;
      window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [view, pathname],
  );

  return [view, changeView] as const;
}
