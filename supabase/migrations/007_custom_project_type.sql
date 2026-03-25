-- ============================================================
-- Projects Alpha — Migration 007
-- Custom Project Type + Action Items on Sections
-- Run in Supabase SQL Editor
-- ============================================================

-- ── ADD 'custom' to project type constraints ──────────────────

-- projects table
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_type_check
  CHECK (type IN ('dmaic', 'dmadv', 'kaizen', 'lean', 'general', 'custom'));

-- intake_requests table
ALTER TABLE intake_requests DROP CONSTRAINT IF EXISTS intake_requests_project_type_check;
ALTER TABLE intake_requests ADD CONSTRAINT intake_requests_project_type_check
  CHECK (project_type IN ('dmaic', 'dmadv', 'kaizen', 'lean', 'general', 'custom'));

-- custom_templates table (if constrained)
ALTER TABLE custom_templates DROP CONSTRAINT IF EXISTS custom_templates_project_type_check;
ALTER TABLE custom_templates ADD CONSTRAINT custom_templates_project_type_check
  CHECK (project_type IN ('dmaic', 'dmadv', 'kaizen', 'lean', 'general', 'custom'));

-- ── ADD action_items to project_section_dates ─────────────────
-- Stored as JSONB array: [{id, text, done, sort_order}]
ALTER TABLE project_section_dates
  ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]'::jsonb;

-- ── ADD is_custom flag to project_phase_dates ─────────────────
-- Allows custom phase names to be renamed/deleted freely
ALTER TABLE project_phase_dates
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;

ALTER TABLE project_section_dates
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
