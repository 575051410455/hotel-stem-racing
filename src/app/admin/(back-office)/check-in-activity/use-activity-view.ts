"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import {
  activityViewParams,
  parseActivityView,
  type ActivityView,
} from "@/lib/registrations/check-in-activity-view";

export function useActivityView(defaultDay: ActivityView["day"]) {
  const params = useSearchParams();
  const pathname = usePathname();
  const view = useMemo(
    () => parseActivityView(params, defaultDay),
    [params, defaultDay],
  );
  const query = activityViewParams(view).toString();
  useEffect(() => {
    // Pin even an implicit default to its Event Day, so copied links remain stable tomorrow.
    if (params.toString() !== query)
      window.history.replaceState(null, "", `${pathname}?${query}`);
  }, [params, pathname, query]);
  const changeView = useCallback(
    (changes: Partial<ActivityView>) => {
      const next = activityViewParams({
        ...view,
        ...changes,
        page: changes.page ?? 1,
      }).toString();
      if (next !== query)
        window.history.pushState(null, "", `${pathname}?${next}`);
    },
    [view, query, pathname],
  );
  return [view, changeView] as const;
}
