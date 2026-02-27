import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import pg from 'pg';
import pgSession from 'connect-pg-simple';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const Pool = pg.Pool;
const pgStore = pgSession(session);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const sessionStore = new pgStore({ pool, createTableIfMissing: true });

const app = express();
const PORT = process.env.PORT || 3000;

// Wajib di Railway/proxy: supaya cookie Secure & session jalan
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(cookieParser());

// Webhook must read raw body for signature verification - register before express.json()
app.post('/api/webhooks/temanqris', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-temanqris-signature'];
  const secret = process.env.TEMANQRIS_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return res.status(400).json({ error: 'Missing signature or secret' });
  }
  const rawBody = (req.body && Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || ''));
  const crypto = await import('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  if (signature !== expected) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  if (data.status !== 'paid') {
    return res.json({ message: 'Payment not completed' });
  }
  try {
    const orderRes = await pool.query(
      `SELECT o.id, o.user_id, o.product_id, p.duration_days
       FROM orders o JOIN products p ON o.product_id = p.id
       WHERE o.id = $1 AND o.payment_status = 'pending'`,
      [data.order_id]
    );
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const keyRes = await pool.query(
      `SELECT id, key_code FROM keys
       WHERE product_id = $1 AND status = 'active' AND user_id IS NULL LIMIT 1`,
      [order.product_id]
    );
    const key = keyRes.rows[0];
    if (!key) {
      await pool.query("UPDATE orders SET payment_status = 'failed' WHERE id = $1", [order.id]);
      return res.status(400).json({ error: 'No available keys' });
    }
    const userRes = await pool.query('SELECT display_name FROM users WHERE id = $1', [order.user_id]);
    const userName = userRes.rows[0]?.display_name || 'Unknown';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + order.duration_days);
    await pool.query(
      `UPDATE keys SET status = 'used', user_id = $1, user_name = $2, activated_at = NOW(), expires_at = $3 WHERE id = $4`,
      [order.user_id, userName, expiresAt, key.id]
    );
    await pool.query(
      "UPDATE orders SET payment_status = 'paid', key_id = $1, paid_at = NOW() WHERE id = $2",
      [key.id, order.id]
    );
    return res.json({ success: true, message: 'Payment processed', key_code: key.key_code });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.use(express.json());
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// --- Auth helpers ---
function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

// --- Auth routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, display_name: displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name required' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3)
       RETURNING id, email, display_name, is_admin, created_at`,
      [email, password_hash, displayName]
    );
    const user = rows[0];
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.displayName = user.display_name;
    req.session.isAdmin = user.is_admin;
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_admin: user.is_admin,
      },
    });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    console.error(e);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, display_name, is_admin FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.displayName = user.display_name;
    req.session.isAdmin = user.is_admin;
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_admin: user.is_admin,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({
    user: {
      id: req.session.userId,
      email: req.session.email,
      display_name: req.session.displayName,
      is_admin: req.session.isAdmin,
    },
  });
});

// --- Public: products ---
app.get('/api/products', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, duration_days, price, stock_count, created_at, updated_at FROM products ORDER BY duration_days ASC'
    );
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, duration_days, price, stock_count FROM products WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    return res.json(rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load product' });
  }
});

// --- User: my keys ---
app.get('/api/keys', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM keys WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load keys' });
  }
});

// --- User: create order (create payment) ---
app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const { product_id: productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'product_id required' });

    const productRes = await pool.query(
      'SELECT id, name, price, stock_count, duration_days FROM products WHERE id = $1',
      [productId]
    );
    const product = productRes.rows[0];
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock_count <= 0) return res.status(400).json({ error: 'Product out of stock' });

    const orderRes = await pool.query(
      `INSERT INTO orders (user_id, product_id, amount, payment_status)
       VALUES ($1, $2, $3, 'pending') RETURNING id, amount, payment_status`,
      [req.session.userId, product.id, product.price]
    );
    const order = orderRes.rows[0];

    const temanqrisApiKey = process.env.TEMANQRIS_API_KEY;
    if (!temanqrisApiKey) {
      await pool.query("UPDATE orders SET payment_status = 'failed' WHERE id = $1", [order.id]);
      return res.status(500).json({ error: 'Payment provider not configured' });
    }

    const baseUrl = process.env.FRONTEND_ORIGIN || process.env.BASE_URL || '';
    const webhookUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/webhooks/temanqris` : '';
    const callbackUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/checkout?order=${order.id}` : '';

    const temanRes = await fetch('https://temanqris.com/api/qris/payment-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': temanqrisApiKey,
      },
      body: JSON.stringify({
        amount: product.price,
        description: `${product.name} - King Vypers Premium Key`,
        order_id: String(order.id),
        webhook_url: webhookUrl || undefined,
        callback_url: callbackUrl || undefined,
      }),
    });

    const responseBody = await temanRes.json().catch(() => ({}));

    if (!temanRes.ok) {
      await pool.query("UPDATE orders SET payment_status = 'failed' WHERE id = $1", [order.id]);
      const msg = responseBody.message || responseBody.error || responseBody.msg || 'TemanQRIS menolak request';
      console.error('TemanQRIS error:', temanRes.status, responseBody);
      return res.status(500).json({ error: `Gagal buat pembayaran: ${msg}` });
    }

    const paymentData = responseBody;
    const qrisImage = paymentData.qr_image || paymentData.qris_image || paymentData.qr_image_url;
    const paymentLink = paymentData.payment_link || paymentData.link || paymentData.url;
    const qrisUrl = qrisImage || paymentLink || '';

    await pool.query(
      'UPDATE orders SET payment_id = $1, qris_url = $2 WHERE id = $3',
      [paymentData.order_id || paymentData.id || order.id, qrisUrl, order.id]
    );

    return res.json({
      success: true,
      order_id: order.id,
      payment_id: paymentData.order_id || paymentData.id,
      qris_url: qrisUrl,
      payment_link: paymentLink || qrisUrl,
      amount: product.price,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- User: get order status (for polling after payment) ---
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, payment_status, key_id, paid_at FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    return res.json(rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load order' });
  }
});

// --- User: get key by id (for checkout success) ---
app.get('/api/keys/by-id/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, key_code FROM keys WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Key not found' });
    return res.json(rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load key' });
  }
});

// --- User: reset HWID ---
app.post('/api/keys/reset-hwid', requireAuth, async (req, res) => {
  try {
    const { key_code: keyCode } = req.body;
    if (!keyCode) return res.status(400).json({ error: 'key_code required' });

    const keyRes = await pool.query('SELECT * FROM keys WHERE key_code = $1', [keyCode]);
    const key = keyRes.rows[0];
    if (!key) return res.status(404).json({ error: 'Key not found' });
    if (key.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Key does not belong to you' });
    }
    if (key.status === 'blocked') return res.status(400).json({ error: 'Key is blocked' });
    if (key.status === 'expired') return res.status(400).json({ error: 'Key has expired' });
    if (!key.hwid) return res.status(400).json({ error: 'Key has no HWID to reset' });

    const now = new Date();
    if (key.last_hwid_reset_at) {
      const lastReset = new Date(key.last_hwid_reset_at);
      const daysSinceReset = (now - lastReset) / (1000 * 60 * 60 * 24);
      if (daysSinceReset < 30) {
        const daysRemaining = Math.ceil(30 - daysSinceReset);
        return res.status(400).json({
          error: `HWID reset allowed once per 30 days. Wait ${daysRemaining} more days.`,
        });
      }
    }

    await pool.query(
      `UPDATE keys SET hwid = NULL, hwid_reset_count = $1, last_hwid_reset_at = $2, status = 'active'
       WHERE id = $3`,
      [key.hwid_reset_count + 1, now, key.id]
    );
    return res.json({
      success: true,
      message: 'HWID reset successfully',
      reset_count: key.hwid_reset_count + 1,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin: reset HWID (by secret for Discord or admin session) ---
app.post('/api/admin/keys/reset-hwid', async (req, res) => {
  const { key_code: keyCode, secret } = req.body;
  if (!keyCode) return res.status(400).json({ error: 'key_code required' });

  let isAdmin = false;
  if (secret && secret === process.env.DISCORD_API_SECRET) {
    isAdmin = true;
  } else if (req.session?.userId && req.session?.isAdmin) {
    isAdmin = true;
  }
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

  const keyRes = await pool.query('SELECT * FROM keys WHERE key_code = $1', [keyCode]);
  const key = keyRes.rows[0];
  if (!key) return res.status(404).json({ error: 'Key not found' });
  if (key.status === 'blocked') return res.status(400).json({ error: 'Key is blocked' });
  if (key.status === 'expired') return res.status(400).json({ error: 'Key has expired' });
  if (!key.hwid) return res.status(400).json({ error: 'Key has no HWID to reset' });

  const now = new Date();
  await pool.query(
    `UPDATE keys SET hwid = NULL, hwid_reset_count = $1, last_hwid_reset_at = $2, status = 'active'
     WHERE id = $3`,
    [key.hwid_reset_count + 1, now, key.id]
  );
  return res.json({
    success: true,
    message: 'HWID reset successfully',
    reset_count: key.hwid_reset_count + 1,
  });
});

// --- Admin: stats ---
app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const keysRes = await pool.query('SELECT status, price FROM keys');
    const ordersRes = await pool.query(
      "SELECT amount FROM orders WHERE payment_status = 'paid'"
    );
    const keys = keysRes.rows;
    const totalRevenue = ordersRes.rows.reduce((s, r) => s + r.amount, 0);
    return res.json({
      totalKeys: keys.length,
      activeKeys: keys.filter((k) => k.status === 'active').length,
      usedKeys: keys.filter((k) => k.status === 'used').length,
      totalRevenue,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
});

// --- Admin: list keys (paginated, filter) ---
app.get('/api/admin/keys', requireAuth, requireAdmin, async (req, res) => {
  try {
    const status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*) FROM keys';
    let dataQuery = 'SELECT * FROM keys';
    const countParams = status && status !== 'all' ? [status] : [];
    const dataParams = status && status !== 'all'
      ? [status, limit, offset]
      : [limit, offset];
    if (status && status !== 'all') {
      countQuery += ' WHERE status = $1';
      dataQuery += ' WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    } else {
      dataQuery += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    }

    const countRes = await pool.query(countQuery, countParams);
    const total = parseInt(countRes.rows[0].count, 10);
    const dataRes = await pool.query(dataQuery, dataParams);
    return res.json({ keys: dataRes.rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load keys' });
  }
});

// --- Admin: bulk block/delete ---
app.patch('/api/admin/keys/bulk', requireAuth, requireAdmin, async (req, res) => {
  const { keyIds, action } = req.body; // action: 'block' | 'delete'
  if (!Array.isArray(keyIds) || keyIds.length === 0 || !['block', 'delete'].includes(action)) {
    return res.status(400).json({ error: 'keyIds array and action (block|delete) required' });
  }
  try {
    if (action === 'delete') {
      await pool.query('DELETE FROM keys WHERE id = ANY($1::uuid[])', [keyIds]);
    } else {
      await pool.query("UPDATE keys SET status = 'blocked' WHERE id = ANY($1::uuid[])", [keyIds]);
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to update keys' });
  }
});

// --- Admin: generate keys ---
function generateKeyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () =>
    Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  return `${seg()}-${seg()}-${seg()}-${seg()}`;
}

app.post('/api/admin/keys/generate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { product_id: productId, quantity } = req.body;
    if (!productId || quantity < 1 || quantity > 1000) {
      return res.status(400).json({ error: 'Quantity must be between 1 and 1000' });
    }

    const productRes = await pool.query(
      'SELECT id, duration_days, price FROM products WHERE id = $1',
      [productId]
    );
    const product = productRes.rows[0];
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const codes = new Set();
    while (codes.size < quantity) codes.add(generateKeyCode());
    const keysToInsert = Array.from(codes).map((key_code) => ({
      key_code,
      status: 'active',
      duration_days: product.duration_days,
      price: product.price,
      product_id: product.id,
    }));

    const inserted = [];
    for (const k of keysToInsert) {
      const r = await pool.query(
        `INSERT INTO keys (key_code, status, duration_days, price, product_id)
         VALUES ($1, 'active', $2, $3, $4) RETURNING *`,
        [k.key_code, k.duration_days, k.price, k.product_id]
      );
      inserted.push(r.rows[0]);
    }

    return res.json({ success: true, message: `Generated ${quantity} keys`, keys: inserted });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Static (SPA) ---
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
