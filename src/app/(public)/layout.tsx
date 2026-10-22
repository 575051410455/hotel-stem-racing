import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="maincontent" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
