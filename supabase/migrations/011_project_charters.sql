-- ============================================================
-- Migration 011: Project Charters table
-- ============================================================

CREATE TABLE IF NOT EXISTS project_charters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  problem_statement TEXT,
  goal_statement TEXT,
  scope_in TEXT,
  scope_out TEXT,
  business_case TEXT,
  success_metrics JSONB DEFAULT '[]',
  milestones JSONB DEFAULT '[]',
  team_assignments JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE project_charters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company charters" ON project_charters
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Users can create charter" ON project_charters
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update charter" ON project_charters
  FOR UPDATE USING (company_id = get_my_company_id());

-- Auto-update updated_at trigger
CREATE TRIGGER set_charter_updated_at
  BEFORE UPDATE ON project_charters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for fast project lookups
CREATE INDEX IF NOT EXISTS idx_charters_project ON project_charters(project_id);
CREATE INDEX IF NOT EXISTS idx_charters_company ON project_charters(company_id);
