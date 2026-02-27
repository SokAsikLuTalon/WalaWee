-- Tambah kolom order_id pendek untuk TemanQRIS (max 30 karakter)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS temanqris_order_id varchar(30) UNIQUE;
