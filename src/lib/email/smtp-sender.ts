// SMTP implementation of the Registration module's EventPassEmailSender port. The caller passes
// the environment in, so the composition root stays the one place that reads process.env.

import { readFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { event } from "../event";
import {
  type EventPassEmailSender,
  type EventPassMessage,
  type SendResult,
  unconfiguredEmailSender,
} from "../registrations/ports";
import { buildEventPassEmail, type InlineAttachment } from "./event-pass-email";

/** The SMTP variables documented in .env.example; `process.env` fits as is. */
export type SmtpEnv = Readonly<Record<string, string | undefined>> & {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  EMAIL_FROM?: string;
};

export type MailAddress = string | { name: string; address: string };

/** The part of a nodemailer transporter the sender uses, so any nodemailer transport fits. */
export type MailTransport = {
  sendMail(mail: {
    from: MailAddress;
    to: string;
    subject: string;
    html: string;
    text: string;
    attachments: InlineAttachment[];
  }): Promise<{ rejected?: unknown[] }>;
};

/** Relative to the working directory: the repo root locally, the app directory in Docker. */
export const BANNER_PATH = path.join("public", "brand", "banner-email.jpg");

/**
 * Builds the Event Pass email sender from SMTP settings. Returns the no-op
 * `unconfiguredEmailSender` when SMTP_USER is empty, so the app runs before SMTP exists.
 *
 * Gmail gotcha: EMAIL_FROM must be a verified "Send mail as" alias of SMTP_USER, or Gmail
 * silently rewrites From to SMTP_USER. With 2-Step Verification on, SMTP_PASS is an App Password.
 */
export function createSmtpEmailSender(env: SmtpEnv): EventPassEmailSender {
  const user = env.SMTP_USER?.trim();
  if (!user) return unconfiguredEmailSender;

  const port = Number(env.SMTP_PORT) || 465;
  const transport = nodemailer.createTransport({
    pool: true,
    maxConnections: 10,
    maxMessages: 100,
    host: env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port,
    // 465 is TLS from the start; other ports (587) upgrade with STARTTLS.
    secure: port === 465,
    auth: { user, pass: env.SMTP_PASS ?? "" },
    // Fail fast instead of nodemailer's minutes-long defaults, so a stuck SMTP server
    // can't hold a Registration request open.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  return createEventPassEmailSender(transport, {
    from: fromAddress(env.EMAIL_FROM?.trim() || user),
  });
}

/** Wraps any nodemailer transport as the Event Pass email sender. `send` never throws. */
export function createEventPassEmailSender(
  transport: MailTransport,
  options: { from: MailAddress; banner?: () => Promise<Buffer | undefined> },
): EventPassEmailSender {
  const banner = options.banner ?? cachedBanner();

  return {
    configured: true,
    async send(message: EventPassMessage): Promise<SendResult> {
      try {
        const email = await buildEventPassEmail(message, { banner: await banner() });
        const info = await transport.sendMail({
          from: options.from,
          to: message.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          attachments: email.attachments,
        });
        if (info.rejected?.length) {
          return { success: false, error: `Recipient rejected: ${info.rejected.join(", ")}` };
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: describeError(error) };
      }
    },
  };
}

/** A bare address gets the Event name as its display name; "Name <address>" is kept as is. */
function fromAddress(from: string): MailAddress {
  return from.includes("<") ? from : { name: event.name, address: from };
}

/** Reads the banner once. If it is missing, emails still go out with a text-only header. */
function cachedBanner(): () => Promise<Buffer | undefined> {
  let banner: Promise<Buffer | undefined> | undefined;
  return () => {
    banner ??= readFile(path.join(process.cwd(), BANNER_PATH)).catch((error: unknown) => {
      console.warn(`Event Pass email banner unavailable (${BANNER_PATH}): ${describeError(error)}`);
      return undefined;
    });
    return banner;
  };
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? `${code}: ${error.message}` : error.message;
  }
  return String(error);
}
