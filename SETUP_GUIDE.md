# King Vypers - Setup Guide (Railway + PostgreSQL)

## Quick Start

### 1. Environment

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=random-string-min-32-chars
TEMANQRIS_API_KEY=your_temanqris_api_key
TEMANQRIS_WEBHOOK_SECRET=your_webhook_secret
DISCORD_API_SECRET=optional_discord_bot_secret
```

### 2. Database

Run the schema once (Railway PostgreSQL or local):

```bash
psql $DATABASE_URL -f database/schema.sql
```

Or in Railway: Data → Query → paste contents of `database/schema.sql` → Run.

### 3. Admin user

1. Register a new account in the app.
2. In the database, open table `users`, find the user, set `is_admin = true`.

### 4. TemanQRIS webhook

In TemanQRIS dashboard, set webhook URL to your app:

- Local: use ngrok or similar to expose `http://localhost:3000/api/webhooks/temanqris`
- Production: `https://your-app.up.railway.app/api/webhooks/temanqris`

### 5. Run locally

- Terminal 1: `npm run server` (API on port 3000)
- Terminal 2: `npm run dev` (Vite on port 5173, proxies `/api` to 3000)

Or: `npm run dev:all` (runs both).

## Database tables

- **users** – Auth (email, password_hash, display_name, is_admin)
- **products** – Pre-seeded 12 products (30–360 days)
- **keys** – License keys (key_code, status, hwid, user_id, expires_at, …)
- **orders** – Purchases (user_id, product_id, payment_status, key_id, …)
- **session** – Express session store (used by connect-pg-simple)

## API (backend)

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Products: `GET /api/products`, `GET /api/products/:id`
- User: `GET /api/keys`, `POST /api/orders`, `GET /api/orders/:id`, `POST /api/keys/reset-hwid`
- Webhook: `POST /api/webhooks/temanqris`
- Admin: `GET /api/admin/stats`, `GET /api/admin/keys`, `PATCH /api/admin/keys/bulk`, `POST /api/admin/keys/reset-hwid`, `POST /api/admin/keys/generate`

## Discord bot (HWID reset)

```javascript
const res = await fetch('https://your-app.up.railway.app/api/admin/keys/reset-hwid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key_code: userKeyCode,
    secret: process.env.DISCORD_API_SECRET
  })
});
const result = await res.json();
```

## Troubleshooting

- **Payment not confirming** – Check webhook URL and `TEMANQRIS_WEBHOOK_SECRET`.
- **Can’t access admin** – Set `is_admin = true` in `users` table, then log out and log in again.
- **Keys not in stock** – Generate keys via Admin → Generate Keys.

## Deploy to Railway

See **README.md** section “Deploy ke Railway”.
