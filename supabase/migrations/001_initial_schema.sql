-- ============================================================
-- Projects Alpha — Phase 1 Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COMPANIES (multi-tenant root)
-- ============================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'professional', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'team_member' CHECK (role IN (
    'owner', 'program_leader', 'project_manager', 'team_member', 'stakeholder', 'viewer'
  )),
  title TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'dmaic' CHECK (type IN ('dmaic', 'dmadv', 'kaizen', 'lean', 'general')),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'on_hold', 'completed', 'cancelled')),
  health TEXT DEFAULT 'green' CHECK (health IN ('green', 'yellow', 'red')),
  phase TEXT DEFAULT 'define' CHECK (phase IN ('define', 'measure', 'analyze', 'improve', 'control', 'closed')),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  project_lead_id UUID REFERENCES profiles(id),
  sponsor_id UUID REFERENCES profiles(id),
  start_date DATE,
  target_date DATE,
  completed_date DATE,
  estimated_savings NUMERIC(12,2),
  actual_savings NUMERIC(12,2),
  tags TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECT TEAM MEMBERS
-- ============================================================
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'team_member' CHECK (role IN ('lead', 'co_lead', 'team_member', 'sponsor', 'stakeholder')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, profile_id)
);

-- ============================================================
-- INTAKE QUEUE (project requests)
-- ============================================================
CREATE TABLE intake_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  business_case TEXT,
  expected_benefit TEXT,
  estimated_savings NUMERIC(12,2),
  priority_score INTEGER DEFAULT 0,
  department TEXT,
  requested_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'under_review', 'approved', 'rejected', 'on_hold', 'converted'
  )),
  project_type TEXT DEFAULT 'dmaic' CHECK (project_type IN ('dmaic', 'dmadv', 'kaizen', 'lean', 'general')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  converted_project_id UUID REFERENCES projects(id),
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEMPLATES
-- ============================================================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = global template
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'dmaic' CHECK (type IN ('dmaic', 'dmadv', 'kaizen', 'lean', 'general')),
  category TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  structure JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY FEED
-- ============================================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES intake_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- COMPANIES: users can only see their own company
CREATE POLICY "Users see own company" ON companies
  FOR SELECT USING (id = get_my_company_id());

CREATE POLICY "Owners can update company" ON companies
  FOR UPDATE USING (id = get_my_company_id() AND get_my_role() = 'owner');

-- PROFILES: users see all profiles in their company
CREATE POLICY "Users see company profiles" ON profiles
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- PROJECTS: company-scoped access
CREATE POLICY "Users see company projects" ON projects
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "PMs and above can create projects" ON projects
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

CREATE POLICY "PMs and above can update projects" ON projects
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

-- PROJECT MEMBERS: company-scoped
CREATE POLICY "Users see project members in company" ON project_members
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
  );

-- INTAKE: company-scoped
CREATE POLICY "Users see company intake" ON intake_requests
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Any user can submit intake" ON intake_requests
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Reviewers can update intake" ON intake_requests
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('owner', 'program_leader', 'project_manager')
  );

-- TEMPLATES: global or company-scoped
CREATE POLICY "Users see global and company templates" ON templates
  FOR SELECT USING (is_global = TRUE OR company_id = get_my_company_id());

-- ACTIVITY LOGS: company-scoped
CREATE POLICY "Users see company activity" ON activity_logs
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "System can insert activity" ON activity_logs
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON intake_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'owner'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_lead ON projects(project_lead_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_intake_company ON intake_requests(company_id);
CREATE INDEX idx_intake_status ON intake_requests(status);
CREATE INDEX idx_activity_company ON activity_logs(company_id);
CREATE INDEX idx_activity_project ON activity_logs(project_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);

