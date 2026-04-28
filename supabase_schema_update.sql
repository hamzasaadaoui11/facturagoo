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

-- 4. Options de Gestion de Personnel
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "dailyRate" NUMERIC DEFAULT 0,
    "monthlySalary" NUMERIC DEFAULT 0,
    "paymentType" TEXT DEFAULT 'Monthly',
    "joinDate" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.attendances (
    id TEXT PRIMARY KEY,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "employeeId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.salary_payments (
    id TEXT PRIMARY KEY,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "employeeId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "amount" NUMERIC NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "status" TEXT DEFAULT 'Paid',
    "reference" TEXT,
    "type" TEXT DEFAULT 'Salary',
    "note" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: if you already created the salary_payments table without "type" or "note", run these lines:
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'Salary';
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS "note" TEXT;
