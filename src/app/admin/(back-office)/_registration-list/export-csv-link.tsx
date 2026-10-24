import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PAGE_SIZE,
  type RegistrationView,
  registrationViewToSearchParams,
} from "@/lib/registrations/search-params";

export const REGISTRATION_EXPORT_ENDPOINT = "/api/back-office/registrations/export";

/** The export of `view`: its search, filters and sort. An export has no pages, so they're left out. */
export function registrationExportHref(view: RegistrationView): string {
  const query = registrationViewToSearchParams({
    ...view,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  }).toString();
  return query ? `${REGISTRATION_EXPORT_ENDPOINT}?${query}` : REGISTRATION_EXPORT_ENDPOINT;
}

/**
 * Downloads every Registration in the current view as CSV, across all pages. A plain link: the
 * endpoint's Content-Disposition names the file and the browser's own download takes over.
 */
export function ExportCsvLink({ view }: { view: RegistrationView }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a
        href={registrationExportHref(view)}
        download
        title="Export every Registration matching the search and filters (all pages)"
      >
        <DownloadIcon aria-hidden="true" />
        Export CSV
      </a>
    </Button>
  );
}
