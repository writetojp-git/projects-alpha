-- Migration 005: Section Steps & Documents
-- Adds steps column to project_section_dates and section_documents table

ALTER TABLE project_section_dates
  ADD COLUMN IF NOT EXISTS steps TEXT;

CREATE TABLE IF NOT EXISTS section_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    section_date_id UUID REFERENCES project_section_dates(id) ON DELETE CASCADE,
    phase_name      TEXT NOT NULL,
    section_name    TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    file_size       INTEGER,
    file_type       TEXT,
    uploaded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
  );

ALTER TABLE section_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see section documents" ON section_documents
  FOR SELECT USING (
      project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
    );

CREATE POLICY "Users insert section documents" ON section_documents
  FOR INSERT WITH CHECK (
      project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
    );

CREATE POLICY "Users delete own section documents" ON section_documents
  FOR DELETE USING (
      project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
      AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
    );

CREATE INDEX IF NOT EXISTS idx_section_docs_project ON section_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_section_docs_section ON section_documents(section_date_id);
