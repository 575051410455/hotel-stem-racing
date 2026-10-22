#!/bin/sh
# Regenerates conf.d/cloudflare-realip.conf from Cloudflare's published IP ranges.
# Run on the server from the repo root, then check and reload nginx:
#   sh deploy/nginx/update-cloudflare-ips.sh
#   docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
set -eu

out="$(dirname "$0")/conf.d/cloudflare-realip.conf"
tmp="$(mktemp)"
trap 'rm -f "$tmp" "$tmp.v4" "$tmp.v6"' EXIT

curl -fsS --max-time 20 https://www.cloudflare.com/ips-v4 > "$tmp.v4"
curl -fsS --max-time 20 https://www.cloudflare.com/ips-v6 > "$tmp.v6"

# Refuse to write an empty or garbled list: that would stop nginx restoring visitor IPs.
grep -Eqx '([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}' "$tmp.v4" || { echo "unexpected ips-v4 response" >&2; exit 1; }
grep -Eqx '[0-9a-f:]+/[0-9]{1,3}' "$tmp.v6" || { echo "unexpected ips-v6 response" >&2; exit 1; }

{
  echo "# Restore the visitor's IP from Cloudflare's CF-Connecting-IP header (ngx_http_realip_module)."
  echo "# The header is trusted only when the TCP peer is one of Cloudflare's published edge ranges;"
  echo "# from any other peer it is ignored and \$remote_addr stays the real peer address."
  echo "#"
  echo "# Ranges fetched $(date -u +%Y-%m-%d) from https://www.cloudflare.com/ips-v4 and"
  echo "# https://www.cloudflare.com/ips-v6. To refresh, run deploy/nginx/update-cloudflare-ips.sh, then"
  echo "# \`docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload\`."
  echo
  echo "# IPv4"
  grep -Ex '([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}' "$tmp.v4" | sed 's/.*/set_real_ip_from &;/'
  echo
  echo "# IPv6"
  grep -Ex '[0-9a-f:]+/[0-9]{1,3}' "$tmp.v6" | sed 's/.*/set_real_ip_from &;/'
  echo
  echo "real_ip_header CF-Connecting-IP;"
} > "$tmp"

mv "$tmp" "$out"
chmod 644 "$out"
echo "wrote $out"
