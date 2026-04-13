# Roman Agency Landing Page

Landing page + Admin backend cho **Roman Agency Marketing** — dich vu Facebook Ads Account.

## Project Structure

```
.
├── index.html              # Landing page (EN)
├── zh/                     # Landing page (ZH)
├── ru/                     # Landing page (RU)
├── script.js               # Frontend JS (hydration, newsletter, FAQ, testimonials, settings)
├── styles.css              # Frontend CSS
├── i18n.js                 # Internationalization
├── assets/                 # Images, videos, icons (1x)
├── assets-2x/              # High-res images (2x)
├── BM/                     # Business Manager screenshots
├── SDRoman/                # Additional proof screenshots
├── backend/                # Cloudflare Worker API + Admin panel
│   ├── src/                # Worker source (Hono + TypeScript)
│   ├── admin/              # Admin dashboard (static HTML/JS/CSS)
│   ├── migrations/         # D1 SQL migrations
│   ├── scripts/            # Utility scripts (migrate-assets)
│   └── wrangler.toml       # Cloudflare Workers config
└── docs/                   # Design docs
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Static HTML/CSS/JS, Cloudflare Pages |
| Backend | Cloudflare Workers + Hono v4 |
| Database | Cloudflare D1 (SQLite at edge) |
| Storage | Cloudflare R2 (media CDN) |
| Auth | JWT (Web Crypto API) |

## Features

### Landing Page
- Multi-language support (EN / ZH / RU)
- Dynamic FAQ, testimonials, settings hydrated from API
- Newsletter subscription form
- Published media hydration from admin config
- Responsive design, dark premium theme

### Admin Dashboard
- Media Manager — upload, replace, reorder, show/hide media across sections
- FAQ Manager — CRUD with language tabs (EN/ZH/RU per popup)
- Site Settings — stats, pricing, contact info (numeric-only inputs)
- Subscribers — list, remove, export CSV
- Testimonials — CRUD, displayed on frontend
- Publish Changes — snapshot current config, publish history, rollback

## Quick Start

### 1. Backend (API + Admin Panel)

```bash
cd backend
npm install

# Run migrations (first time)
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0002_seed.sql
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0003_publish_releases.sql
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0004_testimonials.sql

# Start dev server
npx wrangler dev
# -> http://127.0.0.1:8787
```

After server is running, create admin user (one time):

```bash
curl -X POST http://127.0.0.1:8787/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"roman2026!"}'
```

Seed media from frontend assets (one time):

```bash
API_BASE=http://127.0.0.1:8787 node --experimental-strip-types ./scripts/migrate-assets.ts
```

### 2. Frontend (Landing Page)

```bash
# From project root
npx wrangler pages dev . --port 3000
# -> http://localhost:3000
```

Or use VS Code Live Server (port 5500) — frontend auto-detects local API.

### 3. Admin Login

- URL: `http://127.0.0.1:8787/login.html`
- Username: `admin`
- Password: `roman2026!`

## Deploy

### Backend (Worker)

```bash
cd backend
npx wrangler deploy
```

### Frontend (Pages)

```bash
npx wrangler pages deploy . --project-name roman-agency-frontend-dev
```

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://master.roman-agency-frontend-dev.pages.dev |
| Backend / Admin | https://roman-agency-api.dong141220047.workers.dev |
| Admin Login | https://roman-agency-api.dong141220047.workers.dev/login.html |

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/faqs?lang=en` | Get FAQs by language |
| GET | `/api/testimonials?lang=en` | Get testimonials |
| GET | `/api/media?section=...` | Get visible media |
| GET | `/api/settings?lang=en` | Get site settings |
| GET | `/api/published-config` | Get published media config |
| POST | `/api/subscribe` | Newsletter subscription |

### Admin (requires Bearer token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/setup` | Create admin (first time) |
| POST | `/api/auth/login` | Login, returns JWT |
| GET/POST/PATCH/DELETE | `/api/admin/media` | CRUD media |
| POST | `/api/admin/media/upload` | Upload file to R2 |
| POST | `/api/admin/media/:id/replace` | Replace media file |
| PATCH | `/api/admin/media-reorder` | Reorder media |
| GET/POST/PATCH/DELETE | `/api/admin/faqs` | CRUD FAQ |
| GET/PUT | `/api/admin/settings` | Site settings |
| GET/DELETE | `/api/admin/subscribers` | Manage subscribers |
| GET | `/api/admin/subscribers/export` | Export CSV |
| GET/POST/PATCH/DELETE | `/api/admin/testimonials` | CRUD testimonials |
| GET | `/api/admin/publish/history` | Publish history |
| POST | `/api/admin/publish` | Publish changes |
| POST | `/api/admin/publish/:id/rollback` | Rollback to version |
