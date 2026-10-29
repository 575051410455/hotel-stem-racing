// Browser-safe contract shared by Check-In Activity's URL, endpoint and Registration module.
import { z } from "zod";
import { bangkokDate } from "@/lib/bangkok-time";
import { event } from "@/lib/event";
import { attendeeRoles } from "./fields";

export const activityPageSizes = [25, 50, 100] as const;
export const ACTIVITY_QUERY_LIMIT = 100;
const days = event.eventDays.map((day) => day.date);
const query = z
  .string()
  .trim()
  .max(ACTIVITY_QUERY_LIMIT)
  .transform((value) => value.normalize("NFC").replace(/\s+/g, " "))
  .optional();
const fields = {
  day: z.enum(days),
  q: query,
  role: z.enum(attendeeRoles).optional(),
  account: z.string().trim().min(1).max(128).optional(),
  outside: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
};
const requestSchema = z.object(fields);
export type ActivityView = z.infer<typeof requestSchema>;

/** Today in Bangkok, otherwise the next configured Event Day, or the last after the Event. */
export function defaultActivityDay(now: Date): ActivityView["day"] {
  const today = bangkokDate(now);
  return days.find((day) => day >= today) ?? days[days.length - 1];
}

const values = (params: Iterable<[string, string]>) =>
  Object.fromEntries([...params].filter(([, value]) => value !== ""));

/** Strict HTTP input; unknown keys are ignored, invalid known values are rejected. */
export function parseActivityRequest(params: Iterable<[string, string]>) {
  return requestSchema.safeParse(values(params));
}

/** Stale or hand-edited page links recover each bad field independently. */
export function parseActivityView(
  params: Iterable<[string, string]>,
  defaultDay: ActivityView["day"],
): ActivityView {
  return z
    .object({
      day: fields.day.catch(defaultDay),
      q: z
        .string()
        .transform(
          (value) =>
            value
              .trim()
              .slice(0, ACTIVITY_QUERY_LIMIT)
              .normalize("NFC")
              .replace(/\s+/g, " ") || undefined,
        )
        .optional(),
      role: fields.role.catch(undefined),
      account: fields.account.catch(undefined),
      outside: fields.outside.catch(undefined),
      page: fields.page.catch(1),
      pageSize: fields.pageSize.catch(25),
    })
    .parse(values(params));
}

/** Always include the selected day, so sharing an initial view preserves it after midnight. */
export function activityViewParams(view: ActivityView): URLSearchParams {
  const params = new URLSearchParams({ day: view.day });
  if (view.q) params.set("q", view.q);
  if (view.role) params.set("role", view.role);
  if (view.account) params.set("account", view.account);
  if (view.outside !== undefined) params.set("outside", String(view.outside));
  if (view.page !== 1) params.set("page", String(view.page));
  if (view.pageSize !== 25) params.set("pageSize", String(view.pageSize));
  return params;
}
