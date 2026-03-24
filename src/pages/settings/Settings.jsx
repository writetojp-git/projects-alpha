import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  User, Building2, Users, Save, AlertCircle, CheckCircle2,
  Loader2, Shield, Mail, Briefcase, MapPin, ChevronDown
} from 'lucide-react'

const ROLE_CONFIG = {
  owner:           { label: 'Owner',           color: 'bg-purple-100 text-purple-700', desc: 'Full admin — all permissions' },
  program_leader:  { label: 'Program Leader',  color: 'bg-blue-100 text-blue-700',    desc: 'Manage projects, approve intake' },
  project_manager: { label: 'Project Manager', color: 'bg-orange-100 text-orange-700',desc: 'Create and manage projects' },
  team_member:     { label: 'Team Member',     color: 'bg-green-100 text-green-700',  desc: 'Contribute to assigned projects' },
  stakeholder:     { label: 'Stakeholder',     color: 'bg-gray-100 text-gray-700',    desc: 'View projects, submit intake' },
  viewer:          { label: 'Viewer',          color: 'bg-gray-100 text-gray-600',    desc: 'Read-only access' },
}

const PLAN_CONFIG = {
  trial:        { label: 'Trial',        color: 'bg-yellow-100 text-yellow-700' },
  starter:      { label: 'Starter',      color: 'bg-blue-100 text-blue-700' },
  professional: { label: 'Professional', color: 'bg-purple-100 text-purple-700' },
  enterprise:   { label: 'Enterprise',   color: 'bg-green-100 text-green-700' },
}

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.viewer
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
}

function SaveBanner({ message, type }) {
  if (!message) return null
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm mb-4 ${type === 'success' ? 'bg-status-green-bg text-status-green' : 'bg-status-red-bg text-status-red'}`}>
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  )
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab({ profile, userEmail, onSaved }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    title: profile?.title || '',
    department: profile?.department || '',
  })
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState(null)

  const initials = form.full_name
    ? form.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const handleSave = async () => {
    setSaving(true)
    setBanner(null)
    const { error } = await supabase.from('profiles')
      .update({ full_name: form.full_name, title: form.title, department: form.department })
      .eq('id', profile.id)
    setSaving(false)
    if (error) setBanner({ message: error.message, type: 'error' })
    else { setBanner({ message: 'Profile saved successfully.', type: 'success' }); onSaved() }
    setTimeout(() => setBanner(null), 3000)
  }

  return (
    <div className="max-w-lg">
      {banner && <SaveBanner message={banner.message} type={banner.type} />}

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-brand-orange flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-brand-charcoal-dark">{form.full_name || 'Your Name'}</p>
          <p className="text-sm text-brand-charcoal">{userEmail}</p>
          <RoleBadge role={profile?.role} />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label flex items-center gap-1.5"><User size={13} /> Full Name</label>
          <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="input" placeholder="Your full name" />
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><Briefcase size={13} /> Job Title</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="e.g. Black Belt, Operations Manager" />
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><MapPin size={13} /> Department</label>
          <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="input" placeholder="e.g. Operations, Quality, Finance" />
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><Mail size={13} /> Email</label>
          <input value={userEmail} disabled className="input bg-surface-secondary text-brand-charcoal/60 cursor-not-allowed" />
          <p className="text-xs text-brand-charcoal mt-1">Email is managed through your account login.</p>
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><Shield size={13} /> Role</label>
          <div className="input bg-surface-secondary text-brand-charcoal/80 flex items-center gap-2">
            <RoleBadge role={profile?.role} />
            <span className="text-sm">{ROLE_CONFIG[profile?.role]?.desc}</span>
          </div>
          <p className="text-xs text-brand-charcoal mt-1">Role is assigned by your company owner.</p>
        </div>
      </div>

      <div className="mt-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}

// ─── Company Tab ──────────────────────────────────────────────────────────────
function CompanyTab({ profile, isOwner, onSaved }) {
  const [company, setCompany] = useState(null)
  const [memberCount, setMemberCount] = useState(0)
  const [form, setForm] = useState({ name: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    if (!profile?.company_id) return
    Promise.all([
      supabase.from('companies').select('*').eq('id', profile.company_id).single(),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('company_id', profile.company_id),
    ]).then(([compRes, membRes]) => {
      if (compRes.data) { setCompany(compRes.data); setForm({ name: compRes.data.name }) }
      if (membRes.count !== null) setMemberCount(membRes.count)
      setLoading(false)
    })
  }, [profile?.company_id])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('companies').update({ name: form.name }).eq('id', profile.company_id)
    setSaving(false)
    if (error) setBanner({ message: error.message, type: 'error' })
    else { setBanner({ message: 'Company updated.', type: 'success' }); onSaved() }
    setTimeout(() => setBanner(null), 3000)
  }

  if (loading) return <div className="flex items-center gap-2 py-10"><Loader2 size={18} className="animate-spin text-brand-orange" /></div>

  const plan = PLAN_CONFIG[company?.plan] || PLAN_CONFIG.trial

  return (
    <div className="max-w-lg">
      {banner && <SaveBanner message={banner.message} type={banner.type} />}

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-brand-charcoal-dark flex items-center justify-center text-white text-lg font-bold">
          {company?.name?.charAt(0) || 'C'}
        </div>
        <div>
          <p className="font-bold text-brand-charcoal-dark">{company?.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${plan.color}`}>{plan.label}</span>
            <span className="text-xs text-brand-charcoal">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label flex items-center gap-1.5"><Building2 size={13} /> Company Name</label>
          {isOwner ? (
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
          ) : (
            <input value={form.name} disabled className="input bg-surface-secondary text-brand-charcoal/60 cursor-not-allowed" />
          )}
          {!isOwner && <p className="text-xs text-brand-charcoal mt-1">Only the company owner can change this.</p>}
        </div>
        <div>
          <label className="label">Company ID</label>
          <input value={profile?.company_id || ''} disabled className="input bg-surface-secondary text-brand-charcoal/60 text-xs font-mono cursor-not-allowed" />
        </div>
        <div>
          <label className="label">Joined</label>
          <input value={company?.created_at ? new Date(company.created_at).toLocaleDateString() : ''} disabled className="input bg-surface-secondary text-brand-charcoal/60 cursor-not-allowed" />
        </div>
      </div>

      {isOwner && (
        <div className="mt-6">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────
function TeamTab({ profile, isOwner }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [banner, setBanner] = useState(null)

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('full_name')
    setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => { if (profile?.company_id) fetchMembers() }, [profile?.company_id])

  const handleRoleChange = async (memberId, newRole) => {
    setSavingId(memberId)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', memberId)
    setSavingId(null)
    if (error) setBanner({ message: error.message, type: 'error' })
    else { setBanner({ message: 'Role updated.', type: 'success' }); fetchMembers() }
    setTimeout(() => setBanner(null), 3000)
  }

  if (loading) return <div className="flex items-center gap-2 py-10"><Loader2 size={18} className="animate-spin text-brand-orange" /></div>

  return (
    <div>
      {banner && <SaveBanner message={banner.message} type={banner.type} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-brand-charcoal">{members.length} team member{members.length !== 1 ? 's' : ''} in your company</p>
        <div className="flex items-center gap-1.5 text-xs text-brand-charcoal bg-surface-secondary px-3 py-1.5 rounded-lg">
          <Mail size={12} /> Invite by sharing the registration link
        </div>
      </div>

      <div className="overflow-hidden border border-surface-border rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-secondary border-b border-surface-border text-xs font-medium text-brand-charcoal uppercase tracking-wide">
              <th className="text-left px-5 py-3">Member</th>
              <th className="text-left px-5 py-3">Title</th>
              <th className="text-left px-5 py-3">Department</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {members.map(m => {
              const initials = m.full_name ? m.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'
              const isCurrentUser = m.id === profile.id
              const isSaving = savingId === m.id
              return (
                <tr key={m.id} className="hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium text-brand-charcoal-dark">
                          {m.full_name || 'Unnamed User'}
                          {isCurrentUser && <span className="ml-2 text-xs text-brand-charcoal/50">(you)</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-brand-charcoal">{m.title || '—'}</td>
                  <td className="px-5 py-4 text-brand-charcoal">{m.department || '—'}</td>
                  <td className="px-5 py-4">
                    {isOwner && !isCurrentUser ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role}
                          onChange={e => handleRoleChange(m.id, e.target.value)}
                          disabled={isSaving}
                          className="input text-xs py-1 pr-6"
                        >
                          {Object.entries(ROLE_CONFIG).map(([r, c]) => (
                            <option key={r} value={r}>{c.label}</option>
                          ))}
                        </select>
                        {isSaving && <Loader2 size={13} className="animate-spin text-brand-orange" />}
                      </div>
                    ) : (
                      <RoleBadge role={m.role} />
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-brand-charcoal">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {members.length <= 1 && (
        <div className="mt-4 p-4 bg-surface-secondary rounded-xl border border-surface-border text-sm text-brand-charcoal">
          <p className="font-medium text-brand-charcoal-dark mb-1">Invite your team</p>
          <p>Share the app URL with teammates and have them register. They'll automatically join your company and you can assign their roles here.</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')

  const fetchProfile = async () => {
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setUserProfile(data)
    setLoading(false)
  }

  useEffect(() => { fetchProfile() }, [user])

  const isOwner = userProfile?.role === 'owner'

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'company', label: 'Company',    icon: Building2 },
    { id: 'team',    label: 'Team',       icon: Users },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-charcoal-dark">Settings</h1>
        <p className="text-sm text-brand-charcoal mt-1">Manage your profile, company, and team.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-orange" />
        </div>
      ) : (
        <div className="flex gap-8">
          {/* Sidebar nav */}
          <div className="w-44 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${activeTab === t.id ? 'bg-brand-orange/10 text-brand-orange' : 'text-brand-charcoal hover:bg-surface-secondary'}`}
                  >
                    <Icon size={16} />
                    {t.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profile' && (
              <ProfileTab profile={userProfile} userEmail={user?.email} onSaved={fetchProfile} />
            )}
            {activeTab === 'company' && (
              <CompanyTab profile={userProfile} isOwner={isOwner} onSaved={fetchProfile} />
            )}
            {activeTab === 'team' && (
              <TeamTab profile={userProfile} isOwner={isOwner} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
