# Penting: Alur Pembayaran TemanQRIS

## ❌ Jangan pakai "Generate QRIS Dinamis" di dashboard TemanQRIS untuk transaksi customer

Kalau kamu buka **dashboard TemanQRIS** → **Konfigurasi Dinamis** → isi nominal → **Generate QRIS Dinamis** → dapat link (misalnya `https://temanqris.com/p/QWUVXUKY`), link itu **tidak terhubung** ke order di database kita.

- Webhook akan kirim `order_id` dari TemanQRIS (bukan dari app kita).
- Backend kita cari order by `order_id` → **tidak ketemu** → "Order not found" → key tidak pernah di-assign.

Jadi **jangan share link yang di-generate dari dashboard** ke customer untuk beli key. Itu hanya untuk tes atau use case lain.

---

## ✅ Alur yang benar (supaya webhook & key jalan)

1. **Customer** buka **website kita** (King Vypers) → login → pilih produk → klik **Proceed to Payment**.
2. **Backend kita** bikin order di database dan panggil **TemanQRIS API** `POST /payment-link` (amount, order_id kita, webhook_url, callback_url).
3. TemanQRIS kasih **link baru** → kita tampilkan ke customer (tombol "Buka Halaman Pembayaran").
4. Customer bayar lewat **link itu** → klik "Sudah Bayar" di TemanQRIS.
5. Kamu (merchant) **Verify** order di dashboard TemanQRIS.
6. TemanQRIS kirim **webhook** `payment.confirmed` ke `https://domain-kamu/api/webhooks/temanqris` dengan `order_id` yang **sama** dengan yang kita kirim waktu create payment link.
7. Backend kita cari order by `order_id` → ketemu → assign key → customer lihat key di **My Keys**.

Ringkas: **setiap transaksi harus lewat website kita dulu (Proceed to Payment)**, supaya order_id di webhook sama dengan yang ada di database.

---

## Cek kalau masih "ga work"

1. **Logs Railway** – Cek apakah ada error webhook: `Order not found for order_id: ...` → artinya bayar pakai link yang **bukan** dari website kita.
2. **Tes yang benar** – Buka **https://domain-kamu** → login → pilih produk → **Proceed to Payment** → bayar lewat link yang **muncul di halaman itu** (bukan link dari dashboard TemanQRIS).
3. **Webhook URL** di TemanQRIS Settings = `https://walawee-production.up.railway.app/api/webhooks/temanqris` (atau domain kamu).
4. **Webhook Secret** di TemanQRIS harus **sama persis** dengan `TEMANQRIS_WEBHOOK_SECRET` di Railway.
