# Deploy Runbook — trip.ipongs.com

Production deploy of TripChan to an Ubuntu server using Docker + Nginx + Let's Encrypt.

- **Domain:** `trip.ipongs.com`
- **App container:** Node SSR, listening on `127.0.0.1:3100` on the host (container internal port stays 3000)
- **Edge:** Nginx 80/443 → reverse proxy → app
- **TLS:** Let's Encrypt via certbot (auto-renew)

> **Port note:** the server already runs `ai-agent-web` on `:3000`, `ai-agent-api` on `:4000`, and `curriculum-rag-api` on `:8088`. We map TripChan to **host port 3100** to avoid conflicts. If 3100 is also taken when you deploy, pick another free port and update the compose `ports:` entry + nginx `proxy_pass` together.

> ℹ️ **About the build:** the project's `npm run build` produces a Cloudflare-Workers-compatible bundle, but the bundle uses only `node:*` imports (no `cloudflare:*` specifiers) and exports a standard Web `{ fetch }` handler. We keep that build as-is and run it on Node via a tiny adapter (`server.mjs` + `@hono/node-server`). No need to switch build targets.

---

## Pre-deploy checklist (do these before touching the server)

### DNS
- [ ] `trip.ipongs.com` A record points to the Ubuntu server's public IPv4.
- [ ] (Optional) AAAA record for IPv6.
- [ ] TTL ≤ 300s while testing (raise to 3600+ once stable).
- [ ] If using Cloudflare DNS, set the proxy to **DNS only** (gray cloud) until certbot succeeds, then switch back if you want CF in front.

Verify:
```bash
dig +short trip.ipongs.com
```

### Secrets ready
- [ ] Supabase: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Supabase client (build-time): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- [ ] OpenRouter: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
- [ ] Set `OPENROUTER_SITE_URL=https://trip.ipongs.com` and `OPENROUTER_SITE_NAME=TripChan`
- [ ] Service role key is **server-only** — never expose in any `VITE_*` var.

### Supabase
- [ ] Migrations applied to the production project (`supabase/migrations/*.sql`).
- [ ] RLS enabled on every public table.
- [ ] Add `https://trip.ipongs.com` to **Auth → URL Configuration → Site URL** and Redirect URLs.

### Repo
- [ ] No `.env` in git history (`git log -p -- .env` should be empty).
- [ ] Tagged or note the deploy commit (e.g. `git tag v1.0.0`).

---

## 1) Provision the Ubuntu server

SSH in as a sudo user (assume `ubuntu`):

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install nginx ca-certificates curl gnupg ufw git

# Docker engine + compose plugin
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo usermod -aG docker $USER && newgrp docker

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

Verify:
```bash
docker --version && docker compose version
sudo systemctl status nginx --no-pager
```

---

## 2) Files already in the repo

These are already committed — no need to create them on the server, just `git pull` will bring them down.

- **`server.mjs`** — small Hono-based Node entry. Serves `dist/client/assets/*` as static files (with `Cache-Control: immutable`) and forwards everything else to the SSR worker handler from `dist/server/index.js`.
- **`Dockerfile`** — multi-stage build (Node 24 alpine), bakes `VITE_*` build args, runs `node server.mjs` at runtime.
- **`.dockerignore`** — excludes `node_modules`, `dist`, `.env`, etc.
- **`docker-compose.yml`** — maps host `127.0.0.1:3100` → container `3000`, reads `.env` at runtime.

For reference, the Dockerfile in the repo is:

```dockerfile
# ---- Build stage ----
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
RUN npm run build

# ---- Runtime stage ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
EXPOSE 3000
CMD ["node", "server.mjs"]
```

> The compose file reads `.env` for both **build args** (the `VITE_*` ones) and **runtime env** (`env_file:`). Same `.env`, different lifecycle.

---

## 4) First deploy on the server

```bash
sudo mkdir -p /srv/tripchan && sudo chown $USER:$USER /srv/tripchan
cd /srv/tripchan
git clone <your-repo-url> .
cp .env.example .env
nano .env       # paste real values; set OPENROUTER_SITE_URL=https://trip.ipongs.com

docker compose up -d --build
docker compose logs -f --tail=200 app
curl -I http://127.0.0.1:3100/   # expect HTTP/1.1 200
```

---

## 5) Nginx reverse proxy

Create `/etc/nginx/sites-available/trip.ipongs.com`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name trip.ipongs.com;

    # ACME http-01 challenge before redirect
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name trip.ipongs.com;

    # certbot fills these in (Step 6)
    ssl_certificate     /etc/letsencrypt/live/trip.ipongs.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trip.ipongs.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Larger payloads for AI streaming + image uploads (adjust as needed)
    client_max_body_size 10m;
    proxy_buffering off;            # required for SSE streaming on /api/chat
    proxy_request_buffering off;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location / {
        proxy_pass         http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 300s;     # AI replies can take a while
        proxy_send_timeout 300s;
    }
}
```

Enable + reload:
```bash
sudo ln -s /etc/nginx/sites-available/trip.ipongs.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

> `proxy_buffering off` is essential — without it, the AI chat at `/api/chat` will *appear* to hang because nginx waits for the full body before sending anything to the client.

---

## 6) TLS with Let's Encrypt

```bash
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d trip.ipongs.com \
     --redirect --agree-tos -m you@example.com --no-eff-email

# Auto-renew is already wired:
sudo systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
```

Verify in a browser: `https://trip.ipongs.com` should load with a valid cert.

---

## 7) Smoke test

- [ ] `https://trip.ipongs.com` loads the home page.
- [ ] `/places` lists places.
- [ ] `/chat` responds (streaming) — confirms `OPENROUTER_API_KEY` works server-side.
- [ ] `/planner` builds a trip plan — confirms structured outputs work.
- [ ] Check-in / review buttons increment points (POC, localStorage).
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` visible in the browser DevTools "Sources" tab.

---

## 8) Updates / rollback / ops cheatsheet

```bash
# Deploy a new version
cd /srv/tripchan
git pull
docker compose up -d --build

# Tail logs
docker compose logs -f --tail=200 app

# Restart only
docker compose restart app

# Roll back to previous commit
git checkout <previous-sha>
docker compose up -d --build

# Free disk
docker image prune -f
docker system df
```

---

## 9) Hardening (do before going public)

- [ ] Disable SSH password auth (key-only): `/etc/ssh/sshd_config` → `PasswordAuthentication no`.
- [ ] Fail2ban for SSH: `sudo apt -y install fail2ban`.
- [ ] Unattended security upgrades: `sudo apt -y install unattended-upgrades && sudo dpkg-reconfigure unattended-upgrades`.
- [ ] Backups: Supabase has its own; if you store user uploads server-side later, snapshot `/srv/tripchan` and any volumes.
- [ ] Monitoring: at minimum, `docker compose ps` + `journalctl -u nginx` regularly. Add UptimeRobot/Healthchecks.io for `https://trip.ipongs.com`.
- [ ] Rate limiting on `/api/chat` (nginx `limit_req` zone) to prevent OpenRouter bill blowups.

Example nginx rate-limit (add inside `http {}` in `/etc/nginx/nginx.conf`):
```nginx
limit_req_zone $binary_remote_addr zone=ai:10m rate=10r/m;
```
And in the `location /api/chat` block:
```nginx
limit_req zone=ai burst=5 nodelay;
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` from nginx | Container not running or wrong port | `docker compose ps`, `curl http://127.0.0.1:3100/` |
| `/api/chat` hangs, no streaming | nginx buffering on | Confirm `proxy_buffering off;` in vhost |
| `Cannot find module './dist/server/index.js'` at `node server.mjs` | Build hasn't run, or Dockerfile didn't copy `dist/` | Confirm `npm run build` succeeded; check `COPY --from=builder /app/dist ./dist` line in Dockerfile |
| `Mixed content` warnings | App linking to `http://` while served via `https://` | Set `OPENROUTER_SITE_URL=https://trip.ipongs.com` in `.env`; rebuild |
| Cert renewal fails | DNS changed / port 80 blocked | `sudo certbot renew --dry-run`; check `ufw status`, DNS |
| `OPENROUTER_API_KEY missing` in logs | `.env` not loaded | `docker compose config` to inspect; ensure `env_file: .env` |
