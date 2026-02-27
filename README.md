# King Vypers Premium Key Store

Fullstack web app untuk jual-beli dan mengelola premium activation keys dengan HWID binding. **Semua jalan di Railway**: backend Node.js + PostgreSQL (tanpa Supabase atau layanan eksternal lain).

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Railway)
- **Auth**: Session (express-session + cookie, user disimpan di PostgreSQL)
- **Payment**: TemanQRIS (QRIS)

## Setup lokal

### 1. Environment

Copy `.env.example` jadi `.env` dan isi:

```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=random-string-min-32-karakter
TEMANQRIS_API_KEY=your_temanqris_api_key
TEMANQRIS_WEBHOOK_SECRET=your_webhook_secret
DISCORD_API_SECRET=optional_discord_bot_secret
```

### 2. Database

Jalankan schema di PostgreSQL (Railway atau lokal):

```bash
psql $DATABASE_URL -f database/schema.sql
```

Atau di Railway: Dashboard → PostgreSQL → Query → paste isi `database/schema.sql` → Run.

### 3. Install & jalankan

```bash
npm install
```

Development (dua terminal):

- Terminal 1: `npm run server` (API di http://localhost:3000)
- Terminal 2: `npm run dev` (Vite di http://localhost:5173, proxy `/api` ke server)

Atau satu perintah:

```bash
npm run dev:all
```

Lalu buka http://localhost:5173.

### 4. Admin user

1. Daftar akun baru lewat app (Sign Up).
2. Di database: tabel `users` → set `is_admin = true` untuk user tersebut.

## Deploy ke Railway

Semua jalan di satu project Railway: **PostgreSQL** + **satu service Node** (API + static frontend).

### Langkah

1. **Buat project Railway**  
   New Project → pilih **Deploy from GitHub repo** (atau CLI), pilih repo ini.

2. **Tambah PostgreSQL**  
   Di project yang sama: **New** → **Database** → **PostgreSQL**.  
   Nanti dapat `DATABASE_URL` (reference variable).

3. **Jalankan schema**  
   Railway → PostgreSQL → **Data** / **Query** → jalankan isi `database/schema.sql` sekali.

4. **Deploy service app**  
   Tambah service dari repo yang sama.  
   Build & start pakai `railway.toml`:
   - Build: `npm run build`
   - Start: `npm start` (Express serve API + static dari `dist/`)

5. **Generate domain**  
   Di service app: **Settings** → **Networking** → **Generate Domain**.  
   Simpan URL (misalnya `https://xxx.up.railway.app`).

6. **Variable environment**  
   Di service app, set:

   - `DATABASE_URL` → reference dari PostgreSQL (atau paste connection string)
   - `SESSION_SECRET` → string acak minimal 32 karakter
   - `TEMANQRIS_API_KEY` → API key TemanQRIS
   - `TEMANQRIS_WEBHOOK_SECRET` → secret untuk verifikasi webhook
   - `DISCORD_API_SECRET` → (opsional) untuk reset HWID dari Discord bot
   - `FRONTEND_ORIGIN` → URL domain Railway (misalnya `https://xxx.up.railway.app`)

   Tidak perlu `VITE_*` untuk production karena frontend dan API satu origin.

7. **Webhook TemanQRIS**  
   Di dashboard TemanQRIS, set URL webhook ke:

   ```
   https://xxx.up.railway.app/api/webhooks/temanqris
   ```

8. **Redeploy**  
   Setelah variabel diset, redeploy service app.

## API (backend)

- `POST /api/auth/register` – Daftar
- `POST /api/auth/login` – Login
- `POST /api/auth/logout` – Logout
- `GET /api/auth/me` – User saat ini (session)
- `GET /api/products` – Daftar produk (public)
- `GET /api/products/:id` – Detail produk (public)
- `GET /api/keys` – Key milik user (auth)
- `POST /api/orders` – Buat order + QRIS (auth)
- `GET /api/orders/:id` – Status order (auth, untuk polling)
- `POST /api/keys/reset-hwid` – Reset HWID key user (auth)
- `POST /api/webhooks/temanqris` – Webhook TemanQRIS (verifikasi signature)
- `GET /api/admin/stats` – Statistik (admin)
- `GET /api/admin/keys` – Daftar key (admin, pagination + filter)
- `PATCH /api/admin/keys/bulk` – Block/delete key (admin)
- `POST /api/admin/keys/reset-hwid` – Reset HWID (admin atau Discord secret)
- `POST /api/admin/keys/generate` – Generate key bulk (admin)

## Fitur

- **User**: Daftar, login, beli key (QRIS), lihat key, reset HWID (1x/30 hari).
- **Admin**: Dashboard statistik, kelola key (block/delete), generate key bulk, reset HWID kapan saja.
- **Webhook**: TemanQRIS panggil `/api/webhooks/temanqris` → order jadi paid, key otomatis di-assign ke user.

## Support

Untuk pertanyaan atau issue, hubungi support.
