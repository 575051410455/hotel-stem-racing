// What a Back Office search of Registrations asks for, and how it travels in a URL. Pure and
// browser-safe: the Registration module, the Admin-only endpoint and the /admin page all use it.

import { z } from "zod";
import { event } from "@/lib/event";
import { type AttendeeRole, attendeeRoles } from "./fields";

/** ISO date of one Event Day, e.g. "2026-10-31". */
export type EventDayDate = (typeof event.eventDays)[number]["date"];

/** Columns the list can be sorted on. Anything else is never sent to the database. */
export const registrationSortColumns = ["createdAt", "familyName", "givenName"] as const;
export type RegistrationSortColumn = (typeof registrationSortColumns)[number];
export type SortDirection = "asc" | "desc";

/** `<column>.<direction>`, as it appears in `?sort=`. */
export type RegistrationSort = `${RegistrationSortColumn}.${SortDirection}`;

export const registrationSorts = [
  "createdAt.desc",
  "createdAt.asc",
  "familyName.asc",
  "familyName.desc",
  "givenName.asc",
  "givenName.desc",
] as const satisfies readonly RegistrationSort[];

/** Newest first. */
export const DEFAULT_REGISTRATION_SORT: RegistrationSort = "createdAt.desc";

export const PAGE_SIZE_LIMITS = { min: 10, max: 100 } as const;
export const DEFAULT_PAGE_SIZE = 25;
/** The page sizes the Back Office offers; any size within PAGE_SIZE_LIMITS is accepted. */
export const pageSizeOptions = [10, 25, 50, 100] as const;

export type RegistrationSearch = {
  /** Matches given name, family name, phone, email or Pass Code. Blank means everything. */
  q?: string;
  /** Only Registrations that chose this Event Day. */
  day?: EventDayDate;
  role?: AttendeeRole;
  /** Defaults to newest first. */
  sort?: RegistrationSort;
  /** 1-based. Below 1 reads as 1. */
  page: number;
  /** Clamped to PAGE_SIZE_LIMITS. */
  pageSize: number;
};

export function clampPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(PAGE_SIZE_LIMITS.max, Math.max(PAGE_SIZE_LIMITS.min, Math.trunc(pageSize)));
}

export function clampPage(page: number): number {
  return Number.isSafeInteger(page) && page > 1 ? page : 1;
}

// ---- In the URL: ?q=&day=&role=&sort=&page=&pageSize= ----

/** Longer searches are cut; nobody's name, email or phone is this long. */
export const MAX_QUERY_LENGTH = 100;

const eventDayDates = event.eventDays.map((day) => day.date);

const searchParamSchemas = {
  q: z.string().trim().max(MAX_QUERY_LENGTH).optional(),
  day: z.enum(eventDayDates).optional(),
  role: z.enum(attendeeRoles).optional(),
  sort: z.enum(registrationSorts).default(DEFAULT_REGISTRATION_SORT),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(DEFAULT_PAGE_SIZE),
};

/** A Registration search as the list shows it: every field resolved, page size clamped. */
export type RegistrationView = RegistrationSearch & { sort: RegistrationSort };

/** Query-string pairs as an object, without empty values (`?role=` means no role filter). */
function paramsObject(params: Iterable<[string, string]>): Record<string, string> {
  return Object.fromEntries([...params].filter(([, value]) => value !== ""));
}

/**
 * Strict: what the Admin-only endpoint accepts. Unknown keys are ignored; a known key with a
 * bad value fails, so a client bug shows up as a 400 instead of a silently different list.
 */
export const registrationSearchSchema = z.object(searchParamSchemas);

export function parseRegistrationSearchParams(params: Iterable<[string, string]>) {
  return registrationSearchSchema.safeParse(paramsObject(params));
}

/**
 * Lenient: the view in the /admin address bar. A hand-edited or stale link never breaks the
 * page; each bad value falls back to its default on its own.
 */
const registrationViewSchema = z.object({
  q: z
    .string()
    .transform((q) => q.trim().slice(0, MAX_QUERY_LENGTH) || undefined)
    .optional()
    .catch(undefined),
  day: searchParamSchemas.day.catch(undefined),
  role: searchParamSchemas.role.catch(undefined),
  sort: searchParamSchemas.sort.catch(DEFAULT_REGISTRATION_SORT),
  page: searchParamSchemas.page.catch(1),
  pageSize: searchParamSchemas.pageSize.transform(clampPageSize).catch(DEFAULT_PAGE_SIZE),
});

export function parseRegistrationView(params: Iterable<[string, string]>): RegistrationView {
  return registrationViewSchema.parse(paramsObject(params));
}

/** The query string for `view`, leaving out defaults so links stay short (`?role=teacher`). */
export function registrationViewToSearchParams(view: RegistrationView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.q) params.set("q", view.q);
  if (view.day) params.set("day", view.day);
  if (view.role) params.set("role", view.role);
  if (view.sort !== DEFAULT_REGISTRATION_SORT) params.set("sort", view.sort);
  if (view.page > 1) params.set("page", String(view.page));
  if (view.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(view.pageSize));
  return params;
}
