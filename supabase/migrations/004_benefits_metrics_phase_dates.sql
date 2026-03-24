-- ============================================================
-- Migration 004: Benefits, Improvement Metrics & Phase Dates
-- ============================================================
-- Adds:
--   1. benefit_categories â admin-configurable list of benefit types
--   2. project_benefits â multi-benefit entries per intake request & project
--   3. improvement_metrics â per-project metrics tracking (Category + Metric + Estimate)
--   4. project_phase_dates â target & actual dates per phase per project
--   5. project_section_dates â target dates per section within a phase
-- ============================================================

-- ============================================================
-- 1. BENEFIT CATEGORIES (admin-configurable)
-- ============================================================
CREATE TABLE benefit_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,                          -- optional icon name for UI
  unit_type TEXT DEFAULT 'currency'   -- currency, percentage, number, text, days
    CHECK (unit_type IN ('currency', 'percentage', 'number', 'text', 'days')),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

ALTER TABLE benefit_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company benefit categories" ON benefit_categories
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Admins manage benefit categories" ON benefit_categories
  FOR ALL USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader')
  );

-- Allow PMs to also insert (for initial seeding)
CREATE POLICY "PMs can insert benefit categories" ON benefit_categories
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON benefit_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. PROJECT BENEFITS (replaces single estimated_savings)
-- ============================================================
-- Used at intake time AND on active projects
CREATE TABLE project_benefits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES intake_requests(id) ON DELETE CASCADE,
  category_id UUID REFERENCES benefit_categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,        -- denormalized for display even if category deleted
  estimated_value TEXT,               -- flexible: "$50,000", "99%", "5 days"
  estimated_numeric NUMERIC(14,2),    -- parsed numeric for aggregation (nullable)
  actual_value TEXT,                   -- filled during/after project
  actual_numeric NUMERIC(14,2),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company project benefits" ON project_benefits
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Users manage company project benefits" ON project_benefits
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users update company project benefits" ON project_benefits
  FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "Users delete company project benefits" ON project_benefits
  FOR DELETE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON project_benefits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_benefits_project ON project_benefits(project_id);
CREATE INDEX idx_benefits_intake ON project_benefits(intake_id);
CREATE INDEX idx_benefits_company ON project_benefits(company_id);

-- ============================================================
-- 3. IMPROVEMENT METRICS (per-project tracking grid)
-- ============================================================
CREATE TABLE improvement_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,             -- Safety, Quality, Cost, Customer Service, etc.
  metric_name TEXT NOT NULL,          -- e.g. "Defect Rate", "Cycle Time"
  unit TEXT,                          -- %, $, days, count, etc.
  baseline_value TEXT,                -- current state value
  baseline_numeric NUMERIC(14,2),
  target_value TEXT,                  -- goal value
  target_numeric NUMERIC(14,2),
  actual_value TEXT,                  -- measured result
  actual_numeric NUMERIC(14,2),
  status TEXT DEFAULT 'tracking'
    CHECK (status IN ('tracking', 'on_target', 'at_risk', 'achieved', 'missed')),
  notes TEXT,
  ai_suggested BOOLEAN DEFAULT FALSE, -- flag if AI proposed this metric
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE improvement_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company metrics" ON improvement_metrics
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Users manage company metrics" ON improvement_metrics
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users update company metrics" ON improvement_metrics
  FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "Users delete company metrics" ON improvement_metrics
  FOR DELETE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON improvement_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_metrics_project ON improvement_metrics(project_id);
CREATE INDEX idx_metrics_company ON improvement_metrics(company_id);
CREATE INDEX idx_metrics_category ON improvement_metrics(category);

-- ============================================================
-- 4. PROJECT PHASE DATES (target + actual dates per phase)
-- ============================================================
CREATE TABLE project_phase_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,           -- e.g. 'Define', 'Measure', etc.
  phase_order INTEGER DEFAULT 0,
  target_start_date DATE,
  target_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'skipped')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, phase_name)
);

ALTER TABLE project_phase_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see project phase dates" ON project_phase_dates
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
  );

CREATE POLICY "Users manage phase dates" ON project_phase_dates
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON project_phase_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_phase_dates_project ON project_phase_dates(project_id);

-- ============================================================
-- 5. PROJECT SECTION DATES (target dates per section within a phase)
-- ============================================================
CREATE TABLE project_section_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  section_name TEXT NOT NULL,
  target_date DATE,
  actual_date DATE,
  assigned_to UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, phase_name, section_name)
);

ALTER TABLE project_section_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see section dates" ON project_section_dates
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
  );

CREATE POLICY "Users manage section dates" ON project_section_dates
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON project_section_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_section_dates_project ON project_section_dates(project_id);

-- ============================================================
-- SEED DEFAULT BENEFIT CATEGORIES
-- ============================================================
-- These will be inserted per-company via the app on first use.
-- Here we provide a helper function the app can call:

CREATE OR REPLACE FUNCTION seed_default_benefit_categories(p_company_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO benefit_categories (company_id, name, description, unit_type, icon, sort_order, created_by)
  VALUES
    (p_company_id, 'Cost Savings',            'Direct cost reduction or avoidance',           'currency',   'DollarSign',    1, p_user_id),
    (p_company_id, 'Quality Improvement',      'Defect reduction, accuracy gains',             'percentage', 'CheckCircle',   2, p_user_id),
    (p_company_id, 'On-Time Delivery',         'Improved delivery or cycle time performance',  'percentage', 'Clock',         3, p_user_id),
    (p_company_id, 'Safety',                   'Workplace safety improvements',                'number',     'Shield',        4, p_user_id),
    (p_company_id, 'Customer Satisfaction',     'Net promoter, CSAT, or complaint reduction',   'percentage', 'Heart',         5, p_user_id),
    (p_company_id, 'Employee Satisfaction',     'Engagement, retention, or morale gains',       'percentage', 'Users',         6, p_user_id),
    (p_company_id, 'Productivity',             'Throughput, efficiency, or output gains',       'percentage', 'TrendingUp',    7, p_user_id),
    (p_company_id, 'Compliance',               'Regulatory or policy compliance improvement',  'percentage', 'FileCheck',     8, p_user_id),
    (p_company_id, 'Cycle Time Reduction',     'Faster process turnaround',                    'days',       'Timer',         9, p_user_id),
    (p_company_id, 'Revenue Growth',           'New revenue or market expansion',              'currency',   'BarChart3',    10, p_user_id)
  ON CONFLICT (company_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- HELPER VIEW: project health based on phase dates
-- ============================================================
CREATE OR REPLACE VIEW project_health_status AS
SELECT
  p.id AS project_id,
  p.name,
  p.status,
  p.health AS manual_health,
  CASE
    WHEN p.status IN ('completed', 'cancelled') THEN p.health
    WHEN EXISTS (
      SELECT 1 FROM project_phase_dates pd
      WHERE pd.project_id = p.id
        AND pd.status IN ('pending', 'in_progress')
        AND pd.target_end_date < CURRENT_DATE
    ) THEN 'red'
    WHEN EXISTS (
      SELECT 1 FROM project_phase_dates pd
      WHERE pd.project_id = p.id
        AND pd.status IN ('pending', 'in_progress')
        AND pd.target_end_date < (CURRENT_DATE + INTERVAL '7 days')
    ) THEN 'yellow'
    WHEN EXISTS (
      SELECT 1 FROM project_section_dates sd
      WHERE sd.project_id = p.id
        AND sd.status IN ('pending', 'in_progress')
        AND sd.target_date < CURRENT_DATE
    ) THEN 'yellow'
    ELSE COALESCE(p.health, 'green')
  END AS calculated_health,
  (SELECT COUNT(*) FROM project_phase_dates pd
    WHERE pd.project_id = p.id
      AND pd.status IN ('pending', 'in_progress')
      AND pd.target_end_date < CURRENT_DATE
  ) AS overdue_phases,
  (SELECT COUNT(*) FROM project_section_dates sd
    WHERE sd.project_id = p.id
      AND sd.status IN ('pending', 'in_progress')
      AND sd.target_date < CURRENT_DATE
  ) AS overdue_sections
FROM projects p;
