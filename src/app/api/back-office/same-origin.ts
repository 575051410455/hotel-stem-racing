// CSRF guard for Back Office routes that change data. SameSite=Lax cookies are not enough:
// production runs on a subdomain of the organisers' domain, and sibling subdomains count as
// same-site, so a form on one of them could post here with the Staff session attached.
// Browsers send Sec-Fetch-Site on every request; ours come from our own pages ("same-origin").

/** A 403 response when the request did not come from our own pages, otherwise undefined. */
export function rejectUnlessSameOrigin(request: Request): Response | undefined {
  const site = request.headers.get("sec-fetch-site");
  // Older browsers omit the header; then the SameSite cookie is the only protection left.
  if (site === null || site === "same-origin") return undefined;
  return Response.json(
    { error: "forbidden" },
    { status: 403, headers: { "Cache-Control": "private, no-store" } },
  );
}
