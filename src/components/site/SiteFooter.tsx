import { contactChannels } from "@/lib/contact";
import { Container } from "./Container";
import { Wordmark } from "./Wordmark";

export function SiteFooter() {
  const channels = contactChannels();

  return (
    <footer className="border-t border-line bg-bg py-4 tab:py-10">
      <Container className="flex flex-col gap-8 tab:gap-10">
        {channels.length > 0 && (
          <ul
            aria-label="ช่องทางติดต่อผู้จัดงาน"
            className="flex flex-col gap-6 text-[0.75rem] tab:flex-row tab:justify-between"
          >
            {channels.map((channel) => (
              <li key={channel.kind}>
                <a
                  href={channel.href}
                  className="text-ink-pure no-underline hover:underline focus:underline"
                >
                  {channel.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-3 text-left tab:items-end tab:text-right">
          <div aria-hidden="true" className="bg-brand-gradient h-1.5 w-full rounded-pill" />
          <Wordmark size="footer" />
          <p className="text-[0.75rem] text-muted">© 2026 STEM Racing Thailand</p>
        </div>
      </Container>
    </footer>
  );
}
