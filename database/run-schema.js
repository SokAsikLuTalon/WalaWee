/**
 * Jalankan schema database dari komputer (tanpa perlu "Query" di Railway).
 *
 * PENTING: Dari komputer kamu harus pakai DATABASE_PUBLIC_URL (bukan DATABASE_URL).
 * Di Railway: PostgreSQL → Variables → copy "DATABASE_PUBLIC_URL".
 *
 * Cara pakai:
 * 1. Copy DATABASE_PUBLIC_URL dari Railway (bukan DATABASE_URL — yang itu cuma jalan di dalam Railway).
 * 2. Di .env isi: DATABASE_PUBLIC_URL=postgresql://...
 * 3. Dari root project: node database/run-schema.js
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dari komputer pakai PUBLIC URL; kalau enggak ada, coba DATABASE_URL (misalnya di server lain)
const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: Set DATABASE_PUBLIC_URL di .env (untuk jalan dari komputer).');
  console.error('Ambil dari Railway: PostgreSQL → Variables → DATABASE_PUBLIC_URL');
  console.error('Jangan pakai DATABASE_URL — itu host internal (postgres.railway.internal) yang cuma jalan di dalam Railway.');
  process.exit(1);
}
if (connectionString.includes('railway.internal')) {
  console.error('ERROR: Kamu pakai URL internal (railway.internal). Itu cuma jalan di dalam Railway.');
  console.error('Di Railway: PostgreSQL → Variables → copy DATABASE_PUBLIC_URL (bukan DATABASE_URL).');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const schemaPath = path.join(__dirname, 'schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

async function run() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Schema berhasil dijalankan. Tabel dan data produk sudah siap.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
