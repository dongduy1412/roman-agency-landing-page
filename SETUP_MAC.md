# Setup on macOS (Bun)

## 1. Clone repo

```bash
git clone https://github.com/dongduy1412/roman-agency-landing-page.git
cd roman-agency-landing-page/backend
```

## 2. Install dependencies

```bash
bun install
```

## 3. Setup wrangler config

```bash
cp wrangler.toml.example wrangler.toml
```

## 4. Run database migrations

```bash
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0002_seed.sql
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0003_publish_releases.sql
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0004_testimonials.sql
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0005_products_payments_stats.sql
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0006_subscribers_testimonials_enhance.sql
npx wrangler d1 execute roman-agency-db --local --file=./migrations/0007_seed_media.sql
```

## 5. Start server

```bash
npx wrangler dev
```

Server chay tai: http://localhost:8787

> **Luu y:** KHONG chay `bun run index.ts` — file do chi co endpoint subscribe, khong co admin API.

## 6. Tao admin user (chay 1 lan)

```bash
curl -X POST http://localhost:8787/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password-here"}'
```

## 7. Mo admin panel

Truy cap: http://localhost:8787/admin

Dang nhap bang username/password vua tao.

## Troubleshooting

| Loi | Cach fix |
|-----|----------|
| `wrangler: command not found` | `bun add -g wrangler` |
| Admin API tra 401 | Chua tao admin user (buoc 6) |
| Admin API tra 500 | Chua chay migrations (buoc 4) |
| Khong thay admin page | Kiem tra folder `backend/admin/` co ton tai |
