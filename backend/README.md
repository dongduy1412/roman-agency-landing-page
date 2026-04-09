# Roman Agency API — Cloudflare Workers

Backend cho **romanagency.net** được build bằng **Hono** chạy trên **Cloudflare Workers**.

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Cloudflare Workers (V8) |
| Framework | Hono v4 |
| Database | Cloudflare D1 (SQLite edge) |
| Storage | Cloudflare R2 (media CDN) |
| Auth | JWT (Web Crypto API) |

## Setup lần đầu

### 1. Cài dependencies

```bash
npm install
```

### 2. Tạo D1 database và R2 bucket

```bash
# Tạo D1
npx wrangler d1 create roman-agency-db
# Copy database_id vào wrangler.toml

# Tạo R2
npx wrangler r2 bucket create roman-agency-media
```

### 3. Chạy migrations

```bash
npm run db:migrate   # local
npm run db:seed      # local seed data

# Hoặc production:
npm run db:migrate:remote
npm run db:seed:remote
```

### 4. Tạo admin user (chạy 1 lần)

```bash
# Sau khi server chạy, gọi:
curl -X POST http://localhost:8787/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

### 5. Dev local

```bash
npm run dev
# Server chạy tại http://localhost:8787
```

### 6. Deploy

```bash
npm run deploy
```

## API Endpoints

### Public

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/faqs?lang=en` | Lấy FAQ |
| GET | `/api/media?section=proof-campaign` | Lấy media |
| GET | `/api/settings?lang=en` | Lấy settings |
| POST | `/api/subscribe` | Đăng ký email |

### Auth

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/setup` | Tạo admin (1 lần) |
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Check token |

### Admin (cần Authorization: Bearer {token})

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST/PATCH/DELETE | `/api/admin/media` | CRUD media |
| POST | `/api/admin/media/upload` | Upload file → R2 |
| PATCH | `/api/admin/media-reorder` | Reorder media |
| GET/POST/PATCH/DELETE | `/api/admin/faqs` | CRUD FAQ |
| PATCH | `/api/admin/faqs-reorder` | Reorder FAQ |
| GET/PUT | `/api/admin/settings` | Settings |
| GET | `/api/admin/subscribers` | Subscribers |
| GET | `/api/admin/subscribers/export` | Export CSV |
