-- ─── Migration 014: Task Documents & Task Enhancements ───────────────────────

-- Add template_section and order_index to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS template_section TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Ensure completed_at and due_date exist (may already be there)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;

-- ─── Storage bucket for task documents ────────────────────────────────────────
-- Creates the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-documents',
  'task-documents',
  false,
  52428800, -- 50 MB per file
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png','image/jpeg','image/gif','image/webp','text/plain','text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task-documents bucket
CREATE POLICY "task_doc_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-documents' AND auth.role() = 'authenticated'
  );

CREATE POLICY "task_doc_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-documents' AND auth.role() = 'authenticated'
  );

CREATE POLICY "task_doc_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-documents' AND auth.role() = 'authenticated'
  );

-- ─── Task Documents table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  file_path    TEXT NOT NULL,  -- Supabase Storage path
  file_size    BIGINT,
  mime_type    TEXT,
  uploaded_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE task_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_documents_select" ON task_documents
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "task_documents_insert" ON task_documents
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "task_documents_delete" ON task_documents
  FOR DELETE USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_documents_task_id    ON task_documents(task_id);
CREATE INDEX IF NOT EXISTS idx_task_documents_project_id ON task_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_task_documents_company_id ON task_documents(company_id);

-- Full-text search index on projects (for repository search)
CREATE INDEX IF NOT EXISTS idx_projects_fts ON projects
  USING gin(to_tsvector('english',
    coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(department, '')
  ));

-- Index for tasks ordering within a project
CREATE INDEX IF NOT EXISTS idx_tasks_project_order ON tasks(project_id, order_index ASC);
