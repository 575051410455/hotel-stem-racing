// Cloudflare Turnstile implementation of the Registration module's BotCheckVerifier port. The
// caller passes the environment in, so the composition root stays the one place that reads
// process.env. Server only: the secret key must never reach the browser.

import { isIP } from "node:net";
import { type BotCheckVerifier, passThroughBotCheck } from "../registrations/ports";

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Cloudflare's documented maximum length of a response token. */
const MAX_TOKEN_LENGTH = 2048;

/** The Attendee is waiting on this, so give up quickly; a timeout counts as a failed check. */
const DEFAULT_TIMEOUT_MS = 5_000;

/** Error codes that point at our configuration or at Cloudflare, not at the visitor's token. */
const OPERATOR_ERRORS = new Set([
  "missing-input-secret",
  "invalid-input-secret",
  "bad-request",
  "internal-error",
]);

/** The Turnstile variable documented in .env.example; `process.env` fits as is. */
export type TurnstileEnv = Readonly<Record<string, string | undefined>> & {
  TURNSTILE_SECRET_KEY?: string;
};

export type SiteverifyOutcome = { success: boolean; errorCodes: string[] };

/** Reads a siteverify response body. Anything but an explicit `success: true` is a failure. */
export function parseSiteverifyResponse(body: unknown): SiteverifyOutcome {
  if (typeof body !== "object" || body === null) return { success: false, errorCodes: [] };
  const { success, "error-codes": codes } = body as { success?: unknown; "error-codes"?: unknown };
  const errorCodes = Array.isArray(codes)
    ? codes.filter((code): code is string => typeof code === "string")
    : [];
  return { success: success === true, errorCodes };
}

/**
 * The bot-check verifier for the configured environment: Turnstile when TURNSTILE_SECRET_KEY is
 * set, otherwise `passThroughBotCheck`, so local development runs without Cloudflare keys.
 */
export function createTurnstileBotCheck(env: TurnstileEnv): BotCheckVerifier {
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim();
  return secretKey ? createTurnstileVerifier({ secretKey }) : passThroughBotCheck;
}

/** Verifies response tokens with Cloudflare's siteverify API. `verify` never throws. */
export function createTurnstileVerifier(options: {
  secretKey: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}): BotCheckVerifier {
  const { secretKey, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  return {
    async verify(token, remoteIp) {
      // No token means the widget never ran (no JavaScript, or a bot); don't ask Cloudflare.
      if (!token || token.length > MAX_TOKEN_LENGTH) return false;

      try {
        const body = new URLSearchParams({ secret: secretKey, response: token });
        // Only a real address helps Cloudflare; the "unknown" fallback key would be noise.
        if (remoteIp && isIP(remoteIp)) body.set("remoteip", remoteIp);

        const response = await (options.fetch ?? fetch)(SITEVERIFY_URL, {
          method: "POST",
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
        const outcome = parseSiteverifyResponse(await response.json());

        const operatorErrors = outcome.errorCodes.filter((code) => OPERATOR_ERRORS.has(code));
        if (operatorErrors.length > 0) {
          console.error(`Turnstile siteverify rejected the request: ${operatorErrors.join(", ")}`);
        }
        return outcome.success;
      } catch (error) {
        console.error(`Turnstile siteverify unavailable: ${describeError(error)}`);
        return false;
      }
    },
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
