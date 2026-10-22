// What the registration Server Action knows about the request, for bot protection. Safe to
// import from browser code: the widget shares the field name.

import type { SubmissionContext } from "@/lib/registrations/bot-protection";

/** The hidden input Turnstile adds to the form with the response token (Turnstile's default). */
export const TURNSTILE_RESPONSE_FIELD = "cf-turnstile-response";

/**
 * Rate-limit key when X-Real-IP is missing, which only happens without nginx (local development).
 * Every such request shares this one key.
 */
export const UNKNOWN_CLIENT_IP = "unknown";

export function submissionContext(
  formData: FormData,
  requestHeaders: Pick<Headers, "get">,
): SubmissionContext {
  const token = formData.get(TURNSTILE_RESPONSE_FIELD);
  return {
    botCheckToken: typeof token === "string" && token !== "" ? token : undefined,
    // nginx restores the visitor's IP from Cloudflare's CF-Connecting-IP (trusted only from
    // Cloudflare's ranges) and passes it as X-Real-IP; see deploy/nginx/conf.d/app.conf.
    remoteIp: requestHeaders.get("x-real-ip")?.trim() || UNKNOWN_CLIENT_IP,
  };
}
