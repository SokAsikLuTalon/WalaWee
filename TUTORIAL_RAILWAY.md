# Tutorial Deploy King Vypers ke Railway (Pemula)

Tutorial ini mengajak kamu deploy project King Vypers ke Railway step-by-step. Tidak perlu pakai Supabase atau layanan lain—semua jalan di Railway (database + app).

**Langsung ke yang kamu butuhkan:**
- **Deploy ulang** setelah ubah kode (push + build) → **Bagian 10**
- **Webhook Secret** TemanQRIS harus sama dengan Railway → **Bagian 11**
- **Alur pembayaran**: Sudah Bayar → Verify di TemanQRIS → key muncul di My Keys → **Bagian 12**

---

## Yang kamu butuhkan

- Akun **GitHub** (gratis)
- Akun **Railway** (gratis tier cukup untuk mulai)
- Kode project King Vypers sudah di komputer kamu
- (Nanti) API key **TemanQRIS** dan **Webhook Secret** untuk pembayaran

---

## Bagian 1: Push project ke GitHub

Kalau project belum ada di GitHub, ikuti ini.

### 1.1 Buat repo baru di GitHub

1. Buka [github.com](https://github.com) dan login.
2. Klik **"+"** di kanan atas → **"New repository"**.
3. Isi:
   - **Repository name:** misalnya `king-vypers` (bebas).
   - **Public**.
   - Jangan centang "Add a README" / "Add .gitignore" (karena project sudah ada).
4. Klik **"Create repository"**.

### 1.2 Push project dari komputer

Buka terminal (PowerShell atau CMD) di folder project kamu (misalnya `Desktop\project`).

```powershell
cd C:\Users\Yere\Desktop\project
```

Cek apakah sudah ada git:

```powershell
git status
```

- Kalau bilang "not a git repository", jalankan dulu:
  ```powershell
  git init
  ```
- Kalau sudah ada git, lanjut.

Tambahkan semua file dan commit:

```powershell
git add .
git commit -m "Initial commit - King Vypers"
```

Sambungkan ke GitHub (ganti `USERNAME` dan `king-vypers` dengan username dan nama repo kamu):

```powershell
git remote add origin https://github.com/USERNAME/king-vypers.git
git branch -M main
git push -u origin main
```

Kalau diminta login GitHub, ikuti petunjuk di layar (bisa pakai browser atau Personal Access Token).

Selesai Bagian 1: kode kamu sudah ada di GitHub.

---

## Bagian 2: Buat project di Railway

### 2.1 Daftar / login Railway

1. Buka [railway.app](https://railway.app).
2. Klik **"Login"** atau **"Start a New Project"**.
3. Pilih **"Login with GitHub"**.
4. Authorize Railway supaya bisa akses repo GitHub kamu.

### 2.2 Buat project baru

1. Di dashboard Railway, klik **"New Project"**.
2. Nanti ada opsi:
   - **Deploy from GitHub repo**
   - **Empty Project**
   - **Database** (PostgreSQL, dll)

Kita butuh **database dulu**, baru **deploy dari GitHub**.

---

## Bagian 3: Tambah database PostgreSQL

### 3.1 Tambah PostgreSQL ke project

1. Di dalam project (setelah klik "New Project"), klik **"Add Service"** atau **"+ New"**.
2. Pilih **"Database"** → **"PostgreSQL"**.
3. Railway akan buatkan database. Tunggu sampai status **"Active"** (biasanya 1–2 menit).

### 3.2 Ambil connection string untuk app (dan untuk jalankan schema dari komputer)

1. Klik service **PostgreSQL** yang baru dibuat.
2. Buka tab **"Variables"**.
3. Ada dua variable penting:
   - **`DATABASE_URL`** – dipakai **app yang jalan di Railway** (host internal). Jangan dipakai dari komputer kamu.
   - **`DATABASE_PUBLIC_URL`** – dipakai **dari komputer kamu** (waktu jalankan schema & set-admin). Copy yang ini untuk langkah Bagian 4 dan 8.

Simpan **DATABASE_PUBLIC_URL** (untuk .env di komputer). Bentuknya kira-kira:  
`postgresql://postgres:xxxxx@xxxxx.proxy.rlwy.net:12345/railway`  
(host-nya **bukan** `railway.internal`.)

---

## Bagian 4: Jalankan schema database (tabel + data awal)

Railway **tidak punya menu Query** di dashboard. Jadi schema kita jalankan **dari komputer kamu** pakai script yang sudah disediakan.

### 4.1 Copy DATABASE_PUBLIC_URL dari Railway

1. Di Railway, klik service **PostgreSQL**.
2. Buka tab **"Variables"**.
3. Cari **`DATABASE_PUBLIC_URL`** (bukan `DATABASE_URL` — yang itu host internal, cuma jalan di dalam Railway).
4. Klik **Copy** value-nya.  
   Bentuknya kira-kira:  
   `postgresql://postgres:xxxxx@xxxxx.proxy.rlwy.net:12345/railway`  
   Kalau tidak ada `DATABASE_PUBLIC_URL`, cek di **Settings** PostgreSQL apakah **Public Networking** / TCP Proxy sudah enabled.

### 4.2 Simpan DATABASE_PUBLIC_URL di file .env

1. Buka folder project di komputer:  
   `C:\Users\Yere\Desktop\project`
2. Cek apakah sudah ada file **`.env`**.
   - Kalau belum ada: buat file baru namanya persis **`.env`** (titik di depan).
   - Kalau sudah ada: boleh pakai itu.
3. Buka file `.env` (Notepad atau VS Code).
4. Tambahkan satu baris (paste connection string yang tadi kamu copy):

   ```
   DATABASE_PUBLIC_URL=postgresql://postgres:xxxxx@xxxxx.proxy.rlwy.net:12345/railway
   ```

   Ganti bagian setelah `=` dengan **DATABASE_PUBLIC_URL** asli dari Railway. Jangan pakai `DATABASE_URL` (yang pakai `railway.internal`) — dari komputer itu tidak bisa connect.
5. Simpan file `.env`.

### 4.3 Jalankan script schema

1. Buka **PowerShell** atau **CMD**.
2. Pindah ke folder project:

   ```powershell
   cd C:\Users\Yere\Desktop\project
   ```

3. Jalankan:

   ```powershell
   node database/run-schema.js
   ```

4. Kalau berhasil, muncul pesan:  
   **"Schema berhasil dijalankan. Tabel dan data produk sudah siap."**

Kalau muncul error:
- **"DATABASE_PUBLIC_URL tidak ada"** → Pakai **DATABASE_PUBLIC_URL** di .env (bukan DATABASE_URL). Ambil dari Railway → PostgreSQL → Variables.
- **"Kamu pakai URL internal (railway.internal)"** → Kamu masih pakai DATABASE_URL. Ganti di .env jadi **DATABASE_PUBLIC_URL** dan paste value **DATABASE_PUBLIC_URL** dari Railway.
- **"connection refused" / "timeout"** → Cek lagi connection string. Di Settings PostgreSQL pastikan **Public Networking** / TCP Proxy enabled.
- **"relation already exists"** → Tabel sudah ada; schema sudah pernah jalan.

Selesai: tabel (users, products, keys, orders, session) dan 12 produk sudah ada di database Railway.

---

## Bagian 5: Deploy aplikasi dari GitHub

### 5.1 Tambah service dari GitHub

1. Kembali ke **project** Railway (bukan ke service PostgreSQL).
2. Klik **"Add Service"** / **"+ New"** lagi.
3. Pilih **"GitHub Repo"** (atau **"Deploy from GitHub repo"**).
4. Pilih repo yang tadi kamu push (misalnya `king-vypers`).
5. Kalau diminta pilih branch, pilih **main** (atau branch yang kamu pakai).

Railway akan clone repo dan otomatis detect Node.js. Build dan start dipakai dari file **`railway.toml`** di project kamu:

- **Build:** `npm run build`
- **Start:** `npm start` (jalan `node server/index.js`)

Tunggu sampai deploy selesai (bisa 2–5 menit). Status jadi **"Success"** / **"Active"**.

### 5.2 Generate domain (URL website)

1. Klik service **aplikasi** (bukan PostgreSQL).
2. Buka tab **"Settings"**.
3. Cari bagian **"Networking"** / **"Domains"**.
4. Klik **"Generate Domain"**.
5. Railway kasih URL, misalnya:  
   `https://king-vypers-production-xxxx.up.railway.app`  
   Copy dan simpan URL ini—ini **URL utama** aplikasi kamu.

---

## Bagian 6: Set environment variables (pengaturan rahasia)

Aplikasi butuh beberapa variable supaya bisa connect ke database dan TemanQRIS.

### 6.1 Buka Variables service app

1. Tetap di service **aplikasi** (bukan PostgreSQL).
2. Buka tab **"Variables"** (atau **"Environment"**).

### 6.2 Tambah variable satu per satu

Klik **"Add Variable"** / **"New Variable"** lalu isi **name** dan **value** seperti di bawah. Ganti nilai contoh dengan nilai asli kamu.

| Name | Value | Keterangan |
|------|--------|------------|
| `DATABASE_URL` | *(Reference ke PostgreSQL — di Railway pilih "Add Reference" / variable dari service PostgreSQL)* | Untuk **app yang jalan di Railway**; biarkan Railway yang isi (reference). Jangan pakai untuk jalankan schema dari komputer. |
| `SESSION_SECRET` | Buat string acak minimal 32 karakter, misalnya: `rahasia-super-aman-12345-xyz` | Untuk keamanan session login. |
| `TEMANQRIS_API_KEY` | API key dari dashboard TemanQRIS | Dari akun TemanQRIS kamu. |
| `TEMANQRIS_WEBHOOK_SECRET` | Webhook secret dari TemanQRIS | Sama, dari dashboard TemanQRIS. |
| `FRONTEND_ORIGIN` | URL domain yang tadi kamu generate, contoh: `https://king-vypers-production-xxxx.up.railway.app` | Harus persis sama dengan URL app (pakai https). |
| `DISCORD_API_SECRET` | (Opsional) Secret untuk bot Discord | Hanya kalau kamu pakai Discord bot untuk reset HWID. |

Contoh isian:

```
DATABASE_URL = postgresql://postgres:AbCdEf123@containers.railway.app:5432/railway
SESSION_SECRET = my-super-secret-key-min-32-characters-long
TEMANQRIS_API_KEY = tq_xxxxxxxxxxxx
TEMANQRIS_WEBHOOK_SECRET = whsec_xxxxxxxx
FRONTEND_ORIGIN = https://king-vypers-production-xxxx.up.railway.app
```

Simpan semua variable. Setelah disimpan, Railway biasanya **redeploy otomatis**. Kalau tidak, lanjut ke Bagian 6.3.

### 6.3 Redeploy (kalau perlu)

1. Di service app, buka tab **"Deployments"**.
2. Klik deployment terbaru → **"Redeploy"** (atau tiga titik → Redeploy).

Tunggu sampai status **Success**. Setelah itu, buka URL domain kamu di browser.

---

## Bagian 10: Deploy ulang setelah ada perubahan kode (push + build)

Setiap kali kamu ubah kode (misalnya update webhook atau payment link), agar perubahan dipakai di Railway kamu harus **push ke GitHub** lalu **build ulang** di Railway.

### 10.1 Simpan perubahan dengan Git (dari komputer)

1. Buka **PowerShell** atau **CMD**.
2. Pindah ke folder project:
   ```powershell
   cd C:\Users\Yere\Desktop\project
   ```
3. Cek file apa saja yang berubah:
   ```powershell
   git status
   ```
   Akan muncul daftar file yang diubah (misalnya `server/index.js`).
4. Tambahkan semua file yang mau di-deploy:
   ```powershell
   git add .
   ```
   (Titik artinya "semua file yang berubah".)
5. Buat commit dengan pesan singkat:
   ```powershell
   git commit -m "Update webhook TemanQRIS sesuai docs"
   ```
6. Kirim ke GitHub:
   ```powershell
   git push origin main
   ```
   (Kalau branch kamu bukan `main`, ganti dengan nama branch yang dipakai di Railway.)

Selesai: kode terbaru sudah di GitHub.

### 10.2 Build ulang di Railway

1. Buka [railway.app](https://railway.app) dan login.
2. Pilih **project** King Vypers kamu.
3. Klik service **aplikasi** (bukan PostgreSQL)—yang namanya sama dengan repo GitHub kamu.
4. Buka tab **"Deployments"** (di atas).
5. Railway biasanya **otomatis** mendeteksi push ke GitHub dan mulai build baru. Kalau ada deployment baru dengan status **"Building"** atau **"Deploying"**, tunggu sampai jadi **"Success"** / **"Active"** (bisa 2–5 menit).
6. Kalau **tidak** ada deployment baru:
   - Klik deployment terbaru (paling atas).
   - Klik tombol **"Redeploy"** (atau tiga titik ⋮ → **Redeploy**).
   - Tunggu sampai status **Success**.

Setelah Success, aplikasi sudah jalan dengan kode terbaru. Buka URL domain kamu di browser untuk cek.

---

## Bagian 11: Webhook Secret TemanQRIS (harus sama dengan Railway)

Agar webhook **payment.confirmed** dari TemanQRIS bisa diverifikasi oleh server kamu, **Webhook Secret** di dashboard TemanQRIS **harus persis sama** dengan **TEMANQRIS_WEBHOOK_SECRET** di Railway.

### 11.1 Cari / buat Webhook Secret di TemanQRIS

1. Buka [temanqris.com](https://temanqris.com) dan **login** ke dashboard.
2. Cari menu **Settings** atau **Pengaturan** (biasanya di sidebar atau ikon gear).
3. Di dalam Settings, cari bagian **Webhook** atau **API / Integrasi**.
4. Akan ada:
   - **Webhook URL** — isi dengan URL endpoint kamu:  
     `https://NAMA-APP-KAMU.up.railway.app/api/webhooks/temanqris`  
     (ganti `NAMA-APP-KAMU` dengan domain Railway kamu, misalnya `king-vypers-production-xxxx`.)
   - **Webhook Secret** — ini yang dipakai untuk tanda tangan (signature).  
     - Kalau sudah ada secret: **copy** dan simpan (kita pakai ini di Railway).  
     - Kalau belum ada / mau ganti: biasanya ada tombol **"Generate"** atau **"Buat Secret"**. Klik → copy secret yang muncul (simpan di tempat aman, biasanya cuma ditampilkan sekali).

5. **Simpan** pengaturan di TemanQRIS (tombol Save / Simpan).

### 11.2 Set TEMANQRIS_WEBHOOK_SECRET di Railway

1. Buka [railway.app](https://railway.app) → project kamu → klik service **aplikasi**.
2. Buka tab **"Variables"**.
3. Cari variable **TEMANQRIS_WEBHOOK_SECRET**:
   - Kalau sudah ada: klik **Edit**, lalu paste **nilai yang persis sama** dengan Webhook Secret dari TemanQRIS (tanpa spasi di depan/belakang).
   - Kalau belum ada: klik **"+ New Variable"** atau **"Add Variable"** → Name: `TEMANQRIS_WEBHOOK_SECRET`, Value: paste Webhook Secret dari TemanQRIS.
4. Simpan. Railway akan **redeploy otomatis**; tunggu sampai deployment **Success**.

Sekarang TemanQRIS dan Railway pakai secret yang sama → signature webhook bisa diverifikasi.

---

## Bagian 12: Alur pembayaran sampai key muncul di My Keys (detail)

Setelah customer bayar pakai QRIS dan klik **"Sudah Bayar"**, status di TemanQRIS jadi **awaiting_confirmation**. Key **belum** otomatis muncul. Kamu (merchant) harus **verifikasi** dulu di TemanQRIS, baru webhook **payment.confirmed** terkirim dan key muncul di **My Keys**.

### Langkah 1: Customer bayar dan klik "Sudah Bayar"

1. Customer buka **payment link** (misalnya link yang muncul setelah "Proceed to Payment" di website kamu).
2. Customer scan QRIS, bayar di e-wallet (OVO, GoPay, DANA, dll).
3. Customer klik tombol **"Sudah Bayar"** di halaman TemanQRIS.
4. Status order di TemanQRIS berubah jadi **"Menunggu konfirmasi"** / **awaiting_confirmation**.  
   Saat ini **belum** ada webhook **payment.confirmed**, jadi key **belum** di-assign.

### Langkah 2: Kamu (merchant) verifikasi order di TemanQRIS

1. Buka [temanqris.com](https://temanqris.com) dan **login** ke dashboard.
2. Cari menu **Order**, **Cek Order**, **Daftar Order**, atau **Payment Links** (nama bisa beda tiap dashboard).
3. Buka daftar order / payment link. Cari order yang statusnya **"Menunggu konfirmasi"** / **awaiting_confirmation** (biasanya ada filter atau kolom status).
4. Cek di e-wallet/rekening kamu: **apakah uang sudah masuk?**
   - Kalau sudah masuk → lanjut verifikasi.
   - Kalau belum → jangan verifikasi dulu; bisa konfirmasi ke customer atau tunggu.
5. Untuk order yang sudah kamu pastikan dananya masuk, klik order tersebut. Akan ada tombol **"Konfirmasi"**, **"Verify"**, **"Tandai sudah dibayar"**, atau **"Approve"**.
6. Klik tombol itu. Status order berubah jadi **Paid** / **paid**.

### Langkah 3: Webhook payment.confirmed dan key di My Keys

1. Setelah kamu klik Verify/Konfirmasi, TemanQRIS mengirim **webhook** ke URL kamu (`/api/webhooks/temanqris`) dengan event **payment.confirmed**.
2. Server King Vypers menerima webhook, cek signature pakai **TEMANQRIS_WEBHOOK_SECRET**, lalu:
   - Mencari order di database (pakai `order_id` dari webhook = `temanqris_order_id` kamu).
   - Mengambil 1 key yang masih **active** untuk produk yang dibeli.
   - Meng-assign key ke user (status key jadi **used**, order jadi **paid**).
3. Di **website** kamu:
   - Customer buka **My Keys** (atau refresh halaman checkout yang polling).
   - Key yang tadi di-assign akan **muncul** di daftar My Keys dengan **key_code** yang bisa dipakai.

### Ringkasan alur

| Urutan | Siapa        | Apa yang dilakukan |
|--------|--------------|--------------------|
| 1      | Customer     | Bayar QRIS → klik "Sudah Bayar" |
| 2      | TemanQRIS    | Status order = awaiting_confirmation |
| 3      | Kamu (merchant) | Buka dashboard TemanQRIS → Cek Order → pastikan dana masuk → Klik Verify/Konfirmasi |
| 4      | TemanQRIS    | Kirim webhook **payment.confirmed** ke server kamu |
| 5      | Server kamu  | Assign key ke order, update status paid |
| 6      | Customer     | Lihat key di **My Keys** di website kamu |

Kalau key tidak muncul setelah kamu verify:
- Cek **Variables** di Railway: **TEMANQRIS_WEBHOOK_SECRET** harus sama dengan Webhook Secret di TemanQRIS.
- Cek **Deployments** → **View Logs**: ada error "Invalid signature" atau "Order not found" tidak.
- Pastikan **Webhook URL** di TemanQRIS mengarah ke `https://DOMAIN-KAMU.up.railway.app/api/webhooks/temanqris` (pakai https, tanpa typo).

---

## Bagian 7: Set webhook TemanQRIS

Agar pembayaran QRIS bisa otomatis mengaktifkan key, TemanQRIS harus bisa panggil backend kamu.

1. Login ke **dashboard TemanQRIS**.
2. Cari bagian **Webhook** / **Callback URL** (biasanya di **Settings**).
3. Isi **Webhook URL** dengan:
   ```
   https://NAMA-DOMAIN-KAMU.up.railway.app/api/webhooks/temanqris
   ```
   Ganti `NAMA-DOMAIN-KAMU` dengan domain yang Railway kasih (misalnya `king-vypers-production-xxxx`).
4. Untuk **Webhook Secret**: harus **sama persis** dengan `TEMANQRIS_WEBHOOK_SECRET` di Railway. Panduan detail ada di **Bagian 11**.
5. Simpan pengaturan di TemanQRIS.

---

## Bagian 8: Buat user admin

Sampai sini aplikasi sudah jalan, tapi belum ada admin.

### 8.1 Daftar user lewat website

1. Buka URL app kamu (domain Railway).
2. Klik **Sign Up**.
3. Isi **Display Name**, **Email**, **Password**.
4. Daftar dan pastikan bisa login (Sign In).

### 8.2 Jadikan user itu admin di database

Railway tidak punya Query/Table Editor yang gampang, jadi kita set admin **dari komputer** pakai script yang sudah ada di project.

1. Pastikan di **`.env`** kamu ada **`DATABASE_PUBLIC_URL`** (untuk jalan dari komputer). Kalau cuma mau set admin dan app sudah deploy, bisa pakai DATABASE_PUBLIC_URL yang sama seperti waktu jalankan schema.
2. Tambahkan satu baris (ganti dengan **email** yang tadi dipakai daftar):

   ```
   ADMIN_EMAIL=emailkamu@gmail.com
   ```

3. Dari **root folder project** jalankan:

   ```powershell
   node set-admin.js
   ```

4. Kalau berhasil muncul: **"Admin berhasil diset untuk: emailkamu@gmail.com"**.  
   Kalau "User tidak ketemu" → cek ejaan email dan pastikan sudah daftar lewat website dulu.

**Alternatif:** Kalau kamu pakai aplikasi database (DBeaver, pgAdmin), connect pakai `DATABASE_URL` Railway → buka tabel **`users`** → cari baris email kamu → ubah **`is_admin`** jadi **true**.

Selesai: user itu sekarang admin. **Logout** dari app, lalu **login lagi**. Setelah itu harusnya muncul menu **Admin** (Dashboard, Manage Keys, Generate Keys).

---

## Bagian 9: Cek jalan tidaknya

1. **Landing:** Buka URL app → harusnya tampil daftar produk (12 paket durasi).
2. **Login:** Sign In dengan email/password yang tadi.
3. **Admin:** Setelah login, klik **Admin** → Dashboard, Generate Keys, Manage Keys harus bisa dibuka.
4. **Generate key:** Di Admin → Generate Keys, pilih produk, quantity, lalu Generate. Setelah itu di Manage Keys harus ada key baru dan stock produk bertambah.
5. **Pembayaran (kalau sudah set TemanQRIS):** Coba beli 1 produk → muncul QRIS → customer bayar dan klik "Sudah Bayar" → **kamu** buka TemanQRIS → Cek Order → Verify/Konfirmasi order → webhook jalan → key muncul di My Keys (lihat **Bagian 12**).

---

## Ringkasan urutan

1. Push project ke GitHub.
2. Railway: New Project → Add PostgreSQL. Copy **DATABASE_PUBLIC_URL** (untuk jalankan schema dari komputer) dan set **DATABASE_URL** (reference) di service app.
3. Jalankan schema dari komputer: di .env isi **DATABASE_PUBLIC_URL**, lalu `node database/run-schema.js`.
4. Add Service dari GitHub repo → deploy app → Generate Domain.
5. Set variable: `DATABASE_URL`, `SESSION_SECRET`, `TEMANQRIS_*`, `FRONTEND_ORIGIN`.
6. Set webhook TemanQRIS (URL + Secret): lihat **Bagian 7** dan **Bagian 11**.
7. Daftar user di app → set admin (`node set-admin.js`) → logout & login lagi.

**Setelah ada perubahan kode:** push ke GitHub → Railway auto-build, atau Redeploy (**Bagian 10**).  
**Alur pembayaran sampai key muncul:** customer bayar + "Sudah Bayar" → kamu Verify di TemanQRIS → webhook → key di My Keys (**Bagian 12**).

---

## Troubleshooting singkat

- **Build gagal:** Pastikan di repo ada `package.json`, `server/index.js`, dan `railway.toml`. Cek tab "Build Logs" di deployment.
- **Error connect database:** Cek `DATABASE_URL` benar (copy lagi dari tab Variables/Connect PostgreSQL). Pastikan service app dan PostgreSQL satu project.
- **Login tidak jalan / session hilang:** Pastikan `FRONTEND_ORIGIN` pakai https dan sama persis dengan URL yang kamu buka di browser (tanpa slash di akhir).
- **Webhook TemanQRIS gagal:** Cek URL webhook dan `TEMANQRIS_WEBHOOK_SECRET` sama dengan yang di dashboard TemanQRIS. Cek log deployment di Railway untuk pesan error.
- **Tidak ada menu Admin:** Pastikan `users.is_admin = true` untuk email kamu dan sudah logout lalu login lagi.

Kalau ada langkah yang masih membingungkan, tulis saja bagian nomor berapa dan errornya (atau screenshot), nanti bisa dilanjutkan dari situ.
