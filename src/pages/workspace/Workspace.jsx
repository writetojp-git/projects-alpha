import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  FolderOpen, ChevronDown, ChevronRight, Plus, Trash2, Pencil,
  Loader2, AlertCircle, Calendar, Target, TrendingUp, BarChart3, Clock,
  CheckCircle2, XCircle, AlertTriangle, Save, X, Check,
  Activity, FileText, Upload, File, Download, Paperclip, RefreshCw
} from 'lucide-react'

// ── Template Phases per project type ─────────────────────────
const TEMPLATE_PHASES = {
  dmaic: [
    {
      name: 'Define', order: 1, sections: [
        'Project Charter', 'Problem Statement', 'Goal Statement',
        'SIPOC Diagram', 'Voice of Customer (VOC)', 'Project Scope',
        'Business Case', 'Team & Stakeholders', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Measure', order: 2, sections: [
        'Data Collection Plan', 'Process Map (Detailed)',
        'Measurement System Analysis (MSA/Gage R&R)',
        'Baseline Performance (Cpk, Sigma Level)',
        'Process Capability Study', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Analyze', order: 3, sections: [
        'Fishbone / Ishikawa Diagram', '5-Why Analysis',
        'Hypothesis Testing', 'Root Cause Validation',
        'Pareto Analysis', 'Regression / ANOVA', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Improve', order: 4, sections: [
        'Solution Generation (Brainstorming)', 'Solution Selection Matrix',
        'Failure Mode & Effects Analysis (FMEA)', 'Pilot Plan & Results',
        'Cost-Benefit Analysis', 'Implementation Plan', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Control', order: 5, sections: [
        'Control Plan', 'Statistical Process Control (SPC) Setup',
        'Standard Operating Procedures (SOPs)', 'Training Plan',
        'Response Plan', 'Handover to Process Owner',
        'Project Closure & Lessons Learned',
      ],
    },
  ],
  dmadv: [
    {
      name: 'Define', order: 1, sections: [
        'Project Charter', 'Customer Needs (VOC)', 'Business Case',
        'Team & Stakeholders', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Measure', order: 2, sections: [
        'CTQ Tree', 'Benchmarking', 'Measurement Plan', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Analyze', order: 3, sections: [
        'Design Concepts', 'Pugh Matrix / Concept Selection',
        'Risk Assessment (FMEA)', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Design', order: 4, sections: [
        'Detailed Design', 'Prototype / Pilot', 'Design Validation',
        'Implementation Plan', 'Tollgate Sign-off',
      ],
    },
    {
      name: 'Verify', order: 5, sections: [
        'Pilot Results', 'Full-scale Rollout', 'Control Plan',
        'Handover & Closure',
      ],
    },
  ],
  kaizen: [
    {
      name: 'Plan', order: 1, sections: [
        'Problem Definition', 'Current State Map', 'Goal Setting',
        'Team Charter',
      ],
    },
    {
      name: 'Do', order: 2, sections: [
        'Kaizen Event Execution', 'Quick Wins Implementation',
        'Future State Map', 'Action Log',
      ],
    },
    {
      name: 'Check', order: 3, sections: [
        'Results Measurement', 'Before vs After Comparison',
        'Gap Analysis',
      ],
    },
    {
      name: 'Act', order: 4, sections: [
        'Standardize Improvements', 'Training & Communication',
        'Sustain Plan', 'Lessons Learned',
      ],
    },
  ],
  lean: [
    {
      name: 'Identify', order: 1, sections: [
        'Value Stream Mapping (Current)', 'Waste Identification (8 Wastes)',
        'Problem Statement', 'Scope & Goals',
      ],
    },
    {
      name: 'Analyze', order: 2, sections: [
        'Root Cause Analysis', 'Takt Time Calculation',
        'Flow Analysis', 'Pull System Design',
      ],
    },
    {
      name: 'Improve', order: 3, sections: [
        'Value Stream Mapping (Future)', '5S Implementation',
        'Kaizen Events', 'Visual Management',
      ],
    },
    {
      name: 'Sustain', order: 4, sections: [
        'Standard Work Documentation', 'Leader Standard Work',
        'KPI Dashboard', 'Audit Schedule', 'Lessons Learned',
      ],
    },
  ],
  general: [
    {
      name: 'Initiate', order: 1, sections: [
        'Project Charter', 'Stakeholder Analysis', 'Business Case',
        'Scope Statement',
      ],
    },
    {
      name: 'Plan', order: 2, sections: [
        'Project Plan', 'Risk Register', 'Resource Plan',
        'Communication Plan',
      ],
    },
    {
      name: 'Execute', order: 3, sections: [
        'Work Packages', 'Progress Tracking', 'Issue Log',
        'Change Log',
      ],
    },
    {
      name: 'Monitor', order: 4, sections: [
        'Status Reports', 'KPI Tracking', 'Milestone Review',
      ],
    },
    {
      name: 'Close', order: 5, sections: [
        'Final Report', 'Lessons Learned', 'Project Handover',
        'Benefits Realisation',
      ],
    },
  ],
  custom: [],
}

// ── Health / metric config ────────────────────────────────────
const METRIC_CATEGORIES = [
  'Safety', 'Quality', 'Cost', 'Delivery', 'Customer Service',
  'Employee Satisfaction', 'Productivity', 'Compliance', 'Environmental',
]

const METRIC_STATUS_CONFIG = {
  tracking:  { label: 'Tracking',  color: 'bg-blue-100 text-blue-700',    icon: Activity },
  on_target: { label: 'On Target', color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  at_risk:   { label: 'At Risk',   color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  achieved:  { label: 'Achieved',  color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  missed:    { label: 'Missed',    color: 'bg-red-100 text-red-700',      icon: XCircle },
}

const HEALTH_CONFIG = {
  green:  { label: 'On Track',  color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  yellow: { label: 'At Risk',   color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  red:    { label: 'Off Track', color: 'bg-red-100 text-red-700',      icon: XCircle },
}

// ── Health Badge ──────────────────────────────────────────────
function HealthBadge({ health }) {
  const cfg = HEALTH_CONFIG[health] || HEALTH_CONFIG.green
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

// ── Metric Status Badge ───────────────────────────────────────
function MetricStatusBadge({ status }) {
  const cfg = METRIC_STATUS_CONFIG[status] || METRIC_STATUS_CONFIG.tracking
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  )
}

// ── Compute health from phase/section dates ───────────────────
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

// ─────────────────────────────────────────────────────────────
// PROJECT SIDEBAR LIST
// ─────────────────────────────────────────────────────────────
function ProjectSidebar({ projects, loading, selectedId, onSelect }) {
  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-brand-orange" /></div>
  }
  if (projects.length === 0) {
    return (
      <div className="text-center py-10 px-3">
        <FolderOpen size={32} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-brand-charcoal font-medium">No active projects</p>
        <p className="text-xs text-brand-charcoal mt-1">Convert approved intake requests to create projects</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1 p-2">
      {projects.map(p => {
        const isSelected = p.id === selectedId
        const health = p.calculated_health || p.health || 'green'
        const healthDot = { green: 'bg-green-400', yellow: 'bg-yellow-400', red: 'bg-red-400' }[health] || 'bg-green-400'
        return (
          <button key={p.id} onClick={() => onSelect(p)}
            className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${isSelected ? 'bg-brand-orange/10 border border-brand-orange/30' : 'hover:bg-gray-100 border border-transparent'}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${healthDot}`} />
              <span className={`text-sm font-semibold truncate ${isSelected ? 'text-brand-orange' : 'text-brand-charcoal-dark'}`}>{p.name}</span>
            </div>
            <div className="flex items-center gap-2 pl-4 text-xs text-brand-charcoal">
              <span className="capitalize">{p.type || 'dmaic'}</span>
              <span className="text-gray-300">·</span>
              <span className="capitalize">{p.phase || 'Define'}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION DOCUMENTS
// ─────────────────────────────────────────────────────────────
function SectionDocuments({ sectionId, projectId, phaseName, sectionName, userId }) {
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const loadDocs = async () => {
    const { data } = await supabase
      .from('section_documents')
      .select('*')
      .eq('section_date_id', sectionId)
      .order('created_at')
    setDocs(data || [])
  }

  useEffect(() => { loadDocs() }, [sectionId])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${projectId}/${sectionId}/${Date.now()}_${safeName}`

    const { error: storageErr } = await supabase.storage
      .from('section-documents')
      .upload(path, file, { upsert: false })

    if (storageErr) {
      console.error('Upload error:', storageErr)
      alert('Upload failed: ' + storageErr.message)
      setUploading(false)
      return
    }

    await supabase.from('section_documents').insert({
      project_id: projectId,
      section_date_id: sectionId,
      phase_name: phaseName,
      section_name: sectionName,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: userId,
    })

    setUploading(false)
    fileRef.current.value = ''
    loadDocs()
  }

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return
    await supabase.storage.from('section-documents').remove([doc.file_path])
    await supabase.from('section_documents').delete().eq('id', doc.id)
    loadDocs()
  }

  const handleDownload = async (doc) => {
    const { data } = supabase.storage
      .from('section-documents')
      .getPublicUrl(doc.file_path)
    window.open(data.publicUrl, '_blank')
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-brand-charcoal flex items-center gap-1">
          <Paperclip size={12} /> Documents {docs.length > 0 && `(${docs.length})`}
        </span>
        <label className="cursor-pointer text-xs text-brand-orange hover:underline flex items-center gap-1">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <><Upload size={12} /> Upload</>}
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {docs.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No documents uploaded yet</p>
      ) : (
        <div className="space-y-1">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg">
              <File size={13} className="text-brand-orange flex-shrink-0" />
              <span className="text-xs font-medium text-brand-charcoal-dark flex-1 truncate">{doc.file_name}</span>
              {doc.file_size && <span className="text-xs text-gray-400">{formatSize(doc.file_size)}</span>}
              <button onClick={() => handleDownload(doc)} className="p-1 text-gray-400 hover:text-brand-orange" title="Download">
                <Download size={12} />
              </button>
              <button onClick={() => handleDelete(doc)} className="p-1 text-gray-400 hover:text-red-500" title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// IMPROVEMENT METRICS
// ─────────────────────────────────────────────────────────────
function ImprovementMetrics({ projectId, companyId, userProfile }) {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [newMetric, setNewMetric] = useState({
    category: 'Quality', metric_name: '', unit: '%',
    baseline_value: '', target_value: '', actual_value: '', notes: '',
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
    const toNum = v => { const n = parseFloat(v); return isNaN(n) ? null : n }
    await supabase.from('improvement_metrics').insert({
      company_id: companyId,
      project_id: projectId,
      category: newMetric.category,
      metric_name: newMetric.metric_name.trim(),
      unit: newMetric.unit.trim() || null,
      baseline_value: newMetric.baseline_value || null,
      baseline_numeric: toNum(newMetric.baseline_value),
      target_value: newMetric.target_value || null,
      target_numeric: toNum(newMetric.target_value),
      actual_value: newMetric.actual_value || null,
      actual_numeric: toNum(newMetric.actual_value),
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
                        <td className="py-2 text-brand-charcoal">{m.unit || '—'}</td>
                        <td className="py-2 text-brand-charcoal">{m.baseline_value || '—'}</td>
                        <td className="py-2 text-brand-charcoal">{m.target_value || '—'}</td>
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

// ─────────────────────────────────────────────────────────────
// PHASE DATES & SECTION MANAGER
// ─────────────────────────────────────────────────────────────
function PhaseDatesManager({ projectId, projectType, companyId, userId, onHealthChange }) {
  const [phaseDates, setPhaseDates] = useState([])
  const [sectionDates, setSectionDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedPhase, setExpandedPhase] = useState(null)
  const [expandedSection, setExpandedSection] = useState(null) // "sectionId"
  const [saving, setSaving] = useState(false)
  const [addingSectionFor, setAddingSectionFor] = useState(null) // phase_name
  const [newSectionName, setNewSectionName] = useState('')
  const [stepsCache, setStepsCache] = useState({}) // sectionId -> steps text
  const [addingPhase, setAddingPhase] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [renamingPhaseId, setRenamingPhaseId] = useState(null)
  const [renamePhaseName, setRenamePhaseName] = useState('')
  const [actionItemInputs, setActionItemInputs] = useState({}) // sectionId -> input text

  // Pick template based on project type
  const isCustom = projectType === 'custom'
  const templatePhases = TEMPLATE_PHASES[projectType] || TEMPLATE_PHASES.general

  const loadDates = async () => {
    const [{ data: pd }, { data: sd }] = await Promise.all([
      supabase.from('project_phase_dates').select('*').eq('project_id', projectId).order('phase_order'),
      supabase.from('project_section_dates').select('*').eq('project_id', projectId).order('created_at'),
    ])
    setPhaseDates(pd || [])
    setSectionDates(sd || [])
    setLoading(false)
    const health = computeHealth(pd || [], sd || [])
    onHealthChange(health)
  }

  useEffect(() => { loadDates() }, [projectId])

  // Initialize phases + sections from template
  const initializePhases = async () => {
    setSaving(true)
    try {
      // Insert phase rows
      const phaseRows = templatePhases.map(p => ({
        project_id: projectId,
        phase_name: p.name,
        phase_order: p.order,
        status: 'pending',
      }))
      const { data: insertedPhases } = await supabase
        .from('project_phase_dates')
        .insert(phaseRows)
        .select()

      // Insert section rows for each phase
      const sectionRows = []
      for (const phase of templatePhases) {
        for (const sectionName of phase.sections) {
          sectionRows.push({
            project_id: projectId,
            phase_name: phase.name,
            section_name: sectionName,
            status: 'pending',
          })
        }
      }
      if (sectionRows.length > 0) {
        await supabase.from('project_section_dates').insert(sectionRows)
      }
    } catch (err) {
      console.error('Init error:', err)
    }
    setSaving(false)
    loadDates()
  }

  const resetAndReinitialize = async () => {
    if (!window.confirm(
      `This will delete all existing phases and sections for this project and reinitialize from the ${(projectType || 'dmaic').toUpperCase()} template.\n\nSteps, due dates, and uploaded documents will be lost. Continue?`
    )) return
    setSaving(true)
    try {
      await supabase.from('project_section_dates').delete().eq('project_id', projectId)
      await supabase.from('project_phase_dates').delete().eq('project_id', projectId)
      const phaseRows = templatePhases.map(p => ({
        project_id: projectId,
        phase_name: p.name,
        phase_order: p.order,
        status: 'pending',
      }))
      await supabase.from('project_phase_dates').insert(phaseRows)
      const sectionRows = templatePhases.flatMap(phase =>
        phase.sections.map(sectionName => ({
          project_id: projectId,
          phase_name: phase.name,
          section_name: sectionName,
          status: 'pending',
        }))
      )
      if (sectionRows.length > 0) {
        await supabase.from('project_section_dates').insert(sectionRows)
      }
    } catch (err) {
      console.error('Reset error:', err)
    }
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

  const updateSectionField = async (id, field, value) => {
    await supabase.from('project_section_dates').update({ [field]: value || null }).eq('id', id)
    loadDates()
  }

  const updateSectionStatus = async (sectionId, newStatus) => {
    await supabase.from('project_section_dates').update({ status: newStatus }).eq('id', sectionId)

    // Auto-update phase actual dates based on section completion
    const section = sectionDates.find(s => s.id === sectionId)
    if (section) {
      const phase = phaseDates.find(p => p.phase_name === section.phase_name)
      if (phase) {
        const todayStr = new Date().toISOString().split('T')[0]
        const otherSections = sectionDates.filter(s => s.phase_name === section.phase_name && s.id !== sectionId)
        const updates = {}

        // Set actual_start when first section becomes active
        if (!phase.actual_start_date && (newStatus === 'in_progress' || newStatus === 'completed')) {
          updates.actual_start_date = todayStr
        }

        // Set actual_end when ALL sections in the phase are completed
        const allDone = newStatus === 'completed' && otherSections.every(s => s.status === 'completed')
        if (allDone) {
          updates.actual_end_date = todayStr
        } else if (newStatus !== 'completed' && phase.actual_end_date) {
          // Clear actual_end if a section was un-completed
          updates.actual_end_date = null
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from('project_phase_dates').update(updates).eq('id', phase.id)
        }
      }
    }
    loadDates()
  }

  const updateSectionSteps = async (id, steps) => {
    await supabase.from('project_section_dates').update({ steps: steps || null }).eq('id', id)
    loadDates()
  }

  const addSection = async (phaseName) => {
    if (!newSectionName.trim()) return
    await supabase.from('project_section_dates').insert({
      project_id: projectId,
      phase_name: phaseName,
      section_name: newSectionName.trim(),
      status: 'pending',
    })
    setAddingSectionFor(null)
    setNewSectionName('')
    loadDates()
  }

  const deleteSectionDate = async (id) => {
    await supabase.from('project_section_dates').delete().eq('id', id)
    loadDates()
  }

  // ── Custom project phase management ──────────────────────────
  const addCustomPhase = async () => {
    if (!newPhaseName.trim()) return
    setSaving(true)
    const maxOrder = phaseDates.length > 0 ? Math.max(...phaseDates.map(p => p.phase_order || 0)) : 0
    await supabase.from('project_phase_dates').insert({
      project_id: projectId,
      phase_name: newPhaseName.trim(),
      phase_order: maxOrder + 1,
      status: 'pending',
      is_custom: true,
    })
    setAddingPhase(false)
    setNewPhaseName('')
    setSaving(false)
    loadDates()
  }

  const renamePhase = async (phaseId, oldName) => {
    const trimmed = renamePhaseName.trim()
    if (!trimmed || trimmed === oldName) { setRenamingPhaseId(null); return }
    setSaving(true)
    await supabase.from('project_phase_dates').update({ phase_name: trimmed }).eq('id', phaseId)
    await supabase.from('project_section_dates').update({ phase_name: trimmed })
      .eq('project_id', projectId).eq('phase_name', oldName)
    setRenamingPhaseId(null)
    setSaving(false)
    loadDates()
  }

  const deletePhase = async (phaseId, phaseName) => {
    if (!window.confirm(`Delete phase "${phaseName}" and all its sections? This cannot be undone.`)) return
    setSaving(true)
    await supabase.from('project_section_dates').delete().eq('project_id', projectId).eq('phase_name', phaseName)
    await supabase.from('project_phase_dates').delete().eq('id', phaseId)
    setSaving(false)
    loadDates()
  }

  // ── Action items (JSONB per section) ──────────────────────────
  const addActionItem = async (sectionId, text) => {
    if (!text.trim()) return
    const section = sectionDates.find(s => s.id === sectionId)
    const existing = Array.isArray(section?.action_items) ? section.action_items : []
    const newItem = { id: Date.now().toString(), text: text.trim(), done: false, sort_order: existing.length + 1 }
    await supabase.from('project_section_dates').update({ action_items: [...existing, newItem] }).eq('id', sectionId)
    setActionItemInputs(prev => ({ ...prev, [sectionId]: '' }))
    loadDates()
  }

  const toggleActionItem = async (sectionId, itemId) => {
    const section = sectionDates.find(s => s.id === sectionId)
    const existing = Array.isArray(section?.action_items) ? section.action_items : []
    await supabase.from('project_section_dates')
      .update({ action_items: existing.map(item => item.id === itemId ? { ...item, done: !item.done } : item) })
      .eq('id', sectionId)
    loadDates()
  }

  const deleteActionItem = async (sectionId, itemId) => {
    const section = sectionDates.find(s => s.id === sectionId)
    const existing = Array.isArray(section?.action_items) ? section.action_items : []
    await supabase.from('project_section_dates')
      .update({ action_items: existing.filter(item => item.id !== itemId) })
      .eq('id', sectionId)
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
          <h3 className="font-bold text-brand-charcoal-dark">{isCustom ? 'Custom Phases' : 'Phase Timeline'}</h3>
          {phaseDates.length > 0 && (
            <span className="text-xs bg-gray-100 text-brand-charcoal px-2 py-0.5 rounded-full capitalize">
              {projectType || 'dmaic'}
            </span>
          )}
        </div>
        {isCustom ? (
          <button onClick={() => { setAddingPhase(true); setNewPhaseName('') }}
            className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3" disabled={saving}>
            <Plus size={14} /> Add Phase
          </button>
        ) : phaseDates.length === 0 ? (
          <button onClick={initializePhases}
            className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3" disabled={saving}>
            {saving
              ? <Loader2 size={14} className="animate-spin" />
              : <><Plus size={14} /> Initialize Phases</>}
          </button>
        ) : (
          <button onClick={resetAndReinitialize}
            className="flex items-center gap-1.5 text-xs text-brand-charcoal border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors" disabled={saving}
            title={`Reset and reload phases from ${(projectType || 'dmaic').toUpperCase()} template`}>
            {saving
              ? <Loader2 size={12} className="animate-spin" />
              : <><RefreshCw size={12} /> Reinitialize from Template</>}
          </button>
        )}
      </div>

      {/* Add phase inline input (custom projects only) */}
      {isCustom && addingPhase && (
        <div className="flex gap-2 mb-4">
          <input
            className="input py-1.5 text-sm flex-1"
            placeholder="Phase name (e.g. Discovery, Build, Launch…)"
            value={newPhaseName}
            onChange={e => setNewPhaseName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustomPhase(); if (e.key === 'Escape') setAddingPhase(false) }}
            autoFocus />
          <button onClick={addCustomPhase} className="btn-primary py-1.5 px-3 text-sm" disabled={saving}>Add</button>
          <button onClick={() => setAddingPhase(false)} className="btn-secondary py-1.5 px-3 text-sm">Cancel</button>
        </div>
      )}

      {phaseDates.length === 0 ? (
        isCustom ? (
          <div className="text-center py-10 text-brand-charcoal">
            <div className="w-14 h-14 rounded-2xl bg-brand-orange/10 flex items-center justify-center mx-auto mb-3">
              <Plus size={28} className="text-brand-orange" />
            </div>
            <p className="font-semibold text-brand-charcoal-dark">Blank canvas — build your own phases</p>
            <p className="text-sm text-brand-charcoal mt-1">Click "Add Phase" to define your first phase, then add sections and action items within each.</p>
          </div>
        ) : (
        <div className="text-center py-8 text-brand-charcoal">
          <Calendar size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm">
            Click "Initialize Phases" to load the{' '}
            <span className="font-semibold capitalize">{projectType || 'DMAIC'}</span>{' '}
            template phases and sections for this project.
          </p>
        </div>
        )
      ) : (
        <div className="space-y-2">
          {phaseDates.map(pd => {
            const isExpanded = expandedPhase === pd.phase_name
            const sections = sectionDates.filter(s => s.phase_name === pd.phase_name)
            const isOverdue = ['pending', 'in_progress'].includes(pd.status) && pd.target_end_date && pd.target_end_date < today
            const isNearDue = !isOverdue && ['pending', 'in_progress'].includes(pd.status) && pd.target_end_date &&
              pd.target_end_date < new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
            const completedSections = sections.filter(s => s.status === 'completed').length

            return (
              <div key={pd.id} className={`border rounded-xl overflow-hidden ${isOverdue ? 'border-red-300 bg-red-50/30' : isNearDue ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'}`}>

                {/* Phase header row */}
                <div className="flex items-center gap-1 p-3 hover:bg-gray-50/50 transition-colors">
                  <button onClick={() => setExpandedPhase(isExpanded ? null : pd.phase_name)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    {isExpanded ? <ChevronDown size={16} className="flex-shrink-0" /> : <ChevronRight size={16} className="flex-shrink-0" />}
                    {isCustom && renamingPhaseId === pd.id ? (
                      <input
                        className="input py-0.5 text-sm font-semibold flex-1"
                        value={renamePhaseName}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setRenamePhaseName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') renamePhase(pd.id, pd.phase_name); if (e.key === 'Escape') setRenamingPhaseId(null) }}
                        onBlur={() => renamePhase(pd.id, pd.phase_name)}
                        autoFocus />
                    ) : (
                      <span className="font-semibold text-brand-charcoal-dark truncate">{pd.phase_name}</span>
                    )}
                  </button>
                  {sections.length > 0 && (
                    <span className="text-xs text-gray-500 flex-shrink-0">{completedSections}/{sections.length} sections</span>
                  )}
                  {isOverdue && <span className="text-xs text-red-600 font-medium flex items-center gap-1 flex-shrink-0"><AlertTriangle size={12} /> Overdue</span>}
                  {isNearDue && <span className="text-xs text-yellow-600 font-medium flex items-center gap-1 flex-shrink-0"><Clock size={12} /> Due Soon</span>}
                  {isCustom && pd.is_custom && renamingPhaseId !== pd.id && (
                    <>
                      <button onClick={() => { setRenamingPhaseId(pd.id); setRenamePhaseName(pd.phase_name) }}
                        className="p-1 text-gray-300 hover:text-brand-orange flex-shrink-0 transition-colors" title="Rename phase">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deletePhase(pd.id, pd.phase_name)}
                        className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors" title="Delete phase">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  <select className="text-xs bg-white border border-gray-200 rounded px-2 py-1 flex-shrink-0"
                    value={pd.status}
                    onChange={e => updatePhaseStatus(pd.id, e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                  </select>
                  {pd.status === 'completed' && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
                </div>

                {/* Phase expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">

                    {/* Phase date fields */}
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
                        <label className="label text-xs flex items-center gap-1">
                          Actual Start <span className="text-gray-400 font-normal normal-case">(auto)</span>
                        </label>
                        <div className={`input py-1.5 text-sm bg-gray-50 text-gray-500 ${!pd.actual_start_date ? 'italic text-gray-400' : ''}`}>
                          {pd.actual_start_date || 'Not started'}
                        </div>
                      </div>
                      <div>
                        <label className="label text-xs flex items-center gap-1">
                          Actual End <span className="text-gray-400 font-normal normal-case">(auto)</span>
                        </label>
                        <div className={`input py-1.5 text-sm bg-gray-50 text-gray-500 ${!pd.actual_end_date ? 'italic text-gray-400' : ''}`}>
                          {pd.actual_end_date || 'Not complete'}
                        </div>
                      </div>
                    </div>

                    {/* Sections list */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider">Sections</span>
                        <button
                          onClick={() => { setAddingSectionFor(pd.phase_name); setNewSectionName('') }}
                          className="text-xs text-brand-orange hover:underline flex items-center gap-1">
                          <Plus size={12} /> Add Section
                        </button>
                      </div>

                      {/* Add section inline form */}
                      {addingSectionFor === pd.phase_name && (
                        <div className="flex gap-2 mb-2">
                          <input
                            className="input py-1.5 text-sm flex-1"
                            placeholder="Section name"
                            value={newSectionName}
                            onChange={e => setNewSectionName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addSection(pd.phase_name); if (e.key === 'Escape') setAddingSectionFor(null) }}
                            autoFocus />
                          <button onClick={() => addSection(pd.phase_name)}
                            className="btn-primary py-1.5 px-3 text-sm">Add</button>
                          <button onClick={() => setAddingSectionFor(null)}
                            className="btn-secondary py-1.5 px-3 text-sm">Cancel</button>
                        </div>
                      )}

                      {sections.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No sections defined</p>
                      ) : (
                        <div className="space-y-1.5">
                          {sections.map(s => {
                            const sOverdue = ['pending', 'in_progress'].includes(s.status) && s.target_date && s.target_date < today
                            const sExpanded = expandedSection === s.id
                            const stepsValue = stepsCache[s.id] !== undefined ? stepsCache[s.id] : (s.steps || '')
                            const isCompleted = s.status === 'completed'

                            return (
                              <div key={s.id} className={`rounded-lg border ${sOverdue ? 'border-red-200 bg-red-50/30' : isCompleted ? 'border-green-200 bg-green-50/20' : 'border-gray-200 bg-white'}`}>
                                {/* Section header row */}
                                <div className="flex items-center gap-2 px-3 py-2">
                                  {/* Completion checkbox */}
                                  <button
                                    onClick={() => updateSectionStatus(s.id, isCompleted ? 'pending' : 'completed')}
                                    className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                                    {isCompleted && <Check size={11} className="text-white" />}
                                  </button>

                                  {/* Section name — click to expand for steps/docs */}
                                  <button
                                    onClick={() => setExpandedSection(sExpanded ? null : s.id)}
                                    className="flex items-center gap-1.5 flex-1 text-left min-w-0">
                                    <span className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-gray-400' : 'text-brand-charcoal-dark'}`}>
                                      {s.section_name || <span className="italic text-gray-400">Unnamed section</span>}
                                    </span>
                                    {s.steps && <FileText size={11} className="text-brand-orange flex-shrink-0" title="Has steps notes" />}
                                    {sOverdue && <AlertTriangle size={11} className="text-red-500 flex-shrink-0" />}
                                    {sExpanded
                                      ? <ChevronDown size={12} className="text-gray-400 flex-shrink-0 ml-auto" />
                                      : <ChevronRight size={12} className="text-gray-400 flex-shrink-0 ml-auto" />}
                                  </button>

                                  {/* Due date */}
                                  <input type="date"
                                    className="text-xs border border-gray-200 rounded px-2 py-1 flex-shrink-0 w-[130px] focus:outline-none focus:border-brand-orange"
                                    value={s.target_date || ''}
                                    title="Due date"
                                    onChange={e => updateSectionField(s.id, 'target_date', e.target.value)} />

                                  {/* Docs icon */}
                                  <button
                                    onClick={() => setExpandedSection(sExpanded ? null : s.id)}
                                    title="View/upload documents"
                                    className={`p-1 flex-shrink-0 transition-colors ${sExpanded ? 'text-brand-orange' : 'text-gray-400 hover:text-brand-orange'}`}>
                                    <Paperclip size={14} />
                                  </button>

                                  {/* Delete */}
                                  <button onClick={() => deleteSectionDate(s.id)}
                                    className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors">
                                    <Trash2 size={12} />
                                  </button>
                                </div>

                                {/* Section expanded body: steps + documents */}
                                {sExpanded && (
                                  <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-3">

                                    {/* Steps textarea */}
                                    <div>
                                      <label className="label text-xs flex items-center gap-1 mb-1">
                                        <FileText size={12} /> Steps to Complete This Section
                                      </label>
                                      <textarea
                                        className="input text-sm w-full resize-none"
                                        rows={4}
                                        placeholder="Describe the steps involved in completing this section, key activities, tools to use, acceptance criteria, etc."
                                        value={stepsValue}
                                        onChange={e => setStepsCache(prev => ({ ...prev, [s.id]: e.target.value }))}
                                        onBlur={e => updateSectionSteps(s.id, e.target.value)}
                                      />
                                      <p className="text-xs text-gray-400 mt-1">Auto-saved when you click away</p>
                                    </div>

                                    {/* Documents */}
                                    <SectionDocuments
                                      sectionId={s.id}
                                      projectId={projectId}
                                      phaseName={s.phase_name}
                                      sectionName={s.section_name}
                                      userId={userId}
                                    />

                                    {/* Action Items */}
                                    <div>
                                      <span className="text-xs font-semibold text-brand-charcoal flex items-center gap-1 mb-2">
                                        <CheckCircle2 size={12} /> Action Items
                                        {Array.isArray(s.action_items) && s.action_items.length > 0 && (
                                          <span className="ml-1 text-gray-400 font-normal">
                                            ({s.action_items.filter(a => a.done).length}/{s.action_items.length})
                                          </span>
                                        )}
                                      </span>
                                      {Array.isArray(s.action_items) && s.action_items.length > 0 && (
                                        <div className="space-y-1.5 mb-2">
                                          {s.action_items.map(item => (
                                            <div key={item.id} className="flex items-center gap-2 group">
                                              <button
                                                onClick={() => toggleActionItem(s.id, item.id)}
                                                className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${item.done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                                                {item.done && <Check size={9} className="text-white" />}
                                              </button>
                                              <span className={`text-sm flex-1 ${item.done ? 'line-through text-gray-400' : 'text-brand-charcoal-dark'}`}>
                                                {item.text}
                                              </span>
                                              <button
                                                onClick={() => deleteActionItem(s.id, item.id)}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all flex-shrink-0">
                                                <Trash2 size={11} />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex gap-2">
                                        <input
                                          className="input py-1 text-xs flex-1"
                                          placeholder="Add action item…"
                                          value={actionItemInputs[s.id] || ''}
                                          onChange={e => setActionItemInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                                          onKeyDown={e => { if (e.key === 'Enter') addActionItem(s.id, actionItemInputs[s.id] || '') }}
                                        />
                                        <button
                                          onClick={() => addActionItem(s.id, actionItemInputs[s.id] || '')}
                                          className="text-xs text-brand-orange border border-brand-orange/30 rounded-lg px-2 py-1 hover:bg-brand-orange/5 transition-colors flex items-center gap-1">
                                          <Plus size={11} /> Add
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
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

// ─────────────────────────────────────────────────────────────
// PROJECT BENEFITS DISPLAY
// ─────────────────────────────────────────────────────────────
function ProjectBenefits({ projectId }) {
  const [benefits, setBenefits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: proj } = await supabase.from('projects').select('intake_id').eq('id', projectId).single()
      const queries = [supabase.from('project_benefits').select('*').eq('project_id', projectId)]
      if (proj?.intake_id) {
        queries.push(supabase.from('project_benefits').select('*').eq('intake_id', proj.intake_id))
      }
      const results = await Promise.all(queries)
      const seen = new Set()
      const merged = []
      results.forEach(r => (r.data || []).forEach(b => { if (!seen.has(b.id)) { seen.add(b.id); merged.push(b) } }))
      setBenefits(merged)
      setLoading(false)
    }
    load()
  }, [projectId])

  if (loading || benefits.length === 0) return null

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
            <span className="text-sm font-bold text-brand-orange">{b.estimated_value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PROJECT DETAIL VIEW
// ─────────────────────────────────────────────────────────────
function ProjectDetail({ project, userProfile }) {
  const [health, setHealth] = useState(project.health || 'green')

  const handleHealthChange = async (newHealth) => {
    setHealth(newHealth)
    if (newHealth !== project.health) {
      await supabase.from('projects').update({ health: newHealth }).eq('id', project.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-brand-charcoal-dark">{project.name}</h1>
          <HealthBadge health={health} />
        </div>
        <div className="flex items-center gap-4 text-sm text-brand-charcoal">
          <span className="capitalize font-medium">{project.type || 'DMAIC'}</span>
          <span className="capitalize">Phase: {project.phase || 'Define'}</span>
          <span>Status: {project.status}</span>
          {project.project_lead && <span>Lead: {project.project_lead.full_name}</span>}
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

      {/* Phase Timeline with full section support */}
      <PhaseDatesManager
        projectId={project.id}
        projectType={project.type || 'general'}
        companyId={userProfile.company_id}
        userId={userProfile.id}
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

// ─────────────────────────────────────────────────────────────
// MAIN WORKSPACE PAGE
// ─────────────────────────────────────────────────────────────
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

  return (
    <div className="flex gap-0 h-full min-h-screen -mx-6 -mt-6">
      {/* Left sidebar — project list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-brand-charcoal-dark">Workspace</h2>
          <p className="text-xs text-brand-charcoal mt-0.5">
            {projects.length} active project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ProjectSidebar
            projects={projects}
            loading={loading}
            selectedId={selectedProject?.id}
            onSelect={setSelectedProject}
          />
        </div>
      </div>

      {/* Right panel — project detail */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            userProfile={userProfile}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-32">
            <FolderOpen size={48} className="text-gray-200 mb-4" />
            <p className="text-brand-charcoal font-medium">Select a project</p>
            <p className="text-sm text-gray-400 mt-1">Choose a project from the left to view its phases and progress</p>
          </div>
        )}
      </div>
    </div>
  )
}
