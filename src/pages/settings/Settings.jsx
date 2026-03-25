import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { SYSTEM_ROLES, isAdmin, roleLabel, roleBadge } from '../../lib/roles'
import {
  Settings as SettingsIcon, Plus, Pencil, Trash2, X, Check,
  Loader2, AlertCircle, ToggleLeft, ToggleRight, MapPin, Users,
  User, Building2, Tag, ChevronDown, Shield, Mail, Phone,
  Globe, Clock, CheckCircle2, XCircle
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────
const UNIT_TYPES = [
  { value: 'currency',    label: 'Currency ($)' },
  { value: 'percentage',  label: 'Percentage (%)' },
  { value: 'number',      label: 'Number' },
  { value: 'days',        label: 'Days' },
  { value: 'text',        label: 'Free Text' },
]

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo',
]

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="font-bold text-brand-charcoal-dark">{title}</h3>
        {description && <p className="text-sm text-brand-charcoal mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
      <AlertCircle size={15} className="flex-shrink-0" /> {msg}
    </div>
  )
}

// ── MY PROFILE ────────────────────────────────────────────────
function MyProfile({ userProfile, onUpdated, sites }) {
  const [form, setForm] = useState({
    full_name:  userProfile.full_name  || '',
    title:      userProfile.title      || '',
    department: userProfile.department || '',
    site_id:    userProfile.site_id    || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    const { error: err } = await supabase.from('profiles').update({
      full_name:  form.full_name.trim()  || null,
      title:      form.title.trim()      || null,
      department: form.department.trim() || null,
      site_id:    form.site_id           || null,
    }).eq('id', userProfile.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    onUpdated()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="card max-w-2xl">
      <SectionHeader title="My Profile" description="Update your personal information" />
      <ErrorBanner msg={error} />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Job Title</label>
            <input className="input" placeholder="e.g. Operations Manager" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Department</label>
            <input className="input" placeholder="e.g. Manufacturing" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
          </div>
          <div>
            <label className="label">Home Site / Location</label>
            <select className="input" value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
              <option value="">— No site assigned —</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
            </select>
          </div>
        </div>

        {/* Role display (read-only) */}
        <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-3">
          <Shield size={16} className="text-brand-charcoal flex-shrink-0" />
          <div>
            <p className="text-xs text-brand-charcoal font-medium">Your Role</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadge(userProfile.role)}`}>
              {roleLabel(userProfile.role)}
            </span>
          </div>
          <p className="text-xs text-brand-charcoal ml-auto">Contact your admin to change your role</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-2 py-2 px-5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SITES & LOCATIONS ─────────────────────────────────────────
function SitesManager({ userProfile }) {
  const [sites,    setSites]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [editingId,setEditingId]= useState(null)
  const [form,     setForm]     = useState({ name: '', code: '', city: '', state: '', country: 'US', timezone: 'America/Denver' })
  const [editForm, setEditForm] = useState({})
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('sites').select('*')
      .eq('company_id', userProfile.company_id).order('name')
    setSites(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [userProfile.company_id])

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('Site name is required.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('sites').insert({
      company_id: userProfile.company_id,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country || 'US',
      timezone: form.timezone || 'America/Denver',
      created_by: userProfile.id,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowAdd(false)
    setForm({ name: '', code: '', city: '', state: '', country: 'US', timezone: 'America/Denver' })
    load()
  }

  const handleUpdate = async (id) => {
    setSaving(true); setError('')
    const { error: err } = await supabase.from('sites').update({
      name:     editForm.name?.trim(),
      code:     editForm.code?.trim().toUpperCase() || null,
      city:     editForm.city?.trim() || null,
      state:    editForm.state?.trim() || null,
      country:  editForm.country || 'US',
      timezone: editForm.timezone || 'America/Denver',
    }).eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setEditingId(null)
    load()
  }

  const toggleActive = async (site) => {
    await supabase.from('sites').update({ is_active: !site.is_active }).eq('id', site.id)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this site? Projects and users assigned here will become unassigned.')) return
    await supabase.from('sites').delete().eq('id', id)
    load()
  }

  const canEdit = isAdmin(userProfile.role)

  const SiteForm = ({ vals, onChange, onSave, onCancel }) => (
    <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-4 space-y-3 mb-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label text-xs">Site Name *</label>
          <input className="input py-2 text-sm" placeholder="e.g. Denver HQ, Chicago Plant" value={vals.name} onChange={e => onChange({ ...vals, name: e.target.value })} />
        </div>
        <div>
          <label className="label text-xs">Code</label>
          <input className="input py-2 text-sm uppercase" placeholder="DEN" maxLength={6} value={vals.code} onChange={e => onChange({ ...vals, code: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label text-xs">City</label>
          <input className="input py-2 text-sm" placeholder="Denver" value={vals.city} onChange={e => onChange({ ...vals, city: e.target.value })} />
        </div>
        <div>
          <label className="label text-xs">State / Province</label>
          <input className="input py-2 text-sm" placeholder="CO" value={vals.state} onChange={e => onChange({ ...vals, state: e.target.value })} />
        </div>
        <div>
          <label className="label text-xs">Country</label>
          <input className="input py-2 text-sm" placeholder="US" value={vals.country} onChange={e => onChange({ ...vals, country: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label text-xs">Timezone</label>
        <select className="input py-2 text-sm" value={vals.timezone} onChange={e => onChange({ ...vals, timezone: e.target.value })}>
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary py-1.5 px-3 text-sm">Cancel</button>
        <button onClick={onSave} className="btn-primary py-1.5 px-3 text-sm" disabled={saving}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="card">
      <SectionHeader
        title="Sites & Locations"
        description="Define the physical locations or business units in your organization. Projects and users can be assigned to a site."
        action={canEdit && (
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3">
            <Plus size={14} /> Add Site
          </button>
        )}
      />
      <ErrorBanner msg={error} />

      {showAdd && <SiteForm vals={form} onChange={setForm} onSave={handleAdd} onCancel={() => setShowAdd(false)} />}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-brand-orange" /></div>
      ) : sites.length === 0 ? (
        <div className="text-center py-12">
          <MapPin size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-brand-charcoal-dark mb-1">No sites configured yet</p>
          <p className="text-sm text-brand-charcoal">Add your first location to filter projects and metrics by site.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sites.map(site => (
            <div key={site.id}>
              {editingId === site.id ? (
                <div className="py-3">
                  <SiteForm vals={editForm} onChange={setEditForm}
                    onSave={() => handleUpdate(site.id)} onCancel={() => setEditingId(null)} />
                </div>
              ) : (
                <div className={`flex items-center gap-4 py-3.5 px-2 ${!site.is_active ? 'opacity-50' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-brand-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-brand-charcoal-dark">{site.name}</span>
                      {site.code && (
                        <span className="text-xs bg-gray-100 text-brand-charcoal px-2 py-0.5 rounded-full font-mono">{site.code}</span>
                      )}
                      {!site.is_active && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-brand-charcoal mt-0.5">
                      {(site.city || site.state) && (
                        <span className="flex items-center gap-1">
                          <Globe size={11} /> {[site.city, site.state, site.country].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {site.timezone && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {site.timezone}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleActive(site)} title={site.is_active ? 'Deactivate' : 'Activate'}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        {site.is_active
                          ? <ToggleRight size={18} className="text-green-500" />
                          : <ToggleLeft size={18} className="text-gray-400" />}
                      </button>
                      <button onClick={() => { setEditingId(site.id); setEditForm({ name: site.name, code: site.code || '', city: site.city || '', state: site.state || '', country: site.country || 'US', timezone: site.timezone || 'America/Denver' }) }}
                        className="p-1.5 text-brand-charcoal hover:bg-gray-100 rounded-lg transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(site.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── USER MANAGEMENT ───────────────────────────────────────────
function UserManager({ userProfile, sites }) {
  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm,  setEditForm]  = useState({})
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [filter,    setFilter]    = useState('all')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*')
      .eq('company_id', userProfile.company_id).order('full_name')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [userProfile.company_id])

  const handleUpdate = async (id) => {
    setSaving(true); setError('')
    const { error: err } = await supabase.from('profiles').update({
      role:    editForm.role    || 'team_member',
      site_id: editForm.site_id || null,
      title:   editForm.title?.trim() || null,
      department: editForm.department?.trim() || null,
    }).eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setEditingId(null)
    load()
  }

  const toggleActive = async (u) => {
    if (u.id === userProfile.id) { setError("You can't deactivate your own account."); return }
    await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id)
    load()
  }

  const roleOptions = SYSTEM_ROLES.filter(r => !r.value.startsWith('super'))

  const filtered = users.filter(u => {
    if (filter === 'active')   return u.is_active !== false
    if (filter === 'inactive') return u.is_active === false
    if (filter === 'admin')    return isAdmin(u.role)
    return true
  })

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]))

  return (
    <div className="card">
      <SectionHeader
        title="User Management"
        description="Manage team members, roles, and site assignments for your organization."
        action={
          <div className="flex items-center gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="input py-1.5 text-sm w-36">
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        }
      />
      <ErrorBanner msg={error} />

      {/* Invite note */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-5 text-sm text-blue-700">
        <Mail size={15} className="flex-shrink-0 mt-0.5" />
        <span>
          To add new users, have them sign up at the app URL and log in — they'll appear here automatically. You can then assign their role and site.
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-brand-orange" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <Users size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-brand-charcoal">No users found</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map(u => (
            <div key={u.id}>
              {editingId === u.id ? (
                <div className="py-4 bg-brand-orange/3 rounded-xl px-3 mb-2">
                  <p className="font-semibold text-brand-charcoal-dark mb-3">{u.full_name || u.email}</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="label text-xs">Role</label>
                      <select className="input py-2 text-sm" value={editForm.role}
                        onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                        {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Site / Location</label>
                      <select className="input py-2 text-sm" value={editForm.site_id || ''}
                        onChange={e => setEditForm(f => ({ ...f, site_id: e.target.value || null }))}>
                        <option value="">— No site —</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Job Title</label>
                      <input className="input py-2 text-sm" value={editForm.title || ''}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label text-xs">Department</label>
                      <input className="input py-2 text-sm" value={editForm.department || ''}
                        onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(u.id)} className="btn-primary py-1.5 px-4 text-sm" disabled={saving}>
                      {saving ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary py-1.5 px-3 text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className={`flex items-center gap-4 py-3 px-2 ${u.is_active === false ? 'opacity-50' : ''}`}>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0 text-brand-orange font-bold text-sm">
                    {(u.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-brand-charcoal-dark text-sm">{u.full_name || '(no name)'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge(u.role)}`}>{roleLabel(u.role)}</span>
                      {u.id === userProfile.id && (
                        <span className="text-xs bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full">You</span>
                      )}
                      {u.is_active === false && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-brand-charcoal mt-0.5 flex-wrap">
                      {u.title && <span>{u.title}</span>}
                      {u.department && <span className="text-gray-300">·</span>}
                      {u.department && <span>{u.department}</span>}
                      {u.site_id && siteMap[u.site_id] && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="flex items-center gap-1">
                            <MapPin size={10} /> {siteMap[u.site_id].name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Actions — only admins can edit others, everyone can edit themselves */}
                  {(isAdmin(userProfile.role) || u.id === userProfile.id) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isAdmin(userProfile.role) && u.id !== userProfile.id && (
                        <button onClick={() => toggleActive(u)}
                          title={u.is_active !== false ? 'Deactivate' : 'Activate'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                          {u.is_active !== false
                            ? <ToggleRight size={18} className="text-green-500" />
                            : <ToggleLeft size={18} className="text-gray-400" />}
                        </button>
                      )}
                      <button onClick={() => {
                        setEditingId(u.id)
                        setEditForm({ role: u.role, site_id: u.site_id || '', title: u.title || '', department: u.department || '' })
                      }} className="p-1.5 text-brand-charcoal hover:bg-gray-100 rounded-lg transition-colors">
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── BENEFIT CATEGORIES (existing, unchanged logic) ────────────
function BenefitCategoryManager({ userProfile }) {
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [editingId,  setEditingId]  = useState(null)
  const [editForm,   setEditForm]   = useState({})
  const [showAdd,    setShowAdd]    = useState(false)
  const [newForm,    setNewForm]    = useState({ name: '', description: '', unit_type: 'currency' })
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('benefit_categories').select('*')
      .eq('company_id', userProfile.company_id).order('sort_order')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [userProfile.company_id])

  const handleAdd = async () => {
    if (!newForm.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    const maxOrder = categories.length ? Math.max(...categories.map(c => c.sort_order)) : 0
    const { error: err } = await supabase.from('benefit_categories').insert({
      company_id: userProfile.company_id,
      name: newForm.name.trim(),
      description: newForm.description.trim() || null,
      unit_type: newForm.unit_type,
      sort_order: maxOrder + 1,
      created_by: userProfile.id,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowAdd(false)
    setNewForm({ name: '', description: '', unit_type: 'currency' })
    load()
  }

  const handleUpdate = async (id) => {
    setSaving(true); setError('')
    const { error: err } = await supabase.from('benefit_categories').update({
      name: editForm.name?.trim(),
      description: editForm.description?.trim() || null,
      unit_type: editForm.unit_type,
    }).eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setEditingId(null)
    load()
  }

  const canEdit = isAdmin(userProfile.role) || ['champion', 'program_leader'].includes(userProfile.role)

  return (
    <div className="card">
      <SectionHeader
        title="Benefit Categories"
        description="Configure benefit types available when submitting project requests"
        action={canEdit && (
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3">
            <Plus size={14} /> Add Category
          </button>
        )}
      />
      <ErrorBanner msg={error} />

      {showAdd && (
        <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Name</label>
              <input className="input py-2 text-sm" placeholder="e.g. Environmental Impact"
                value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Unit Type</label>
              <select className="input py-2 text-sm" value={newForm.unit_type}
                onChange={e => setNewForm(f => ({ ...f, unit_type: e.target.value }))}>
                {UNIT_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label text-xs">Description</label>
            <input className="input py-2 text-sm" placeholder="Brief description"
              value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-secondary py-1.5 px-3 text-sm">Cancel</button>
            <button onClick={handleAdd} className="btn-primary py-1.5 px-3 text-sm" disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-orange" /></div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8 text-brand-charcoal text-sm">No benefit categories yet.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {categories.map(cat => (
            <div key={cat.id} className={`flex items-center gap-3 py-3 px-2 ${!cat.is_active ? 'opacity-50' : ''}`}>
              {editingId === cat.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input className="input py-1.5 text-sm flex-1" value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  <select className="input py-1.5 text-sm w-36" value={editForm.unit_type}
                    onChange={e => setEditForm(f => ({ ...f, unit_type: e.target.value }))}>
                    {UNIT_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                  <button onClick={() => handleUpdate(cat.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check size={14} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-brand-charcoal-dark text-sm">{cat.name}</span>
                      <span className="text-xs bg-gray-100 text-brand-charcoal px-2 py-0.5 rounded-full">
                        {UNIT_TYPES.find(u => u.value === cat.unit_type)?.label || cat.unit_type}
                      </span>
                    </div>
                    {cat.description && <p className="text-xs text-brand-charcoal mt-0.5">{cat.description}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { supabase.from('benefit_categories').update({ is_active: !cat.is_active }).eq('id', cat.id).then(load) }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        {cat.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-gray-400" />}
                      </button>
                      <button onClick={() => { setEditingId(cat.id); setEditForm({ name: cat.name, description: cat.description || '', unit_type: cat.unit_type }) }}
                        className="p-1.5 text-brand-charcoal hover:bg-gray-100 rounded-lg"><Pencil size={13} /></button>
                      <button onClick={() => { if (confirm('Delete?')) supabase.from('benefit_categories').delete().eq('id', cat.id).then(load) }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MAIN SETTINGS PAGE ────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [sites,       setSites]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState('profile')

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setUserProfile(data)
  }

  const loadSites = async (companyId) => {
    const { data } = await supabase.from('sites').select('*')
      .eq('company_id', companyId).eq('is_active', true).order('name')
    setSites(data || [])
  }

  useEffect(() => {
    if (!user) return
    loadProfile().then(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (userProfile?.company_id) loadSites(userProfile.company_id)
  }, [userProfile?.company_id])

  if (loading || !userProfile) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-orange" /></div>
  }

  const tabs = [
    { id: 'profile',  label: 'My Profile',     icon: User },
    { id: 'sites',    label: 'Sites',           icon: MapPin },
    { id: 'users',    label: 'Users',           icon: Users,   adminOnly: true },
    { id: 'benefits', label: 'Benefit Types',   icon: Tag },
  ].filter(t => !t.adminOnly || isAdmin(userProfile.role) || ['champion', 'program_leader'].includes(userProfile.role))

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-charcoal-dark">Settings</h1>
        <p className="text-brand-charcoal text-sm mt-1">Manage your profile, team, sites, and organization configuration</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-white text-brand-charcoal-dark shadow-sm' : 'text-brand-charcoal hover:text-brand-charcoal-dark'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <MyProfile userProfile={userProfile} onUpdated={loadProfile} sites={sites} />
      )}

      {activeTab === 'sites' && (
        <SitesManager userProfile={userProfile} />
      )}

      {activeTab === 'users' && (
        <UserManager userProfile={userProfile} sites={sites} />
      )}

      {activeTab === 'benefits' && (
        <BenefitCategoryManager userProfile={userProfile} />
      )}
    </div>
  )
}
