-- King Vypers - Railway PostgreSQL Schema
-- Run this in Railway PostgreSQL (Dashboard > Data > Query or psql)

-- Users (replaces Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_days integer NOT NULL,
  price integer NOT NULL,
  stock_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Keys
CREATE TABLE IF NOT EXISTS keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  duration_days integer NOT NULL,
  price integer NOT NULL,
  hwid text,
  hwid_reset_count integer DEFAULT 0,
  last_hwid_reset_at timestamptz,
  user_id uuid REFERENCES users(id),
  user_name text,
  product_id uuid REFERENCES products(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  activated_at timestamptz,
  CONSTRAINT valid_key_status CHECK (status IN ('active', 'used', 'blocked', 'expired'))
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  key_id uuid REFERENCES keys(id),
  amount integer NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_id text,
  qris_url text,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired'))
);

-- Sessions (for express-session with connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);
CREATE INDEX IF NOT EXISTS idx_keys_user_id ON keys(user_id);
CREATE INDEX IF NOT EXISTS idx_keys_product_id ON keys(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Trigger: update product stock_count when keys change
CREATE OR REPLACE FUNCTION update_product_stock_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE products
    SET stock_count = (
      SELECT COUNT(*)::integer
      FROM keys
      WHERE keys.product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND keys.status = 'active'
    )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE products
    SET stock_count = (
      SELECT COUNT(*)::integer
      FROM keys
      WHERE keys.product_id = OLD.product_id
      AND keys.status = 'active'
    )
    WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock ON keys;
CREATE TRIGGER trigger_update_stock
  AFTER INSERT OR UPDATE OR DELETE ON keys
  FOR EACH ROW
  EXECUTE PROCEDURE update_product_stock_count();

-- Seed products (run once; skip if table already has data)
INSERT INTO products (name, description, duration_days, price, stock_count)
VALUES
  ('King Vypers 30 Days', 'Support All Device', 30, 20000, 0),
  ('King Vypers 60 Days', 'Support All Device', 60, 40000, 0),
  ('King Vypers 90 Days', 'Support All Device', 90, 60000, 0),
  ('King Vypers 120 Days', 'Support All Device', 120, 80000, 0),
  ('King Vypers 150 Days', 'Support All Device', 150, 100000, 0),
  ('King Vypers 180 Days', 'Support All Device', 180, 120000, 0),
  ('King Vypers 210 Days', 'Support All Device', 210, 140000, 0),
  ('King Vypers 240 Days', 'Support All Device', 240, 160000, 0),
  ('King Vypers 270 Days', 'Support All Device', 270, 180000, 0),
  ('King Vypers 300 Days', 'Support All Device', 300, 200000, 0),
  ('King Vypers 330 Days', 'Support All Device', 330, 220000, 0),
  ('King Vypers 360 Days', 'Support All Device', 360, 240000, 0);
