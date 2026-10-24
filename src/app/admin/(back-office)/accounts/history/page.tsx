import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import type { AccountHistoryPage } from "@/lib/auth/account-history";
import { accounts } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/session";
import { PageContent, PageHeader } from "../../_shell/page-header";
import { AccountHistoryList } from "./account-history-list";
import { accountHistoryHref } from "./links";

export const metadata: Metadata = { title: "Account History" };

// /admin/accounts/history: every Account Change, newest first, 50 a page (account-management ticket
// 04); `?account=<id>` narrows it to one Account. Admin-only, like the Accounts list. The header is
// the static shell; the session, the query string and the database are request-time, so the rest
// renders behind one boundary.
export default function AccountHistoryPage({ searchParams }: PageProps<"/admin/accounts/history">) {
  return (
    <>
      <PageHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin/accounts">Accounts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <h1 aria-current="page" className="font-normal text-foreground">
                Account History
              </h1>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageHeader>
      <PageContent>
        <Suspense
          fallback={
            <p role="status" className="text-sm leading-normal text-muted-foreground">
              Loading the Account History…
            </p>
          }
        >
          <AdminOnlyAccountHistory searchParams={searchParams} />
        </Suspense>
      </PageContent>
    </>
  );
}

/** The first value of a query-string key. */
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function AdminOnlyAccountHistory({ searchParams }: Pick<PageProps<"/admin/accounts/history">, "searchParams">) {
  await requireAdmin();
  const query = await searchParams;
  const accountId = first(query.account) || undefined;
  // Anything that isn't a page number reads as the first page (the Accounts module decides).
  const page = Number(first(query.page) ?? 1);

  const accountsModule = accounts();
  if (accountId === undefined) {
    return <HistoryPage history={await accountsModule.history({ page })} />;
  }

  const [account, history] = await Promise.all([
    accountsModule.get(accountId),
    accountsModule.history({ accountId, page }),
  ]);
  if (!account) {
    return (
      <Note>
        There&apos;s no Account with this id. <AllChangesLink />
      </Note>
    );
  }
  return (
    <>
      <p className="text-sm leading-normal wrap-anywhere">
        Showing changes to <span className="font-medium">{account.name}</span>. <AllChangesLink />
      </p>
      <div className="mt-4">
        <HistoryPage history={history} accountId={accountId} />
      </div>
    </>
  );
}

function AllChangesLink() {
  return (
    <Link href={accountHistoryHref()} className="font-medium whitespace-nowrap underline underline-offset-4">
      Show all changes
    </Link>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-normal text-muted-foreground">{children}</p>;
}

/** One page of changes, then the paging. */
function HistoryPage({ history, accountId }: { history: AccountHistoryPage; accountId?: string }) {
  const { changes, total, page, pageSize } = history;
  if (total === 0) return <Note>No changes are recorded yet.</Note>;
  if (changes.length === 0) {
    return (
      <Note>
        There are no changes on page {page}.{" "}
        <Link href={accountHistoryHref({ accountId })} className="font-medium underline underline-offset-4">
          Go to the first page
        </Link>
      </Note>
    );
  }
  return (
    <>
      <AccountHistoryList changes={changes} />
      <Paging total={total} page={page} pageSize={pageSize} shown={changes.length} accountId={accountId} />
    </>
  );
}

const formatCount = (count: number) => count.toLocaleString("en-GB");

/** "Showing 51–57 of 57", and Previous and Next when there's more than one page. */
function Paging({
  total,
  page,
  pageSize,
  shown,
  accountId,
}: {
  total: number;
  page: number;
  pageSize: number;
  shown: number;
  accountId?: string;
}) {
  const from = (page - 1) * pageSize + 1;
  const pageCount = Math.ceil(total / pageSize);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-sm">
      <p className="leading-normal text-muted-foreground tabular-nums">
        Showing {formatCount(from)}–{formatCount(from + shown - 1)} of {formatCount(total)}
      </p>
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <p className="leading-normal font-medium tabular-nums">
            Page {formatCount(page)} of {formatCount(pageCount)}
          </p>
          <nav aria-label="Pages" className="flex items-center gap-2">
            <PageLink href={page > 1 ? accountHistoryHref({ accountId, page: page - 1 }) : null}>
              <ChevronLeftIcon />
              Previous
            </PageLink>
            <PageLink href={page < pageCount ? accountHistoryHref({ accountId, page: page + 1 }) : null}>
              Next
              <ChevronRightIcon />
            </PageLink>
          </nav>
        </div>
      )}
    </div>
  );
}

/** A link to another page, or the same label greyed out when there's no page to go to. */
function PageLink({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>{children}</Link>
    </Button>
  );
}
