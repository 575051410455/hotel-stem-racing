import Link from "next/link";
import { Container } from "./Container";

/** A public 404's message: what wasn't found, why it might be, and the way back to the registration form. */
export function NotFoundNotice({
  copy,
  homeHref,
}: {
  copy: { heading: string; body: string; action: string };
  homeHref: string;
}) {
  return (
    <Container className="py-8 tab:py-10">
      <section className="mx-auto flex w-[min(100%,528px)] flex-col gap-4 rounded-input border border-line bg-surface p-5 tab:p-8">
        <h1 className="text-[1.25rem] font-black italic tab:text-[1.5rem]">{copy.heading}</h1>
        <p>{copy.body}</p>
        <p>
          <Link href={homeHref} className="font-bold text-link underline">
            {copy.action}
          </Link>
        </p>
      </section>
    </Container>
  );
}
