// ── System-level roles (login / access) ──────────────────────
export const SYSTEM_ROLES = [
  {
    value: 'client_admin',
    label: 'Client Admin',
    badge: 'bg-purple-100 text-purple-700',
    description: 'Full access + user & site management',
  },
  {
    value: 'champion',
    label: 'Champion',
    badge: 'bg-blue-100 text-blue-700',
    description: 'Approve intake, create templates & charters, manage projects',
  },
  {
    value: 'project_leader',
    label: 'Project Leader',
    badge: 'bg-brand-orange/10 text-brand-orange',
    description: 'Create & manage projects, assign tasks to team',
  },
  {
    value: 'mentor',
    label: 'Mentor / Coach',
    badge: 'bg-teal-100 text-teal-700',
    description: 'Guide project teams — same project access as Project Leader',
  },
  {
    value: 'team_member',
    label: 'Team Member',
    badge: 'bg-gray-100 text-gray-700',
    description: 'Submit intake requests, update assigned tasks',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    badge: 'bg-gray-100 text-gray-500',
    description: 'Read-only access across all modules',
  },
  // Legacy — kept for backward compat, shown as remapped labels
  { value: 'owner',           label: 'Client Admin (legacy)',   badge: 'bg-purple-100 text-purple-700', description: '' },
  { value: 'program_leader',  label: 'Champion (legacy)',       badge: 'bg-blue-100 text-blue-700',     description: '' },
  { value: 'project_manager', label: 'Project Leader (legacy)', badge: 'bg-orange-100 text-orange-700', description: '' },
  { value: 'stakeholder',     label: 'Stakeholder',             badge: 'bg-gray-100 text-gray-500',     description: '' },
]

// ── Project-level roles (within a project's team) ────────────
export const PROJECT_ROLES = [
  { value: 'sponsor',        label: 'Sponsor' },
  { value: 'process_owner',  label: 'Process Owner' },
  { value: 'project_leader', label: 'Project Leader' },
  { value: 'mentor',         label: 'Mentor / Coach' },
  { value: 'team_member',    label: 'Core Team Member' },
  { value: 'stakeholder',    label: 'Stakeholder' },
]

// ── Permission helpers ────────────────────────────────────────

/** Can manage users and sites */
export const isAdmin = (role) =>
  ['super_admin', 'client_admin', 'owner'].includes(role)

/** Can approve/reject intake and manage project charters */
export const canApproveIntake = (role) =>
  ['super_admin', 'client_admin', 'owner', 'champion', 'program_leader'].includes(role)

/** Can create and manage projects */
export const canManageProjects = (role) =>
  ['super_admin', 'client_admin', 'owner', 'champion', 'project_leader',
   'mentor', 'program_leader', 'project_manager'].includes(role)

/** Can create and edit templates */
export const canManageTemplates = (role) =>
  ['super_admin', 'client_admin', 'owner', 'champion', 'project_leader',
   'mentor', 'program_leader', 'project_manager'].includes(role)

/** Human-readable display name for a role */
export const roleLabel = (role) =>
  SYSTEM_ROLES.find(r => r.value === role)?.label || role

/** Badge classes for a role */
export const roleBadge = (role) =>
  SYSTEM_ROLES.find(r => r.value === role)?.badge || 'bg-gray-100 text-gray-600'
