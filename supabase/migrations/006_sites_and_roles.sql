-- ============================================================
-- Projects Alpha — Migration 006
-- Sites / Locations + Updated Role System
-- Run in Supabase SQL Editor
-- ============================================================

-- ── SITES TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT,          -- short code e.g. "DEN", "ATL", "HQ"
  city        TEXT,
  state       TEXT,
  country     TEXT DEFAULT 'US',
  timezone    TEXT DEFAULT 'America/Denver',
  is_active   BOOLEAN DEFAULT TRUE,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company sites" ON sites
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Admins can insert sites" ON sites
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'client_admin', 'super_admin', 'program_leader')
  );

CREATE POLICY "Admins can update sites" ON sites
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'client_admin', 'super_admin', 'program_leader')
  );

CREATE POLICY "Admins can delete sites" ON sites
  FOR DELETE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'client_admin', 'super_admin')
  );

CREATE INDEX IF NOT EXISTS idx_sites_company ON sites(company_id);

CREATE TRIGGER set_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ADD site_id TO KEY TABLES ─────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

ALTER TABLE intake_requests
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_site  ON profiles(site_id);
CREATE INDEX IF NOT EXISTS idx_projects_site  ON projects(site_id);
CREATE INDEX IF NOT EXISTS idx_intake_site    ON intake_requests(site_id);

-- ── UPDATED ROLE CONSTRAINT ───────────────────────────────────
-- Expand to include new roles while keeping old ones for backward compat
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
  -- New roles (aligned with old doc + modern SaaS)
  'super_admin',    -- LSSE platform staff, cross-company access
  'client_admin',   -- Company admin: full access + user management
  'champion',       -- Approve/reject intake, templates, project charters
  'project_leader', -- Create & manage projects, assign tasks
  'mentor',         -- Guide teams (same project access as project_leader)
  'team_member',    -- Submit intake, update assigned tasks
  'viewer',         -- Read-only + submit intake
  -- Legacy roles (keep for backward compat)
  'owner', 'program_leader', 'project_manager', 'stakeholder'
));

-- ── UPDATED PROJECT MEMBERS ROLE CONSTRAINT ───────────────────
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
ALTER TABLE project_members ADD CONSTRAINT project_members_role_check CHECK (role IN (
  'sponsor',
  'process_owner',
  'project_leader',
  'mentor',
  'team_member',
  'stakeholder',
  -- legacy
  'lead', 'co_lead'
));

-- ── UPDATE get_my_role() HELPER (add new admin roles) ────────
-- The helper already works — it just reads the role column.
-- No change needed to the function itself.

-- ── UPDATE RLS POLICIES to include new admin roles ───────────

-- Companies: client_admin can update their company
DROP POLICY IF EXISTS "Owners can update company" ON companies;
CREATE POLICY "Admins can update company" ON companies
  FOR UPDATE USING (
    id = get_my_company_id()
    AND get_my_role() IN ('owner', 'client_admin', 'super_admin')
  );

-- Profiles: admins can update any profile in their company (for user management)
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (
    id = auth.uid()
    OR (company_id = get_my_company_id() AND get_my_role() IN ('owner', 'client_admin', 'super_admin'))
  );

-- ── BENEFIT CATEGORIES: add missing policies if needed ───────
-- (benefit_categories was added in migration 004; ensure policies allow new admin roles)
-- Safely add policies that might not exist yet
DO $$
BEGIN
  -- Check if the policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'benefit_categories' AND policyname = 'Admins can insert categories'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admins can insert categories" ON benefit_categories
        FOR INSERT WITH CHECK (
          company_id = get_my_company_id()
          AND get_my_role() IN ('owner', 'client_admin', 'super_admin', 'program_leader', 'champion')
        )
    $pol$;
  END IF;
END
$$;
