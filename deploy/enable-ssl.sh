#!/usr/bin/env bash
# Enable HTTPS with Let's Encrypt (requires DNS A/AAAA pointing to this server).
# Usage: sudo ./deploy/enable-ssl.sh api.example.com you@example.com
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: sudo $0 <domain> <letsencrypt-email>"
  exit 1
fi

certbot --nginx \
  -d "$DOMAIN" \
  -m "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  --redirect

echo "Done. Update app .env: BETTER_AUTH_URL, FRONTEND_URL, PUBLIC_API_URL (if used) to https://${DOMAIN}"
