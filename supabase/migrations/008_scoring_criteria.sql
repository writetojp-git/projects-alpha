-- ============================================================
-- Projects Alpha — Migration 008
-- Scoring Criteria (configurable per company)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS scoring_criteria (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  low_label   TEXT DEFAULT 'Low',
  high_label  TEXT DEFAULT 'High',
  max_score   INTEGER DEFAULT 5 CHECK (max_score BETWEEN 1 AND 10),
  sort_order  INTEGER DEFAULT 0,
  is_default  BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, key)
);

ALTER TABLE scoring_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members see criteria" ON scoring_criteria
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Admins insert criteria" ON scoring_criteria
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'client_admin', 'owner', 'champion', 'program_leader')
  );

CREATE POLICY "Admins update criteria" ON scoring_criteria
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'client_admin', 'owner', 'champion', 'program_leader')
  );

CREATE POLICY "Admins delete custom criteria" ON scoring_criteria
  FOR DELETE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'client_admin', 'owner', 'champion', 'program_leader')
    AND is_default = FALSE
  );

CREATE INDEX IF NOT EXISTS idx_scoring_criteria_company ON scoring_criteria(company_id);
