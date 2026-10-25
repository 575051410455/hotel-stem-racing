# 03: Deployment stack

**What to build:** The operator can deploy the app on an Ubuntu server with one Docker Compose command. The stack has three services: app, PostgreSQL 17 and nginx. It runs behind Cloudflare's proxy using a Cloudflare Origin Certificate, and nginx passes the real client IP to the app.

**Blocked by:** 01

**Status:** resolved

- [x] The app builds as Next.js standalone output in a multi-stage Docker image and applies database migrations on start
- [x] Compose defines `app`, `db` (PostgreSQL 17 on a named volume that app rebuilds never touch) and `nginx`
- [x] nginx:
  - terminates TLS with the Origin Certificate and key mounted from the host
  - redirects HTTP to HTTPS
  - restores the client IP from Cloudflare's forwarded header, trusted only for Cloudflare's published IP ranges
- [x] Build-time public variables (`NEXT_PUBLIC_*`) are passed as build args from the server's `.env`
- [x] A short operator checklist covers DNS proxied on Cloudflare, placing the Origin Certificate, filling `.env`, and `docker compose up -d --build`
- [x] The production build passes locally. Compose and nginx config can't be run locally (no Docker on the dev machine), so this is stated in the hand-off and verified on the server.

## Answer

Done in commit "feat(deploy): …". Operator guide: `docs/deploy.md`.

**Client IP for rate limiting (ticket 08): read `X-Real-IP`.**
- nginx restores the visitor's IP from `CF-Connecting-IP` (realip module). It trusts the header only from Cloudflare's published ranges, fetched 2026-10-22, in `deploy/nginx/conf.d/cloudflare-realip.conf`.
- nginx sends that IP as `X-Real-IP`, and also overwrites `X-Forwarded-For` with the same single address, so anything that reads XFF sees the real IP too. Ticket 04 should check which headers Better Auth's sign-in rate limiter reads.
- nginx strips `CF-Connecting-IP` and `True-Client-IP`, so don't read those.
- Without nginx (local dev) `X-Real-IP` is absent, so fall back to a fixed key.

**Operator commands inside the app container** (env comes from Compose, no `.env` file needed):
- `docker compose exec app npm run staff -- …` (ticket 04)
- `docker compose exec app npm run email:test -- …` (ticket 05)
- `docker compose exec app npm run migrate`: also runs automatically on every container start, before `node server.js`. It is idempotent: `applied 0 new migration(s)` when up to date.

**Image layout** (`/app`, runner stage):
- `server.js` and `.next/` from the standalone output, plus `.next/static` and `public/`
- the full production `node_modules` (`npm ci --omit=dev`, minus `@next/swc-*`), which includes `tsx`
- `package.json`, `tsconfig.json`, `drizzle/`, `scripts/` and `src/` as source

So `npm run <name>` works exactly as it does locally, and tsx resolves `@/` from `tsconfig.json`.

**How tickets 04/05 scripts plug in:** no Dockerfile change is needed. Put the script in `scripts/`, add the `package.json` entry (`tsx --env-file-if-exists=.env scripts/<name>.ts`), and keep these rules:
- Every package a script imports at runtime must be in `dependencies`, not `devDependencies`: the image installs production dependencies only. `tsx` itself was moved to `dependencies` for this reason.
- `package.json` has no `"type": "module"`, so tsx compiles `scripts/*.ts` as CommonJS, and top-level `await` fails with `ERR_REQUIRE_ASYNC_MODULE`. Wrap the body in `async function main()`, or name the file `.mts`.
- `import "server-only"` throws outside Next's `react-server` condition. Scripts must not import modules that pull it in, or must run tsx with `--conditions=react-server`.
- With no `.env` file, Node prints ".env not found. Continuing without it." That's harmless.

**Gotchas**
- **Build without secrets:** the Docker build has only the three `NEXT_PUBLIC_*` values. App code must not read `DATABASE_URL`, `BETTER_AUTH_SECRET`, SMTP settings and so on at import time or during prerender. For example, a top-level Better Auth instance that throws without its secret would fail `next build` in Docker but not locally, where `.env` exists. The current build was checked with `.env` moved aside.
- **Keep `.env` out of the build context:** when a `.env` file exists at build time, `next build` copies it into `.next/standalone/`. `.dockerignore` excludes `.env*`, which is what keeps secrets out of the image, so don't remove that line.
- **Cloudflare timeout:** Cloudflare ends origin requests at 100 s (error 524, non-Enterprise plans). nginx allows 300 s, so the binding limit for ticket 17's batches is Cloudflare's 100 s.
- **IPv4 only:** ports are published on IPv4 only, and the DNS must be an `A` record without `AAAA`. Docker's userland proxy rewrites the source address of IPv6 connections to the bridge gateway, which would defeat realip.
- **`POSTGRES_PASSWORD`** (new in `.env.example`) only takes effect when the volume is first initialised. Never run `docker compose down -v`.
- **`NEXT_PUBLIC_*` changes** need `docker compose up -d --build`.
- **Process title:** the standalone server sets its process title to `next-server`, so `pkill -f server.js` doesn't find it.

**Decisions**
- Base image `node:24.22.1-trixie-slim` (glibc, current Node 24 LTS), `nginx:1.30.6-alpine` (current stable, same digest as `stable-alpine` on 2026-10-22) and `postgres:17-alpine`.
- The migration runner is plain `scripts/migrate.mjs` (drizzle-orm's postgres-js migrator), so start-up doesn't depend on tsx. It retries the connection for about 30 s, because Docker ignores `depends_on` health after a host reboot.
- Migrations run from `CMD`, not `ENTRYPOINT`, so `docker compose run app <cmd>` doesn't trigger them.
- The nginx upstream uses `server app:3000 resolve` with Docker's DNS, so recreating `app` never leaves nginx on a stale IP. nginx also sets `proxy_buffering off` for streaming.
- The project name is pinned (`name: stem-racing`), so the volume `stem-racing_db-data` doesn't depend on the checkout directory. Container logs rotate at 5 × 10 MB.

**Verified locally:**
- typecheck, lint, test and build pass, with the build also run with `.env` moved aside
- `.next/standalone/server.js` serves `/` with 200 on port 3103
- the runner layout, assembled by hand from a production-only `npm ci` without SWC:
  - runs migrations twice against a scratch database (1 applied, then 0)
  - serves `/` with 200 and inlines the `NEXT_PUBLIC_*` values
  - runs a tsx script through `npm run … -- args` with the `@/` alias and a drizzle query
- `docker-compose.yml` validates against the Compose Specification schema
- nginx config parses cleanly with nginx Inc's crossplane (contexts and argument counts). `http2 on` (1.25.1+) and `resolve` (1.27.3+) were checked against nginx's changelog.
- `update-cloudflare-ips.sh` regenerates the committed ranges file byte for byte.

**Verify on the server** (no Docker or nginx on the dev machine):
- `docker compose up -d --build` builds, and `docker compose ps` shows `db` and `app` healthy
- `docker compose exec nginx nginx -t` passes
- HTTPS works through Cloudflare Full (strict), and HTTP returns 301
- nginx access lines show the visitor's IP followed by `via <Cloudflare IP>`
- `npm run staff` and `npm run email:test` work via `docker compose exec`

## Comments

- **2026-10-25, CI/CD review:**
  - **Superseded by ADR 0005 (Cloudflare Tunnel, 2026-10-24):** the Origin Certificate, HTTPS on nginx, Cloudflare's IP ranges, `cloudflare-realip.conf`, `update-cloudflare-ips.sh`, "IPv4 only", Full (strict) and "via <Cloudflare IP>" above. nginx now trusts `CF-Connecting-IP` only from `cloudflared`, logs "via 10.203.47.2", and has no published port. The current steps are in `docs/deploy-guide/index.html`.
  - **"Verify on the server", checked in Docker instead** (the production image built with `docker compose build` and run with `db`, `app` and `nginx`; requests sent as `cloudflared` would, without Cloudflare): `docker compose config` valid; migrations on start, then `db` and `app` healthy; `nginx -t` passes; plain HTTP gets 301; the access log shows the visitor's IP "via 10.203.47.2" and ignores the header from any other peer; `npm run seed` and `npm run staff` work through `docker compose exec`.
  - **Still only on the real server:** the tunnel connection and hostname, the Cloudflare settings, the real Turnstile keys, sending email, and the devices at the door.
  - **Changed:** a fixed `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` from `.env` for the build (Server Action IDs survive a deploy); nginx config is now `deploy/nginx/templates/default.conf.template`, with `cloudflared`'s address from `docker-compose.yml`, `max_fails=0` and `valid=1s` (a redeploy cost about 2 s of 502s in most Docker runs, up to 8 s in two, instead of 11 s every time); CI in `.github/workflows/ci.yml`.
