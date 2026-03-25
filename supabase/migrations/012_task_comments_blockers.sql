-- ============================================================
-- Migration 012: Task Comments + Task Blockers
-- ============================================================

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company task comments" ON task_comments
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Users can post task comments" ON task_comments
  FOR INSERT WITH CHECK (company_id = get_my_company_id() AND user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_company ON task_comments(company_id);

-- Task Blockers
CREATE TABLE IF NOT EXISTS task_blockers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved')),
  escalated_to UUID REFERENCES profiles(id),
  escalated_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE task_blockers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company task blockers" ON task_blockers
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Users can log task blockers" ON task_blockers
  FOR INSERT WITH CHECK (company_id = get_my_company_id() AND reported_by = auth.uid());

CREATE POLICY "Users can update task blockers" ON task_blockers
  FOR UPDATE USING (company_id = get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_task_blockers_task ON task_blockers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_blockers_company ON task_blockers(company_id);
CREATE INDEX IF NOT EXISTS idx_task_blockers_project ON task_blockers(project_id);
