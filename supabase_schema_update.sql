-- SQL Commands to update the database for Product Variants support.
-- IMPORTANT: Run these in your Supabase SQL Editor.

-- 1. Updates for 'products' table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "hasVariants" BOOLEAN DEFAULT FALSE;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "variants" JSONB DEFAULT '[]'::jsonb;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "description" TEXT;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "productType" TEXT DEFAULT 'Produit';

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "unitOfMeasure" TEXT DEFAULT 'Unité';

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "minStockAlert" NUMERIC DEFAULT 5;

-- 2. Updates for 'stock_movements' table
-- This is required to track stock changes for specific variants
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS "variantId" TEXT;

-- 3. Maintenance: Ensure indexes for performance (Optional but recommended)
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements("variantId");
CREATE INDEX IF NOT EXISTS idx_products_has_variants ON products("hasVariants");
