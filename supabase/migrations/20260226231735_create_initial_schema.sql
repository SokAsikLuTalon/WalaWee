/*
  # King Vypers Premium Key Store - Initial Schema

  ## Overview
  Creates the core database structure for the key store including products, keys, and orders management.

  ## New Tables
  
  ### `products`
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Product name (e.g., "King Vypers 30 Days")
  - `description` (text) - Product description/features
  - `duration_days` (integer) - Key validity duration
  - `price` (integer) - Price in IDR
  - `stock_count` (integer) - Available keys count (calculated)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `keys`
  - `id` (uuid, primary key) - Unique identifier
  - `key_code` (text, unique) - Format: XXXX-XXXX-XXXX-XXXX
  - `status` (text) - active/used/blocked/expired
  - `duration_days` (integer) - Validity duration
  - `price` (integer) - Key price in IDR
  - `hwid` (text, nullable) - Hardware ID binding
  - `hwid_reset_count` (integer) - Number of HWID resets
  - `last_hwid_reset_at` (timestamptz, nullable) - Last reset timestamp
  - `user_id` (uuid, nullable) - FK to auth.users
  - `user_name` (text, nullable) - User display name
  - `product_id` (uuid, nullable) - FK to products
  - `created_at` (timestamptz) - Creation timestamp
  - `expires_at` (timestamptz, nullable) - Expiration timestamp
  - `activated_at` (timestamptz, nullable) - Activation timestamp

  ### `orders`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - FK to auth.users
  - `product_id` (uuid) - FK to products
  - `key_id` (uuid, nullable) - FK to keys (assigned after payment)
  - `amount` (integer) - Order amount in IDR
  - `payment_status` (text) - pending/paid/failed/expired
  - `payment_id` (text, nullable) - TemanQRIS payment ID
  - `qris_url` (text, nullable) - Payment QRIS image URL
  - `created_at` (timestamptz) - Creation timestamp
  - `paid_at` (timestamptz, nullable) - Payment completion timestamp

  ### `user_profiles`
  - `id` (uuid, primary key) - FK to auth.users
  - `display_name` (text) - User display name
  - `is_admin` (boolean) - Admin flag
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can read their own orders and keys
  - Admins have full access (checked via user_profiles.is_admin)
  - Products are publicly readable
*/

-- Create products table
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

-- Create keys table
CREATE TABLE IF NOT EXISTS keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  duration_days integer NOT NULL,
  price integer NOT NULL,
  hwid text,
  hwid_reset_count integer DEFAULT 0,
  last_hwid_reset_at timestamptz,
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  product_id uuid REFERENCES products(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  activated_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('active', 'used', 'blocked', 'expired'))
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
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

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);
CREATE INDEX IF NOT EXISTS idx_keys_user_id ON keys(user_id);
CREATE INDEX IF NOT EXISTS idx_keys_product_id ON keys(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Products policies (public read, admin write)
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Keys policies (users see own keys, admins see all)
CREATE POLICY "Users can view own keys"
  ON keys FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert keys"
  ON keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update keys"
  ON keys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete keys"
  ON keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Orders policies (users see own orders, admins see all)
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- User profiles policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  ));

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert default products
INSERT INTO products (name, description, duration_days, price, stock_count)
VALUES
  ('King Vypers 30 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 30, 20000, 0),
  ('King Vypers 60 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 60, 40000, 0),
  ('King Vypers 90 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 90, 60000, 0),
  ('King Vypers 120 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 120, 80000, 0),
  ('King Vypers 150 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 150, 100000, 0),
  ('King Vypers 180 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 180, 120000, 0),
  ('King Vypers 210 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 210, 140000, 0),
  ('King Vypers 240 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 240, 160000, 0),
  ('King Vypers 270 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 270, 180000, 0),
  ('King Vypers 300 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 300, 200000, 0),
  ('King Vypers 330 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 330, 220000, 0),
  ('King Vypers 360 Days', 'Support All Device • 1 Key / 1 Device • Support Reset HWID', 360, 240000, 0)
ON CONFLICT DO NOTHING;

-- Function to update stock count
CREATE OR REPLACE FUNCTION update_product_stock_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE products
    SET stock_count = (
      SELECT COUNT(*)
      FROM keys
      WHERE keys.product_id = NEW.product_id
      AND keys.status = 'active'
    )
    WHERE id = NEW.product_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE products
    SET stock_count = (
      SELECT COUNT(*)
      FROM keys
      WHERE keys.product_id = OLD.product_id
      AND keys.status = 'active'
    )
    WHERE id = OLD.product_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stock count
DROP TRIGGER IF EXISTS trigger_update_stock ON keys;
CREATE TRIGGER trigger_update_stock
  AFTER INSERT OR UPDATE OR DELETE ON keys
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_count();