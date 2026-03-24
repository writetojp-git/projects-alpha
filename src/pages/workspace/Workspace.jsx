import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  FolderOpen, ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2, Pencil,
  Loader2, AlertCircle, Calendar, Target, TrendingUp, BarChart3, Clock,
  CheckCircle2, XCircle, AlertTriangle, Shield, Save, X, Check,
  Activity, Eye, Sparkles
} from 'lucide-react'

// ââ Phase config âââââââââââââââââââââââââââââââââââââââââââââ
const DMAIC_PHASES = [
  { key: 'define', label: 'Define', order: 1 },
  { key: 'measure', label: 'Measure', order: 2 },
  { key: 'analyze', label: 'Analyze', order: 3 },
  { key: 'improve', label: 'Improve', order: 4 },
  { key: 'control', label: 'Control', order: 5 },
]

const METRIC_CATEGORIES = [
  'Safety', 'Quality', 'Cost', 'Delivery', 'Customer Service',
  'Employee Satisfaction', 'Productivity', 'Compliance', 'Environmental'
]

const METRIC_STATUS_CONFIG = {
  tracking:  { label: 'Tracking',  color: 'bg-blue-100 text-blue-700',   icon: Activity },
  on_target: { label: 'On Target', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  at_risk:   { label: 'At Risk',   color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  achieved:  { label: 'Achieved',  color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  missed:    { label: 'Missed',    color: 'bg-red-100 text-red-700',     icon: XCircle },
}

const HEALTH_CONFIG = {
  green:  { label: 'On Track',  color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  yellow: { label: 'At Risk',   color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  red:    { label: 'Off Track', color: 'bg-red-100 text-red-700',      icon: XCircle },
}

// ââ Health Badge âââââââââââââââââââââââââââââââââââââââââââââ
function HealthBadge({ health }) {
  const cfg = HEALTH_CONFIG[health] || HEALTH_CONFIG.green
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

// ââ Metric Status Badge ââââââââââââââââââââââââââââââââââââââ
function MetricStatusBadge({ status }) {
  const cfg = METRIC_STATUS_CONFIG[status] || METRIC_STATUS_CONFIG.tracking
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  )
}

// ââ Compute project health from phase/section dates ââââââââââ
function computeHealth(phaseDates, sectionDates) {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const hasOverduePhase = phaseDates.some(pd =>
    ['pending', 'in_progress'].includes(pd.status) && pd.target_end_date && pd.target_end_date < today
  )
  if (hasOverduePhase) return 'red'

  const hasUpcomingPhase = phaseDates.some(pd =>
    ['pending', 'in_progress'].includes(pd.status) && pd.target_end_date && pd.target_end_date < nextWeek
  )
  if (hasUpcomingPhase) return 'yellow'

  const hasOverdueSection = sectionDates.some(sd =>
    ['pending', 'in_progress'].includes(sd.status) && sd.target_date && sd.target_date < today
  )
  if (hasOverdueSection) return 'yellow'

  return 'green'
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// PROJECT LIST VIEW
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ProjectList({ projects, loading, onSelect }) {
  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-orange" /></div>
  }
  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <FolderOpen size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-brand-charcoal font-medium">No active projects yet</p>
        <p className="text-sm text-brand-charcoal mt-1">Convert approved intake requests to create projects</p>
      </div>
    )
  }
  return (
    <div className="grid gap-4">
      {projects.map(p => (
        <button key={p.id} onClick={() => onSelect(p)}
          className="card hover:shadow-md transition-shadow text-left w-full">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-bold text-brand-charcoal-dark truncate">{p.name}</h3>
                <HealthBadge health={p.calculated_health || p.health || 'green'} />
              </div>
              <div className="flex items-center gap-4 text-sm text-brand-charcoal">
                <span className="capitalize">{p.type || 'dmaic'}</span>
                <span className="capitalize">Phase: {p.phase || 'Define'}</span>
                {p.target_date && <span>Target: {new Date(p.target_date).toLocaleDateString()}</span>}
                {p.project_lead && <span>Lead: {p.project_lead.full_name}</span>}
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>
        </button>
      ))}
    </div>
  )
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// IMPROVEMENT METRICS SECTION
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ImprovementMetrics({ projectId, companyId, userProfile }) {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [newMetric, setNewMetric] = useState({
    category: 'Quality', metric_name: '', unit: '%',
    baseline_value: '', target_value: '', actual_value: '', notes: ''
  })

  const loadMetrics = async () => {
    const { data } = await supabase
      .from('improvement_metrics')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
    setMetrics(data || [])
    setLoading(false)
  }

  useEffect(() => { loadMetrics() }, [projectId])

  const handleAdd = async () => {
    if (!newMetric.metric_name.trim()) return
    setSaving(true)
    const maxOrder = metrics.length > 0 ? Math.max(...metrics.map(m => m.sort_order)) : 0
    const baseNum = parseFloat(newMetric.baseline_value)
    const targetNum = parseFloat(newMetric.target_value)
    const actualNum = parseFloat(newMetric.actual_value)
    await supabase.from('improvement_metrics').insert({
      company_id: companyId,
      project_id: projectId,
      category: newMetric.category,
      metric_name: newMetric.metric_name.trim(),
      unit: newMetric.unit.trim() || null,
      baseline_value: newMetric.baseline_value || null,
      baseline_numeric: isNaN(baseNum) ? null : baseNum,
      target_value: newMetric.target_value || null,
      target_numeric: isNaN(targetNum) ? null : targetNum,
      actual_value: newMetric.actual_value || null,
      actual_numeric: isNaN(actualNum) ? null : actualNum,
      notes: newMetric.notes.trim() || null,
      sort_order: maxOrder + 1,
      created_by: userProfile.id,
    })
    setShowAdd(false)
    setNewMetric({ category: 'Quality', metric_name: '', unit: '%', baseline_value: '', target_value: '', actual_value: '', notes: '' })
    setSaving(false)
    loadMetrics()
  }

  const handleUpdate = async (id, updates) => {
    setSaving(true)
    const actualNum = parseFloat(updates.actual_value)
    await supabase.from('improvement_metrics').update({
      ...updates,
      actual_numeric: isNaN(actualNum) ? null : actualNum,
    }).eq('id', id)
    setEditingId(null)
    setSaving(false)
    loadMetrics()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this metric?')) return
    await supabase.from('improvement_metrics').delete().eq('id', id)
    loadMetrics()
  }

  // Group metrics by category
  const grouped = useMemo(() => {
    const groups = {}
    metrics.forEach(m => {
      if (!groups[m.category]) groups[m.category] = []
      groups[m.category].push(m)
    })
    return groups
  }, [metrics])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-orange" />
          <h3 className="font-bold text-brand-charcoal-dark">Improvement Metrics</h3>
          <span className="text-xs bg-gray-100 text-brand-charcoal px-2 py-0.5 rounded-full">{metrics.length}</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
          <Plus size={14} /> Add Metric
        </button>
      </div>

      {showAdd && (
        <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="label text-xs">Category</label>
              <select className="input py-1.5 text-sm" value={newMetric.category}
                onChange={e => setNewMetric(m => ({ ...m, category: e.target.value }))}>
                {METRIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Metric Name</label>
              <input className="input py-1.5 text-sm" placeholder="e.g. Defect Rate"
                value={newMetric.metric_name} onChange={e => setNewMetric(m => ({ ...m, metric_name: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Unit</label>
              <input className="input py-1.5 text-sm" placeholder="%, $, days"
                value={newMetric.unit} onChange={e => setNewMetric(m => ({ ...m, unit: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Baseline</label>
              <input className="input py-1.5 text-sm" placeholder="Current value"
                value={newMetric.baseline_value} onChange={e => setNewMetric(m => ({ ...m, baseline_value: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label text-xs">Target</label>
              <input className="input py-1.5 text-sm" placeholder="Goal value"
                value={newMetric.target_value} onChange={e => setNewMetric(m => ({ ...m, target_value: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Actual (optional)</label>
              <input className="input py-1.5 text-sm" placeholder="Measured result"
                value={newMetric.actual_value} onChange={e => setNewMetric(m => ({ ...m, actual_value: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Notes</label>
              <input className="input py-1.5 text-sm" placeholder="Optional notes"
                value={newMetric.notes} onChange={e => setNewMetric(m => ({ ...m, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-secondary py-1.5 px-3 text-sm">Cancel</button>
            <button onClick={handleAdd} className="btn-primary py-1.5 px-3 text-sm" disabled={saving || !newMetric.metric_name.trim()}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Add Metric'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-orange" /></div>
      ) : metrics.length === 0 ? (
        <div className="text-center py-8 text-brand-charcoal">
          <Target size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm">No improvement metrics yet. Add metrics to track project impact.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-2">{category}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-brand-charcoal border-b border-gray-100">
                      <th className="pb-2 font-medium">Metric</th>
                      <th className="pb-2 font-medium">Unit</th>
                      <th className="pb-2 font-medium">Baseline</th>
                      <th className="pb-2 font-medium">Target</th>
                      <th className="pb-2 font-medium">Actual</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(m => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2 font-medium text-brand-charcoal-dark">{m.metric_name}</td>
                        <td className="py-2 text-brand-charcoal">{m.unit || 'â'}</td>
                        <td className="py-2 text-brand-charcoal">{m.baseline_value || 'â'}</td>
                        <td className="py-2 text-brand-charcoal">{m.target_value || 'â'}</td>
                        <td className="py-2">
                          {editingId === m.id ? (
                            <input className="input py-1 text-sm w-24" defaultValue={m.actual_value || ''}
                              onBlur={e => handleUpdate(m.id, { actual_value: e.target.value })}
                              onKeyDown={e => { if (e.key === 'Enter') handleUpdate(m.id, { actual_value: e.target.value }) }}
                              autoFocus />
                          ) : (
                            <span className="cursor-pointer hover:text-brand-orange" onClick={() => setEditingId(m.id)}>
                              {m.actual_value || <span className="text-gray-400 italic">click to enter</span>}
                            </span>
                          )}
                        </td>
                        <td className="py-2"><MetricStatusBadge status={m.status} /></td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            <select className="text-xs bg-transparent border-0 p-0 cursor-pointer text-brand-charcoal"
                              value={m.status} onChange={e => handleUpdate(m.id, { status: e.target.value })}>
                              {Object.entries(METRIC_STATUS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                            <button onClick={() => handleDelete(m.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// PHASE DATES SECTION
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function PhaseDatesManager({ projectId, projectType, onHealthChange }) {
  const [phaseDates, setPhaseDates] = useState([])
  const [sectionDates, setSectionDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedPhase, setExpandedPhase] = useState(null)
  const [saving, setSaving] = useState(false)

  const phases = DMAIC_PHASES // Could vary by project type later

  const loadDates = async () => {
    const [{ data: pd }, { data: sd }] = await Promise.all([
      supabase.from('project_phase_dates').select('*').eq('project_id', projectId).order('phase_order'),
      supabase.from('project_section_dates').select('*').eq('project_id', projectId),
    ])
    setPhaseDates(pd || [])
    setSectionDates(sd || [])
    setLoading(false)

    // Compute and report health
    const health = computeHealth(pd || [], sd || [])
    onHealthChange(health)
  }

  useEffect(() => { loadDates() }, [projectId])

  // Initialize phase dates if none exist
  const initializePhases = async () => {
    setSaving(true)
    const rows = phases.map(p => ({
      project_id: projectId,
      phase_name: p.key,
      phase_order: p.order,
      status: 'pending',
    }))
    await supabase.from('project_phase_dates').insert(rows)
    setSaving(false)
    loadDates()
  }

  const updatePhaseDate = async (id, field, value) => {
    await supabase.from('project_phase_dates').update({ [field]: value || null }).eq('id', id)
    loadDates()
  }

  const updatePhaseStatus = async (id, status) => {
    await supabase.from('project_phase_dates').update({ status }).eq('id', id)
    loadDates()
  }

  const addSectionDate = async (phaseName) => {
    const name = prompt('Section name:')
    if (!name?.trim()) return
    await supabase.from('project_section_dates').insert({
      project_id: projectId,
      phase_name: phaseName,
      section_name: name.trim(),
      status: 'pending',
    })
    loadDates()
  }

  const updateSectionDate = async (id, field, value) => {
    await supabase.from('project_section_dates').update({ [field]: value || null }).eq('id', id)
    loadDates()
  }

  const deleteSectionDate = async (id) => {
    await supabase.from('project_section_dates').delete().eq('id', id)
    loadDates()
  }

  const today = new Date().toISOString().split('T')[0]

  if (loading) {
    return <div className="card"><div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-orange" /></div></div>
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-brand-orange" />
          <h3 className="font-bold text-brand-charcoal-dark">Phase Timeline</h3>
        </div>
        {phaseDates.length === 0 && (
          <button onClick={initializePhases} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Initialize Phases</>}
          </button>
        )}
      </div>

      {phaseDates.length === 0 ? (
        <div className="text-center py-8 text-brand-charcoal">
          <Calendar size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm">Click "Initialize Phases" to                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="label text-xs">Target Start</label>
                        <input type="date" className="input py-1.5 text-sm" value={pd.target_start_date || ''}
                          onChange={e => updatePhaseDate(pd.id, 'target_start_date', e.target.value)} />
                      </div>
                      <div>
                        <label className="label text-xs">Target End</label>
                        <input type="date" className="input py-1.5 text-sm" value={pd.target_end_date || ''}
                          onChange={e => updatePhaseDate(pd.id, 'target_end_date', e.target.value)} />
                      </div>
                      <div>
                        <label className="label text-xs">Actual Start</label>
                        <input type="date" className="input py-1.5 text-sm" value={pd.actual_start_date || ''}
                          onChange={e => updatePhaseDate(pd.id, 'actual_start_date', e.target.value)} />
                      </div>
                      <div>
                        <label className="label text-xs">Actual End</label>
                        <input type="date" className="input py-1.5 text-sm" value={pd.actual_end_date || ''}
                          onChange={e => updatePhaseDate(pd.id, 'actual_end_date', e.target.value)} />
                      </div>
                    </div>

                    {/* Section dates within phase */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-brand-charcoal">Sections</span>
                        <button onClick={() => addSectionDate(pd.phase_name)}
                          className="text-xs text-brand-orange hover:underline flex items-center gap-1">
                          <Plus size={12} /> Add Section
                        </button>
                      </div>
                      {sections.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No sections defined</p>
                      ) : (
                        <div className="space-y-1.5">
                          {sections.map(s => {
                            const sOverdue = ['pending', 'in_progress'].includes(s.status) && s.target_date && s.target_date < today
                            return (
                              <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${sOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <span className="flex-1 font-medium text-brand-charcoal-dark">{s.section_name}</span>
                                <input type="date" className="input py-1 text-xs w-36" value={s.target_date || ''}
                                  onChange={e => updateSectionDate(s.id, 'target_date', e.target.value)} />
                                <select className="text-xs bg-white border border-gray-200 rounded px-1.5 py-1" value={s.status}
                                  onChange={e => updateSectionDate(s.id, 'status', e.target.value)}>
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                                {sOverdue && <AlertTriangle size={12} className="text-red-500" />}
                                <button onClick={() => deleteSectionDate(s.id)} className="p-1 text-gray-400 hover:text-red-500">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// PROJECT BENEFITS DISPLAY
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ProjectBenefits({ projectId }) {
  const [benefits, setBenefits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('project_benefits')
      .select('*')
      .or(`project_id.eq.${projectId},intake_id.in.(select intake_id from projects where id = '${projectId}')`)
      .then(({ data }) => { setBenefits(data || []); setLoading(false) })
  }, [projectId])

  // Also try loading via the intake_id on the project
  useEffect(() => {
    const loadFromIntake = async () => {
      const { data: proj } = await supabase.from('projects').select('intake_id').eq('id', projectId).single()
      if (proj?.intake_id) {
        const { data } = await supabase.from('project_benefits').select('*').eq('intake_id', proj.intake_id)
        if (data?.length) setBenefits(prev => {
          const existingIds = new Set(prev.map(b => b.id))
          return [...prev, ...data.filter(b => !existingIds.has(b.id))]
        })
      }
    }
    loadFromIntake()
  }, [projectId])

  if (loading) return null
  if (benefits.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={18} className="text-brand-orange" />
        <h3 className="font-bold text-brand-charcoal-dark">Estimated Benefits</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {benefits.map(b => (
          <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-brand-charcoal-dark">{b.category_name}</span>
            <span className="text-sm font-bold text-brand-orange">{b.estimated_value || 'â'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// PROJECT DETAIL VIEW
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ProjectDetail({ project, userProfile, onBack }) {
  const [health, setHealth] = useState(project.health || 'green')

  // Update project health in DB when computed health changes
  const handleHealthChange = async (newHealth) => {
    setHealth(newHealth)
    if (newHealth !== project.health) {
      await supabase.from('projects').update({ health: newHealth }).eq('id', project.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-brand-charcoal" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-charcoal-dark">{project.name}</h1>
            <HealthBadge health={health} />
          </div>
          <div className="flex items-center gap-4 text-sm text-brand-charcoal mt-1">
            <span className="capitalize">{project.type || 'DMAIC'}</span>
            <span className="capitalize">Phase: {project.phase || 'Define'}</span>
            <span>Status: {project.status}</span>
            {project.project_lead && <span>Lead: {project.project_lead.full_name}</span>}
          </div>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="card">
          <h3 className="font-bold text-brand-charcoal-dark mb-2">Project Description</h3>
          <p className="text-sm text-brand-charcoal">{project.description}</p>
        </div>
      )}

      {/* Benefits from intake */}
      <ProjectBenefits projectId={project.id} />

      {/* Phase Timeline */}
      <PhaseDatesManager
        projectId={project.id}
        projectType={project.type}
        onHealthChange={handleHealthChange}
      />

      {/* Improvement Metrics */}
      <ImprovementMetrics
        projectId={project.id}
        companyId={userProfile.company_id}
        userProfile={userProfile}
      />
    </div>
  )
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// MAIN WORKSPACE PAGE
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function Workspace() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  useEffect(() => {
    if (!userProfile) return
    const loadProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*, project_lead:profiles!projects_project_lead_id_fkey(id, full_name)')
        .eq('company_id', userProfile.company_id)
        .in('status', ['active', 'on_hold'])
        .order('created_at', { ascending: false })
      setProjects(data || [])
      setLoading(false)
    }
    loadProjects()
  }, [userProfile])

  if (!userProfile) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-orange" /></div>
  }

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} userProfile={userProfile} onBack={() => setSelectedProject(null)} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-charcoal-dark">Workspace</h1>
        <p className="text-brand-charcoal text-sm mt-1">Select a project to manage phases, metrics, and track progress</p>
      </div>
      <ProjectList projects={projects} loading={loading} onSelect={setSelectedProject} />
    </div>
  )
}
