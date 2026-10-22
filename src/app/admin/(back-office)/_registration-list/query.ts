import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { RegistrationListRow, RegistrationSearchResult } from "@/lib/registrations/search";
import {
  type RegistrationView,
  registrationViewToSearchParams,
} from "@/lib/registrations/search-params";
import { BackOfficeRequestError } from "../query-provider";

/** A list row as JSON carries it: `createdAt` is an ISO string. */
export type RegistrationListItem = Omit<RegistrationListRow, "createdAt"> & { createdAt: string };

/** GET /api/back-office/registrations: `RegistrationSearchResult` as JSON. */
export type RegistrationListPage = Omit<RegistrationSearchResult, "rows"> & {
  rows: RegistrationListItem[];
};

export const REGISTRATION_LIST_ENDPOINT = "/api/back-office/registrations";

async function fetchRegistrationList(
  view: RegistrationView,
  signal: AbortSignal,
): Promise<RegistrationListPage> {
  const query = registrationViewToSearchParams(view).toString();
  const response = await fetch(query ? `${REGISTRATION_LIST_ENDPOINT}?${query}` : REGISTRATION_LIST_ENDPOINT, {
    signal,
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new BackOfficeRequestError(response.status);
  return response.json();
}

/**
 * Every cached list page sits under this key, so a row action (delete, resend, …) can refresh
 * them all: `queryClient.invalidateQueries({ queryKey: registrationListKey })`.
 */
export const registrationListKey = ["back-office", "registrations"] as const;

export function registrationListQuery(view: RegistrationView) {
  return queryOptions({
    queryKey: [...registrationListKey, view] as const,
    queryFn: ({ signal }) => fetchRegistrationList(view, signal),
    // The page on screen stays (dimmed) while the next one loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });
}
