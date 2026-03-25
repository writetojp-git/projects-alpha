-- ============================================================
-- Migration 010: Company onboarding columns + self-serve signup policies
-- ============================================================

-- Add new columns to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Denver',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled'));

-- Allow any authenticated user to create a company (self-serve signup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can create company'
  ) THEN
    CREATE POLICY "Users can create company" ON companies
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Allow company owner to update their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Owner can update company'
  ) THEN
    CREATE POLICY "Owner can update company" ON companies
      FOR UPDATE USING (id = get_my_company_id() AND get_my_role() = 'owner');
  END IF;
END $$;
