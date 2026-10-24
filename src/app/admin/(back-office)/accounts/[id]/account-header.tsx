import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageHeader } from "../../_shell/page-header";

/**
 * "Accounts › Napat Wongsa": back to the list, then the Account's name once it is known. A long
 * name is cut short here; the page shows it in full.
 */
export function AccountHeader({ name }: { name: string | null }) {
  return (
    <PageHeader>
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/accounts">Accounts</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {name && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate">{name}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </PageHeader>
  );
}
