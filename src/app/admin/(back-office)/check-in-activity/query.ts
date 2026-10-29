import { queryOptions } from "@tanstack/react-query";
import type { CheckInActivityResult } from "@/lib/registrations/check-in-activity";
import {
  activityViewParams,
  type ActivityView,
} from "@/lib/registrations/check-in-activity-view";
import { BackOfficeRequestError } from "../query-provider";

export type ActivityRow = Omit<
  CheckInActivityResult["rows"][number],
  "checkedInAt"
> & { checkedInAt: string };
export type ActivityPage = Omit<CheckInActivityResult, "rows"> & {
  rows: ActivityRow[];
};

export function activityQuery(view: ActivityView) {
  return queryOptions({
    queryKey: ["check-in-activity", view] as const,
    queryFn: async ({ signal }): Promise<ActivityPage> => {
      const response = await fetch(
        `/api/back-office/check-in-activity?${activityViewParams(view)}`,
        {
          signal,
          cache: "no-store",
          headers: { accept: "application/json" },
        },
      );
      if (!response.ok) throw new BackOfficeRequestError(response.status);
      return response.json();
    },
    refetchInterval: (query) =>
      query.state.error instanceof BackOfficeRequestError &&
      query.state.error.status === 401
        ? false
        : 15_000,
    refetchIntervalInBackground: false,
  });
}
