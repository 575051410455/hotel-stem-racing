// What the registration Server Action knows about the request, for bot protection. Safe to
// import from browser code: the widget shares the field name.

import type { SubmissionContext } from "@/lib/registrations/bot-protection";

/** The hidden input Turnstile adds to the form with the response token (Turnstile's default). */
export const TURNSTILE_RESPONSE_FIELD = "cf-turnstile-response";

/**
 * The rate-limit key of a request without X-Real-IP, which only happens without nginx (local
 * development). Every such request shares this one key, so it is still limited.
 */
export const NO_CLIENT_IP_KEY = "no-client-ip";

export function submissionContext(
  formData: FormData,
  requestHeaders: Pick<Headers, "get">,
): SubmissionContext {
  const token = formData.get(TURNSTILE_RESPONSE_FIELD);
  // nginx restores the visitor's IP from Cloudflare's CF-Connecting-IP, which it trusts only from
  // cloudflared's fixed address (ADR 0005), and passes it as X-Real-IP; see deploy/nginx/templates.
  const clientIp = requestHeaders.get("x-real-ip")?.trim() || undefined;
  return {
    botCheckToken: typeof token === "string" && token !== "" ? token : undefined,
    clientIp,
    rateLimitKey: clientIp ?? NO_CLIENT_IP_KEY,
  };
}
