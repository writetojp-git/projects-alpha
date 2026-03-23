-- ============================================================
-- Projects Alpha — Phase 1.5: Company Goals & Custom Templates
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── COMPANY GOALS (savings targets & project count targets) ──
CREATE TABLE IF NOT EXISTS company_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('savings_goal', 'project_count_goal')),
  department TEXT,           -- NULL = company-wide, otherwise per-department
  target_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year, type, department)
);

ALTER TABLE company_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company goals" ON company_goals
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Leaders can insert goals" ON company_goals
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader')
  );

CREATE POLICY "Leaders can update goals" ON company_goals
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader')
  );

CREATE POLICY "Owners can delete goals" ON company_goals
  FOR DELETE USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'owner'
  );

CREATE INDEX IF NOT EXISTS idx_goals_company ON company_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_goals_year ON company_goals(year);

CREATE TRIGGER set_goals_updated_at BEFORE UPDATE ON company_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── CUSTOM TEMPLATES (user-created project templates) ────────
CREATE TABLE IF NOT EXISTS custom_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Custom',
  project_type TEXT DEFAULT 'general' CHECK (project_type IN ('dmaic', 'dmadv', 'kaizen', 'lean', 'general')),
  phases JSONB NOT NULL DEFAULT '[]',   -- [{name: "Phase 1", sections: ["Step A", "Step B"]}]
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custom_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company templates" ON custom_templates
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "PMs can insert templates" ON custom_templates
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE POLICY "PMs can update templates" ON custom_templates
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE POLICY "PMs can delete templates" ON custom_templates
  FOR DELETE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE INDEX IF NOT EXISTS idx_templates_company ON custom_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON custom_templates(project_type);

CREATE TRIGGER set_templates_updated_at BEFORE UPDATE ON custom_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── TEMPLATE OVERRIDES (customizations to system templates) ──
CREATE TABLE IF NOT EXISTS template_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,            -- matches hardcoded template id (e.g. 'dmaic-full')
  phases JSONB NOT NULL DEFAULT '[]',   -- overridden phases array
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, template_id)
);

ALTER TABLE template_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company overrides" ON template_overrides
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "PMs can insert overrides" ON template_overrides
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE POLICY "PMs can update overrides" ON template_overrides
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE INDEX IF NOT EXISTS idx_overrides_company ON template_overrides(company_id);

CREATE TRIGGER set_overrides_updated_at BEFORE UPDATE ON template_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── UPDATE TASKS TABLE: Remove hardcoded phase constraint ────
-- The old constraint only allowed DMAIC phases. Now phases are dynamic.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_phase_check;
-- (phase is now a free-text field matching the project's template phases)

-- ── UPDATE PROJECTS TABLE: Remove hardcoded phase constraint ─
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_phase_check;
-- (phase is now a free-text field matching the project's template phases)
