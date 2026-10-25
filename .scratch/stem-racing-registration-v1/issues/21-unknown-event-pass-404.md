# 21: Unknown Event Pass returns HTTP 404

**What to build:** Opening `/p/{token}` for a token that doesn't exist shows the Thai not-found page, as now, but with HTTP status 404 instead of 200. `notFound()` currently runs after the response has started streaming, so the status is already 200 (found by ticket 02). A Proxy check or another approach that sets the status before streaming is needed.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] An unknown or malformed token returns 404 with the existing Thai not-found page
- [x] A real token still renders the Event Pass, with no extra database round-trip on the hot path if avoidable. Not avoidable: a real token now costs one extra indexed read (see below).
- [x] The check stays at the Registration-module seam (`getEventPass`) and doesn't duplicate its rules

## Answer

Done in commit "fix(event-pass): unknown Event Pass links return 404 …".

### How it works

| What | Where |
| --- | --- |
| Proxy matches `/p/:token` and calls `registrations().getEventPass(token)`. `found` → `NextResponse.next()`. Anything else → rewrite to `/p/unknown`. The Back Office cookie gate is unchanged, now in `requireSessionCookie`. | `src/proxy.ts` |
| `/p/unknown` is a static page that calls `notFound()`. The build stores it as `○` with status 404 (`.next/server/app/p/unknown.meta`). | `src/app/(public)/p/unknown/page.tsx` |
| The Thai not-found page moved up one segment, so it covers both `/p/[token]` and `/p/unknown`. Copy is unchanged. | `src/app/(public)/p/not-found.tsx` |
| `/p/[token]/page.tsx` is unchanged. Its own `notFound()` still covers a pass deleted between the Proxy check and the render (200 + not-found UI, as before). | |

### Why not fix it in the page

- **`export const instant = false` doesn't help:**
  - With Cache Components every App Router route is PPR (`couldSupportPPR = cacheComponents`).
  - `next start` serves the stored shell with its stored status (200) and then resumes the render (`build/templates/app-page-runtime.js`), so a blocking page still answered 200. This was tried and measured.
- **A Proxy rewrite back to `/p/{token}` with `{ status: 404 }` doesn't work:** the page overwrites the status with its stored 200 (`res.statusCode = cachedData.status`). That's why the rewrite targets a route prerendered as 404.
- **Passing the pass from Proxy to the page via a request header would save the second read,** but it moves the lookup out of the page and trusts a header. Not worth it for one indexed `select … where token = $1 limit 1`.

### Gotchas

- **Keep `HOSTNAME=0.0.0.0` (Dockerfile):** if server.js binds a specific address (e.g. `HOSTNAME=127.0.0.1`), Next builds the Proxy's `request.url` with `localhost` but compares against the bind address. It then treats the rewrite as external and answers 500 ("Failed to proxy … socket hang up"). The Dockerfile comment now says so.
- **RSC data requests answer 200** for unknown tokens with the not-found payload. That's Next's rule for data requests; the client router renders the not-found UI.
- **The response carries `x-middleware-rewrite: /p/unknown`.** It's harmless: the path holds no token.
- **Proxy now imports the composition root.** Nothing in that graph reads env at import or imports `server-only`. If a later change adds either, Proxy breaks for every `/p/` link.

### Verified

- typecheck, lint, 195 tests and build pass. The build lists `◐ /p/[token]` and `○ /p/unknown`.
- **Local Postgres `stem_racing` with one throwaway Registration (deleted afterwards):**
  - **`next start`:**
    - real token → 200 with the pass (Pass Code in the HTML)
    - unknown UUID and `not-a-token` → 404 with "ไม่พบบัตรเข้างานนี้", `noindex` and `no-referrer`
    - HEAD → 404
    - `/admin` → 307 to sign-in, as before
  - **`.next/standalone/server.js` with `HOSTNAME=0.0.0.0` (as in Docker), `Host: stem.example.com` and `X-Forwarded-Proto: https`:** real token 200, unknown token 404, and the rewrite is internal (`x-middleware-rewrite: /p/unknown`, relative).
  - **`next dev`:** same three results.
- The not-found copy only appears in the real-token response inside the RSC payload script, not in visible HTML.
- **On the server:** after deploy, `curl -sI https://<domain>/p/00000000-0000-4000-8000-000000000000` should answer 404, and a real pass link 200.

## Comments

- 2026-10-25: An unknown Event Pass link answers 404 through nginx (checked in Docker in the CI/CD review: the production image built with `docker compose build` and run with `db`, `app` and `nginx`, with requests sent as `cloudflared` would (no Cloudflare)). The check after a deploy is now step 5 of `docs/deploy-guide/index.html`.
