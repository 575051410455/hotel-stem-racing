import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { RegistrationListRow, RegistrationSearchResult } from "@/lib/registrations/search";
import {
  type RegistrationView,
  registrationViewToSearchParams,
} from "@/lib/registrations/search-params";
import { BackOfficeRequestError } from "../query-provider";
import { REGISTRATION_LIST_ENDPOINT, registrationListKey } from "./list-endpoint";

/** A list row as JSON carries it: `createdAt` and `lastEmailSentAt` are ISO strings. */
export type RegistrationListItem = Omit<RegistrationListRow, "createdAt" | "lastEmailSentAt"> & {
  createdAt: string;
  lastEmailSentAt: string | null;
};

/** GET /api/back-office/registrations: `RegistrationSearchResult` as JSON. */
export type RegistrationListPage = Omit<RegistrationSearchResult, "rows"> & {
  rows: RegistrationListItem[];
};

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

export function registrationListQuery(view: RegistrationView) {
  return queryOptions({
    queryKey: [...registrationListKey, view] as const,
    queryFn: ({ signal }) => fetchRegistrationList(view, signal),
    // The page on screen stays (dimmed) while the next one loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });
}
