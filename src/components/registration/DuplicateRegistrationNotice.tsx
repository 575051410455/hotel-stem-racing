import type { ReactNode, Ref } from "react";
import { type ContactChannel, contactChannels } from "@/lib/contact";
import { type Language, languagePath } from "@/lib/language";
import type { RegistrationFormState } from "./form-state";

export type DuplicateRegistrationState = Extract<RegistrationFormState, { status: "duplicate" }>;

/** The notice's wording, from the page's dictionary. `{email}` marks where the masked email goes. */
export type DuplicateRegistrationCopy = {
  heading: string;
  resent: string;
  spamHint: string;
  checkInbox: string;
  registeredWith: string;
  stillNotFound: string;
  wantItAgain: string;
  registerSomeoneElse: string;
  contactListName: string;
};

/** `template` with the email element in place of `{email}`. */
function withEmail(template: string, email: ReactNode): ReactNode {
  const [before, after = ""] = template.split("{email}");
  return (
    <>
      {before}
      {email}
      {after}
    </>
  );
}

function ContactChannelList({ channels, name }: { channels: ContactChannel[]; name: string }) {
  return (
    <ul aria-label={name} className="flex flex-col gap-2">
      {channels.map((channel) => (
        <li key={channel.kind}>
          <a href={channel.href} className="font-bold text-link underline">
            {channel.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Shown instead of the registration form when a submission is a Duplicate Registration. It never
 * shows the Event Pass: that only goes to the registered email, which appears masked.
 */
export function DuplicateRegistrationNotice({
  result,
  copy,
  language,
  ref,
}: {
  result: DuplicateRegistrationState;
  copy: DuplicateRegistrationCopy;
  language: Language;
  ref?: Ref<HTMLElement>;
}) {
  const channels = contactChannels(language);
  const email = <strong className="[overflow-wrap:anywhere]">{result.maskedEmail}</strong>;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="duplicate-registration-title"
      className="mx-auto flex w-[min(100%,528px)] flex-col gap-4 rounded-input border border-line bg-surface p-5 tab:p-8"
    >
      <h2 id="duplicate-registration-title" className="text-[1.125rem] font-black italic tab:text-[1.25rem]">
        {copy.heading}
      </h2>

      {result.passResent ? (
        <div className="flex flex-col gap-2">
          <p>{withEmail(copy.resent, email)}</p>
          <p className="text-[0.875rem] text-muted">{copy.spamHint}</p>
        </div>
      ) : result.emailConfigured ? (
        // Re-sent less than 10 minutes ago, or the re-send failed.
        <p>{withEmail(copy.checkInbox, email)}</p>
      ) : (
        <p>{withEmail(copy.registeredWith, email)}</p>
      )}

      {/* Without email, the organisers are the way to the pass; otherwise a fallback. */}
      {(!result.emailConfigured || (!result.passResent && channels.length > 0)) && (
        <div className="flex flex-col gap-2">
          <p>{result.emailConfigured ? copy.stillNotFound : copy.wantItAgain}</p>
          {channels.length > 0 && <ContactChannelList channels={channels} name={copy.contactListName} />}
        </div>
      )}

      <p>
        {/* A full page load on purpose: a <Link> to the same route would keep this form's state. */}
        <a href={languagePath(language, "/")} className="font-bold text-link underline">
          {copy.registerSomeoneElse}
        </a>
      </p>
    </section>
  );
}
