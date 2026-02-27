-- Add quantity to orders (default 1 for existing rows)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
