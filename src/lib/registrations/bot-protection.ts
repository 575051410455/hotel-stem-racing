// Bot protection for public submissions: the request facts the Server Action passes along, and
// the per-IP submission rate limit. The Turnstile check itself is the BotCheckVerifier port.
// Pure (the caller passes the time), so the form can import the limit's numbers for its copy.

/** Request facts the public form's Server Action passes along with a submission. */
export type SubmissionContext = {
  /** The Turnstile response token the widget put in the form. */
  botCheckToken?: string;
  /**
   * The client IP nginx restored from Cloudflare's header (X-Real-IP), or a fixed fallback key.
   * Submissions without one (scripts, tests) are not rate limited.
   */
  remoteIp?: string;
};

// Generous on purpose: Turnstile is the bot defence, and many real Attendees share one IP
// (the venue's Wi-Fi at the door, Thai mobile carriers' CGNAT). This only stops floods.
export const SUBMISSIONS_PER_WINDOW = 60;
export const SUBMISSION_WINDOW_MINUTES = 10;

export interface SubmissionRateLimiter {
  /**
   * Counts one submission from `key` at `now` and returns true, or returns false when `key` has
   * already used its allowance. A refused submission is not counted, so retrying never extends
   * the wait.
   */
  tryAcquire(key: string, now: Date): boolean;
}

/**
 * A sliding-window limit held in this process's memory: at most `limit` submissions per key in
 * any `windowMs`. Per process is enough because the app runs as a single container (see
 * docs/deploy.md); a restart forgets every count.
 */
export function createInMemoryRateLimiter({
  limit = SUBMISSIONS_PER_WINDOW,
  windowMs = SUBMISSION_WINDOW_MINUTES * 60_000,
}: { limit?: number; windowMs?: number } = {}): SubmissionRateLimiter {
  /** Times (ms) of each key's submissions inside the window, oldest first. */
  const recent = new Map<string, number[]>();
  let nextSweep = 0;

  return {
    tryAcquire(key, at) {
      const now = at.getTime();
      const windowStart = now - windowMs;

      // Forget keys that have gone quiet, so a long run can't grow the map without bound.
      if (now >= nextSweep) {
        for (const [quietKey, times] of recent) {
          if (times[times.length - 1] <= windowStart) recent.delete(quietKey);
        }
        nextSweep = now + windowMs;
      }

      const times = (recent.get(key) ?? []).filter((time) => time > windowStart);
      const allowed = times.length < limit;
      if (allowed) times.push(now);
      if (times.length > 0) recent.set(key, times);
      return allowed;
    },
  };
}
