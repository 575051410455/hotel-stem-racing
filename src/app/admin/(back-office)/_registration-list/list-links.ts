// Links between the Registration list (/admin) and a Registration's detail. Pure; safe in browser
// and server. The detail URL carries the list's view in the same query keys as /admin, so "back to
// the list" and the return after a delete land on the same search, filters, sort and page.

import { normalisePassCode } from "@/lib/registrations/event-pass-codec";
import {
  parseRegistrationView,
  registrationViewToSearchParams,
} from "@/lib/registrations/search-params";

export const REGISTRATION_LIST_PATH = "/admin";

/** `/admin?deleted=EP-…`: the list says that Registration was deleted (no name in the URL). */
const DELETED_PARAM = "deleted";

/** Only the list's own keys, cleaned up the way the list reads them; anything else is dropped. */
function listQuery(params: Iterable<[string, string]>): URLSearchParams {
  return registrationViewToSearchParams(parseRegistrationView(params));
}

const withQuery = (path: string, query: URLSearchParams) => {
  const text = query.toString();
  return text ? `${path}?${text}` : path;
};

/** `/admin/registrations/12?q=…`: the detail, remembering the list view it was opened from. */
export function registrationDetailHref(id: number, listParams: Iterable<[string, string]>): string {
  return withQuery(`${REGISTRATION_LIST_PATH}/registrations/${id}`, listQuery(listParams));
}

/** Back to the list view the detail was opened from; with `deletedPassCode`, saying it was deleted. */
export function registrationListHref(detailParams: Iterable<[string, string]>, deletedPassCode?: string): string {
  const query = listQuery(detailParams);
  if (deletedPassCode) query.set(DELETED_PARAM, deletedPassCode);
  return withQuery(REGISTRATION_LIST_PATH, query);
}

/** The Pass Code in `?deleted=`, or null when there is none (or it isn't a Pass Code). */
export function deletedPassCodeIn(params: URLSearchParams): string | null {
  const value = params.get(DELETED_PARAM);
  return value ? normalisePassCode(value) : null;
}

/** The same URL without `?deleted=`, once its toast has shown. */
export function withoutDeletedParam(pathname: string, params: URLSearchParams): string {
  const rest = new URLSearchParams(params);
  rest.delete(DELETED_PARAM);
  return withQuery(pathname, rest);
}
