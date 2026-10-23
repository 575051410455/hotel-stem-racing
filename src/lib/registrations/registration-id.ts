// Registration ids: which numbers can be one, and reading one from a URL path segment.
// Pure; safe in server and browser code.

/** Registration ids are a Postgres `integer` identity: 1 to 2^31 − 1. */
const MAX_REGISTRATION_ID = 2 ** 31 - 1;

/** False for anything that can't be a Registration id, which Postgres would reject or overflow on. */
export function isRegistrationId(id: number): boolean {
  return Number.isSafeInteger(id) && id >= 1 && id <= MAX_REGISTRATION_ID;
}

/** A Registration id as it appears in a URL path ("12"); NaN, which matches nothing, otherwise. */
export function registrationIdFromPath(segment: string): number {
  return /^[1-9]\d{0,9}$/.test(segment) ? Number(segment) : Number.NaN;
}
