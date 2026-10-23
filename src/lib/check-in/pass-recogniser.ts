// The browser's first look at what the camera read: could this be an Event Pass? Pure.
//
// It only pre-filters. `resolveScan` in the Event Pass codec stays the strict side and the server
// decides. This must always be looser than the server, so no real pass is turned away in the
// browser: every rule is case-insensitive and unanchored where the server's is anchored. Text it
// turns away gets the brief "not an Event Pass" camera notice and never reaches the server.

/** An Event Pass token anywhere in the text, in any case: on its own or inside a link. */
const TOKEN_SHAPED = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * A link to an Event Pass page (`…/p/{token}`), even with a damaged token. It needs the start of
 * a token after `/p/`, because other QR codes use `/p/` too: LINE add-friend links
 * (`line.me/R/ti/p/@…`) and Instagram posts. A backslash counts as a slash, as in http(s) links.
 */
const PASS_LINK_SHAPED = /[/\\]p[/\\][0-9a-f]{8}/i;

/** A Pass Code, with or without its EP prefix, once everything but letters and digits is gone. */
const PASS_CODE_SHAPED = /^(?:EP)?[A-Z0-9]{8}$/;

export function looksLikeEventPass(text: string): boolean {
  if (TOKEN_SHAPED.test(text) || PASS_LINK_SHAPED.test(text)) return true;
  return PASS_CODE_SHAPED.test(text.toUpperCase().replace(/[^A-Z0-9]+/g, ""));
}
