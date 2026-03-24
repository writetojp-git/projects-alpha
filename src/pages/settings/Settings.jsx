import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Settings as SettingsIcon, Plus, Pencil, Trash2, X, Check,
  Loader2, AlertCircle, GripVertical, ToggleLeft, ToggleRight
} from 'lucide-react'

const UNIT_TYPES = [
  { value: 'currency', label: 'Currency ($)' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'number', label: 'Number' },
  { value: 'days', label: 'Days' },
  { value: 'text', label: 'Free Text' },
]

function BenefitCategoryManager({ userProfile }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', description: '', unit_type: 'currency', icon: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadCategories = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('benefit_categories')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .order('sort_order')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { loadCategories() }, [userProfile.company_id])

  const handleAdd = async () => {
    if (!newForm.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0
      const { error: err } = await supabase.from('benefit_categories').insert({
        company_id: userProfile.company_id,
        name: newForm.name.trim(),
        description: newForm.description.trim() || null,
        unit_type: newForm.unit_type,
        icon: newForm.icon.trim() || null,
        sort_order: maxOrder + 1,
        created_by: userProfile.id,
      })
      if (err) throw err
      setShowAdd(false)
      setNewForm({ name: '', description: '', unit_type: 'currency', icon: '' })
      loadCategories()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id) => {
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('benefit_categories')
        .update({
          name: editForm.name?.trim(),
          description: editForm.description?.trim() || null,
          unit_type: editForm.unit_type,
        })
        .eq('id', id)
      if (err) throw err
      setEditingId(null)
      loadCategories()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (cat) => {
    await supabase
      .from('benefit_categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id)
    loadCategories()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this benefit category? Existing project benefits will retain their data.')) return
    await supabase.from('benefit_categories').delete().eq('id', id)
    loadCategories()
  }

  const isAdmin = ['owner', 'program_leader'].includes(userProfile.role)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-brand-charcoal-dark">Benefit Categories</h3>
          <p className="text-sm text-brand-charcoal mt-0.5">
            Configure the benefit types available when submitting project requests
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3">
            <Plus size={14} /> Add Category
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {showAdd && (
        <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Name</label>
              <input className="input py-2 text-sm" placeholder="e.g. Environmental Impact" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Unit Type</label>
              <select className="input py-2 text-sm" value={newForm.unit_type} onChange={e => setNewForm(f => ({ ...f, unit_type: e.target.value }))}>
                {UNIT_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label text-xs">Description</label>
            <input className="input py-2 text-sm" placeholder="Brief description of this benefit type" value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-secondary py-1.5 px-3 text-sm">Cancel</button>
            <button onClick={handleAdd} className="btn-primary py-1.5 px-3 text-sm" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-orange" /></div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8 text-brand-charcoal">No benefit categories configured yet.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {categories.map(cat => (
            <div key={cat.id} className={`flex items-center gap-3 py-3 px-2 ${!cat.is_active ? 'opacity-50' : ''}`}>
              <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
              {editingId === cat.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input className="input py-1.5 text-sm flex-1" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  <select className="input py-1.5 text-sm w-36" value={editForm.unit_type} onChange={e => setEditForm(f => ({ ...f, unit_type: e.target.value }))}>
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
                    {cat.description && <p className="text-xs text-brand-charcoal mt-0.5 truncate">{cat.description}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleActive(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title={cat.is_active ? 'Deactivate' : 'Activate'}>
                        {cat.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-gray-400" />}
                      </button>
                      <button onClick={() => { setEditingId(cat.id); setEditForm({ name: cat.name, description: cat.description || '', unit_type: cat.unit_type }) }} className="p-1.5 text-brand-charcoal hover:text-brand-charcoal-dark hover:bg-gray-100 rounded-lg transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
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

export default function Settings() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('benefits')

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => { setUserProfile(data); setLoading(false) })
  }, [user])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-orange" /></div>
  }

  const sections = [
    { id: 'benefits', label: 'Benefit Categories' },
    { id: 'general', label: 'General' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-charcoal-dark">Settings</h1>
        <p className="text-brand-charcoal text-sm mt-1">Manage your organization's configuration</p>
      </div>

      <div className="flex gap-2">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeSection === s.id ? 'bg-brand-orange text-white' : 'bg-gray-100 text-brand-charcoal hover:bg-gray-200'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'benefits' && userProfile && <BenefitCategoryManager userProfile={userProfile} />}

      {activeSection === 'general' && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-orange/10 rounded-full flex items-center justify-center">
              <SettingsIcon size={18} className="text-brand-orange" />
            </div>
            <div>
              <h3 className="font-bold text-brand-charcoal-dark">General Settings</h3>
              <p className="text-sm text-brand-charcoal">Company profile and preferences coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
