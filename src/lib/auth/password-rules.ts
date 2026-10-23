// Account password rules (pure). The auth config sets them, and the Accounts commands read them back
// from it (`auth.$context`); browser forms import them here, since the auth config is server-only.

/** At least 12 characters, no composition rules (spec: Back Office → Staff Accounts). */
export const MIN_PASSWORD_LENGTH = 12;
/** Better Auth's own default upper bound, stated here so forms can check it before sending. */
export const MAX_PASSWORD_LENGTH = 128;
