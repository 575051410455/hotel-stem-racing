# Deploying to the server

The operator guide is **[`docs/deploy-guide/index.html`](deploy-guide/index.html)**. Open it in a browser straight from the checkout; it needs no server. Fill in your domain once, and every command on the page uses it. Each step has a checkbox, and ticked steps are remembered in that browser.

It covers:

- the server, the Cloudflare Tunnel and the Cloudflare settings;
- `.env`, the first start, and the Admin, Staff and Kiosk Accounts;
- the visitor-IP check, day-to-day operations (backups, deploys, going back a version) and troubleshooting.

In short: an Ubuntu server runs Docker Compose with `app`, `db` (PostgreSQL 17), `nginx` and `cloudflared`. Visitors reach the site through a Cloudflare Tunnel, so the server publishes no port, and TLS ends at Cloudflare's edge (ADR 0005).

```
Visitor ──HTTPS──▶ Cloudflare edge ◀══tunnel══ cloudflared ──▶ nginx :80 ──▶ app :3000 ──▶ db :5432
```

The commands used most:

```sh
# Back up first. The subshell keeps this umask local to the backup.
(
  set -eu
  umask 077
  backup_dir="$HOME/backups"
  [ ! -L "$backup_dir" ]
  mkdir -p "$backup_dir"
  chmod 700 "$backup_dir"
  backup_file="$backup_dir/stem-racing-$(date +%F-%H%M).dump"
  [ ! -L "$backup_file" ]
  [ ! -e "$backup_file" ] || [ -f "$backup_file" ]
  touch "$backup_file"
  chmod 600 "$backup_file"
  docker compose exec -T db pg_dump -U stem_racing -Fc stem_racing > "$backup_file"
)
git pull && docker compose up -d --build                      # build and (re)start everything
docker compose exec app npm run seed                          # the first Admin Account (from SEED_STAFF_* in .env)
docker compose exec -it app npm run staff -- create-admin <email> "<name>"
docker compose exec app npm run staff -- make-admin <email>   # an existing Account becomes an Admin
docker compose exec -it app npm run staff -- reset-password <email>
docker compose logs -f app
```

- **Before every deploy**, back up as above and copy the file off the server into a private directory. The [full guide's backup procedure](deploy-guide/index.html#daily) includes restricting earlier dumps, private off-server copies, nightly backups and permission checks. Backups require a `0700` directory and `0600` regular dump files; these commands reject symlink destinations and fix an existing output file before writing it. Wait for the commit's CI run (`.github/workflows/ci.yml`) to be green.
- **After every deploy**, reload every Kiosk iPad and check-in desk. Visitors get errors for a few seconds while the new app starts.
- **`.env` needs `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`** (`openssl rand -base64 32`), or the build stops. Keep it the same across deploys: open Kiosk and desk pages call the app with IDs made from it.
- After updating a database from before Admin Accounts, its Staff Accounts open only the check-in desk until `make-admin` promotes them.

Never run `docker compose down -v`: `-v` deletes the database volume and every Registration.
