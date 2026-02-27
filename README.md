# King Vypers Premium Key Store

A fullstack web application for selling and managing premium activation keys with HWID binding, built with React, TypeScript, and Supabase.

## Features

### User Features
- Browse and purchase premium keys
- Secure payment processing via TemanQRIS
- Real-time payment confirmation
- View all purchased keys in dashboard
- HWID binding for device protection
- Self-service HWID reset (once per 30 days)
- Key expiration tracking

### Admin Features
- Dashboard with key statistics and revenue tracking
- Generate keys in bulk for any product/duration
- Import/export keys via CSV
- Manage all keys (view, block, delete)
- Reset HWID for any key
- Real-time stock tracking

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payment**: TemanQRIS Integration
- **Edge Functions**: Supabase Edge Functions (Deno)

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TEMANQRIS_API_KEY=your_temanqris_api_key
TEMANQRIS_WEBHOOK_SECRET=your_webhook_secret
DISCORD_API_SECRET=your_discord_bot_secret
VITE_BASE_URL=http://localhost:5173
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

The database schema is already deployed via Supabase migrations. It includes:
- Products table (pre-seeded with 12 duration options)
- Keys table (for license key management)
- Orders table (for payment tracking)
- User profiles table (for admin flags)

### 4. Create Admin User

To create an admin user:

1. Sign up for a new account in the app
2. Go to your Supabase dashboard
3. Navigate to Table Editor > user_profiles
4. Find your user and set `is_admin` to `true`

### 5. Configure TemanQRIS Webhook

Set up the webhook URL in your TemanQRIS dashboard:

```
https://your-supabase-project.supabase.co/functions/v1/temanqris-webhook
```

### 6. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## API Endpoints

### Edge Functions

- **POST** `/functions/v1/create-payment` - Create payment for product purchase
- **POST** `/functions/v1/temanqris-webhook` - Handle TemanQRIS payment confirmations
- **POST** `/functions/v1/reset-hwid` - Reset HWID for a key
- **POST** `/functions/v1/generate-keys` - Generate keys in bulk (admin only)

### Discord Bot Integration

The reset-hwid endpoint supports Discord bot integration:

```javascript
POST /functions/v1/reset-hwid
{
  "key_code": "XXXX-XXXX-XXXX-XXXX",
  "secret": "your_discord_api_secret"
}
```

## Key Features Explained

### Key Generation

Keys are generated in the format: `XXXX-XXXX-XXXX-XXXX` (uppercase alphanumeric)

Admins can generate keys in bulk:
- Select product/duration (30-360 days)
- Choose quantity (10-1000 keys)
- Keys are automatically linked to the product
- Stock count updates automatically

### HWID Binding

- When a key is activated, it binds to the user's hardware ID
- One key can only be used on one device
- Users can reset HWID once per 30 days
- Admins can reset HWID anytime

### Payment Flow

1. User selects product and clicks "Buy Now"
2. System creates order and requests QRIS code from TemanQRIS
3. User scans QR code to pay
4. TemanQRIS sends webhook confirmation
5. System assigns available key to user
6. User sees key in dashboard immediately

### Security Features

- Row Level Security (RLS) enabled on all tables
- Users can only see their own keys and orders
- Admin access is checked via user_profiles.is_admin
- Webhook signature verification for TemanQRIS
- HMAC-SHA256 for webhook security

## Building for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

## Deploy to Railway

Proyek ini sudah siap deploy ke [Railway](https://railway.app). Yang di-deploy hanya **frontend** (backend tetap di Supabase).

### Langkah deploy

1. **Push project ke GitHub** (kalau belum)
   - Buat repo di GitHub, push project kamu.

2. **Buat project di Railway**
   - Buka [railway.app](https://railway.app) → login/sign up.
   - **New Project** → **Deploy from GitHub repo**.
   - Pilih repo project ini.
   - Railway akan deteksi Node.js dan pakai `railway.toml` (build: `npm run build`, start: `npm start`).

3. **Generate domain**
   - Di service yang baru dibuat: **Settings** → **Networking** → **Generate Domain**.
   - Simpan URL-nya (misalnya `https://xxx.up.railway.app`).

4. **Set environment variables**
   - **Variables** (tab Variables) → tambahkan variabel dari `.env.example`:
   - `VITE_SUPABASE_URL` = URL project Supabase
   - `VITE_SUPABASE_ANON_KEY` = anon key Supabase
   - `VITE_TEMANQRIS_API_KEY` = API key TemanQRIS
   - `VITE_BASE_URL` = **URL domain Railway** (misalnya `https://xxx.up.railway.app`)
   - Variabel yang tidak pakai prefix `VITE_` (misalnya `TEMANQRIS_WEBHOOK_SECRET`, `DISCORD_API_SECRET`) hanya dipakai di Supabase Edge Functions, tidak perlu di Railway.

5. **Redeploy**
   - Setelah variabel diisi, trigger **Redeploy** supaya build baru pakai env yang benar.

### Penting

- **TemanQRIS webhook** tetap mengarah ke Supabase:  
  `https://your-project.supabase.co/functions/v1/temanqris-webhook`
- **VITE_BASE_URL** harus pakai URL production (domain Railway), agar redirect/auth dan link di app benar.

## Admin Panel Access

Navigate to the Admin section after logging in with an admin account:
- Dashboard: View statistics
- Manage Keys: Browse, filter, block, delete keys
- Generate Keys: Create new keys in bulk

## Support

For issues or questions, please contact support.
