// Collaborators the Registration module depends on. Real implementations are wired in the
// composition root (src/lib/server/registrations.ts); tests pass fakes.

import type { EventPass } from "./registrations";

export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

/** What an Event Pass email needs; the link is already built from the configured domain. */
export type EventPassMessage = {
  to: string;
  passLink: string;
  pass: EventPass;
};

export type SendResult = { success: true } | { success: false; error: string };

export interface EventPassEmailSender {
  /** False when SMTP is not configured, so callers can fall back to contact channels. */
  readonly configured: boolean;
  /** Must never throw; failures come back as `{ success: false }`. */
  send(message: EventPassMessage): Promise<SendResult>;
}

export interface BotCheckVerifier {
  verify(responseToken: string | undefined, remoteIp: string | undefined): Promise<boolean>;
}

export const unconfiguredEmailSender: EventPassEmailSender = {
  configured: false,
  async send() {
    return { success: false, error: "Email is not configured" };
  },
};

export const passThroughBotCheck: BotCheckVerifier = {
  async verify() {
    return true;
  },
};
