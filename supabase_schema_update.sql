-- Add createdAt column to products table if it doesn't exist
-- This is required for the new Statistics feature (Initial Stock Cost)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Optional: Set a default date for existing products so they don't have null values
UPDATE products SET "createdAt" = CURRENT_DATE::TEXT WHERE "createdAt" IS NULL;

-- Add purchaseOrderId column to expenses table if it doesn't exist
-- This is required to cleanup related expenses when a Purchase Order is deleted
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;
