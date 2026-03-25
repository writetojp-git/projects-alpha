-- Migration 009: AI Conversations for AI Coach feature
-- Stores per-project chat history between users and the AI Coach

CREATE TABLE IF NOT EXISTS ai_conversations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-project history loads
CREATE INDEX IF NOT EXISTS idx_ai_conversations_project
  ON ai_conversations(project_id, created_at);

-- Row Level Security
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own company AI conversations"
  ON ai_conversations FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users insert own company AI conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users delete own AI conversations"
  ON ai_conversations FOR DELETE
  USING (user_id = auth.uid());
