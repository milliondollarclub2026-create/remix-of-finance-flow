
-- Add extra profile fields to counterparties
ALTER TABLE public.counterparties
  ADD COLUMN IF NOT EXISTS legal_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tax_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS comment text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_employee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE';
