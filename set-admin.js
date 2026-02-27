/**
 * Set user jadi admin (is_admin = true) by email.
 * Jalankan dari root project: node set-admin.js
 * Butuh .env berisi DATABASE_PUBLIC_URL (atau DATABASE_URL) dan ADMIN_EMAIL.
 *
 * Dari komputer: pakai DATABASE_PUBLIC_URL dari Railway (bukan DATABASE_URL).
 */

import 'dotenv/config';
import pg from 'pg';

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL;

if (!connectionString) {
  console.error('ERROR: Set DATABASE_PUBLIC_URL di .env (untuk jalan dari komputer).');
  process.exit(1);
}
if (connectionString.includes('railway.internal')) {
  console.error('ERROR: Pakai DATABASE_PUBLIC_URL dari Railway, bukan DATABASE_URL (internal).');
  process.exit(1);
}
if (!email) {
  console.error('ERROR: Set ADMIN_EMAIL di .env, contoh: ADMIN_EMAIL=emailkamu@gmail.com');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const r = await pool.query(
      "UPDATE users SET is_admin = true WHERE email = $1 RETURNING id, email, display_name",
      [email.trim()]
    );
    if (r.rowCount && r.rowCount > 0) {
      console.log('Admin berhasil diset untuk:', r.rows[0].email);
    } else {
      console.log('User tidak ketemu dengan email:', email);
      console.log('Pastikan sudah daftar dulu lewat website, lalu jalankan lagi script ini.');
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
