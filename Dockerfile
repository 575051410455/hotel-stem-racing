# syntax=docker/dockerfile:1

# App image: Next.js standalone server plus the operator scripts (migrate, staff, seed, email:test).
# Built by `docker compose up -d --build`; see docs/deploy.md.

# Node 24 LTS on Debian (glibc) to match local development. Bump deliberately.
ARG NODE_IMAGE=node:24.22.1-trixie-slim

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# ---- All dependencies, for `next build` ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- Production dependencies only, for the runtime image ----
# Includes tsx, drizzle-orm and postgres, which the operator scripts need. Next's standalone
# tracing only copies what server.js imports, so it can't serve the scripts on its own.
# @next/swc-* is the build-time compiler (100+ MB); the standalone trace leaves it out because
# the server never loads it, so drop it here too.
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev \
 && rm -rf node_modules/@next/swc-*

# ---- Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the bundle at build time, so they come in as build args
# (Compose passes them from the server's .env). Changing one needs a rebuild.
# No runtime secrets are available here: code must not need DATABASE_URL, BETTER_AUTH_SECRET,
# SMTP_* and so on at build or prerender time. APP_URL isn't secret: the prerendered registration
# pages use it for their absolute hreflang links (left out when it is empty).
ARG APP_URL=""
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
ARG NEXT_PUBLIC_CONTACT_LINE=""
ARG NEXT_PUBLIC_CONTACT_PHONE=""
ENV APP_URL=${APP_URL} \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY} \
    NEXT_PUBLIC_CONTACT_LINE=${NEXT_PUBLIC_CONTACT_LINE} \
    NEXT_PUBLIC_CONTACT_PHONE=${NEXT_PUBLIC_CONTACT_PHONE}
RUN npm run build

# ---- Runtime ----
FROM base AS runner
# Docker sets HOSTNAME to the container id; server.js would then bind to that address only.
# Keep 0.0.0.0: on a specific address Next treats Proxy rewrites (src/proxy.ts) as external, and
# an unknown Event Pass link then fails with a 500 instead of a 404.
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone server (server.js, .next/server, traced node_modules), then the full production
# node_modules on top (same lockfile, so it is a superset), then the files server.js doesn't copy.
COPY --from=builder /app/.next/standalone ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Operator scripts run with `npm run <name>` exactly as locally: tsx resolves the @/ alias
# from tsconfig.json, so scripts/ and src/ ship as source.
COPY package.json tsconfig.json ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src ./src

# Next writes its runtime cache under .next; everything else stays root-owned and read-only.
RUN mkdir -p .next/cache && chown -R node:node .next
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

# Migrations first; the server only starts if they succeed. `exec` makes node the main process
# so it receives SIGTERM from `docker compose stop` and shuts down gracefully.
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node server.js"]
