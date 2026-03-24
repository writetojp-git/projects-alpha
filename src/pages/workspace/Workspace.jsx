import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  FolderOpen, ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2,
  Loader2, AlertCircle, Calendar, Target, TrendingUp, BarChart3, Clock,
  CheckCircle2, XCircle, AlertTriangle, Save, X, Check,
  Activity, FileText, Upload, File, Download, Paperclip
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
// PROJECT LIST VIEW
// ─────────────────────────────────────────────────────────────
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

  // Pick template based on project type
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

  const updatePhaseDate = async (id, field, value) => {
    await supabase.from('project_phase_dates').update({ [field]: value || null }).eq('id', id)
    loadDates()
  }

  const updatePhaseStatus = async (id, status) => {
    await supabase.from('project_phase_dates').update({ status }).eq('id', id)
    loadDates()
  }

  const updateSectionDate = async (id, field, value) => {
    await supabase.from('project_section_dates').update({ [field]: value || null }).eq('id', id)
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
          {phaseDates.length > 0 && (
            <span className="text-xs bg-gray-100 text-brand-charcoal px-2 py-0.5 rounded-full capitalize">
              {projectType || 'dmaic'}
            </span>
          )}
        </div>
        {phaseDates.length === 0 && (
          <button onClick={initializePhases}
            className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3" disabled={saving}>
            {saving
              ? <Loader2 size={14} className="animate-spin" />
              : <><Plus size={14} /> Initialize Phases</>}
          </button>
        )}
      </div>

      {phaseDates.length === 0 ? (
        <div className="text-center py-8 text-brand-charcoal">
          <Calendar size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm">
            Click "Initialize Phases" to load the{' '}
            <span className="font-semibold capitalize">{projectType || 'DMAIC'}</span>{' '}
            template phases and sections for this project.
          </p>
        </div>
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
                <button onClick={() => setExpandedPhase(isExpanded ? null : pd.phase_name)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50/50 transition-colors">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="font-semibold text-brand-charcoal-dark flex-1 text-left">{pd.phase_name}</span>
                  {sections.length > 0 && (
                    <span className="text-xs text-gray-500">{completedSections}/{sections.length} sections</span>
                  )}
                  {isOverdue && <span className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle size={12} /> Overdue</span>}
                  {isNearDue && <span className="text-xs text-yellow-600 font-medium flex items-center gap-1"><Clock size={12} /> Due Soon</span>}
                  <select className="text-xs bg-white border border-gray-200 rounded px-2 py-1"
                    value={pd.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { e.stopPropagation(); updatePhaseStatus(pd.id, e.target.value) }}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                  </select>
                  {pd.status === 'completed' && <CheckCircle2 size={16} className="text-green-500" />}
                </button>

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
                        <div className="space-y-2">
                          {sections.map(s => {
                            const sOverdue = ['pending', 'in_progress'].includes(s.status) && s.target_date && s.target_date < today
                            const sExpanded = expandedSection === s.id
                            const stepsValue = stepsCache[s.id] !== undefined ? stepsCache[s.id] : (s.steps || '')

                            return (
                              <div key={s.id} className={`rounded-xl border ${sOverdue ? 'border-red-200 bg-red-50/40' : s.status === 'completed' ? 'border-green-200 bg-green-50/20' : 'border-gray-200 bg-gray-50/40'}`}>
                                {/* Section header row */}
                                <div className="flex items-center gap-2 p-2.5">
                                  <button
                                    onClick={() => setExpandedSection(sExpanded ? null : s.id)}
                                    className="flex items-center gap-1.5 flex-1 text-left min-w-0">
                                    {sExpanded ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                                    <span className={`text-sm font-medium truncate ${s.status === 'completed' ? 'line-through text-gray-400' : 'text-brand-charcoal-dark'}`}>
                                      {s.section_name}
                                    </span>
                                    {s.steps && <FileText size={12} className="text-brand-orange flex-shrink-0" title="Has steps" />}
                                    {sOverdue && <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />}
                                  </button>
                                  <input type="date" className="input py-1 text-xs w-34"
                                    value={s.target_date || ''}
                                    onChange={e => updateSectionDate(s.id, 'target_date', e.target.value)} />
                                  <select className="text-xs bg-white border border-gray-200 rounded px-1.5 py-1 flex-shrink-0"
                                    value={s.status}
                                    onChange={e => updateSectionDate(s.id, 'status', e.target.value)}>
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                  <button onClick={() => deleteSectionDate(s.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0">
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
function ProjectDetail({ project, userProfile, onBack }) {
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
            <span className="capitalize font-medium">{project.type || 'DMAIC'}</span>
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
