import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  BarChart3, ArrowRight, CheckCircle, Clock, Zap, TrendingUp,
  ChevronUp, ChevronDown, Star, AlertCircle, FolderOpen, X
} from 'lucide-react'

// ─── Scoring Modal ───────────────────────────────────────────────────────────
function ScoringModal({ request, onClose, onSaved }) {
  const [scores, setScores] = useState({
    impact: request.attachments?.scores?.impact ?? 3,
    alignment: request.attachments?.scores?.alignment ?? 3,
    feasibility: request.attachments?.scores?.feasibility ?? 3,
    risk: request.attachments?.scores?.risk ?? 3,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const criteria = [
    {
      key: 'impact',
      label: 'Business Impact',
      desc: 'How significant is the expected benefit?',
      low: 'Minimal',
      high: 'Transformational',
    },
    {
      key: 'alignment',
      label: 'Strategic Alignment',
      desc: 'How well does this align with company goals?',
      low: 'Tangential',
      high: 'Core priority',
    },
    {
      key: 'feasibility',
      label: 'Feasibility',
      desc: 'How achievable is this with current resources?',
      low: 'Very difficult',
      high: 'Very feasible',
    },
    {
      key: 'risk',
      label: 'Risk Level',
      desc: 'How low is the delivery / execution risk?',
      low: 'High risk',
      high: 'Low risk',
    },
  ]

  const total = Object.values(scores).reduce((a, b) => a + b, 0)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const existingAttachments = Array.isArray(request.attachments) ? request.attachments : []
    const { error: err } = await supabase
      .from('intake_requests')
      .update({
        priority_score: total,
        attachments: { ...existingAttachments, scores },
      })
      .eq('id', request.id)
    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      onSaved()
    }
  }

  const scoreColor = (s) =>
    s <= 2 ? 'text-status-red' : s === 3 ? 'text-status-yellow' : 'text-status-green'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-start justify-between p-6 border-b border-surface-border">
          <div>
            <h3 className="text-lg font-bold text-brand-charcoal-dark">Score Initiative</h3>
            <p className="text-sm text-brand-charcoal mt-0.5 line-clamp-2">{request.title}</p>
          </div>
          <button onClick={onClose} className="text-brand-charcoal hover:text-brand-charcoal-dark ml-4">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {criteria.map((c) => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm font-semibold text-brand-charcoal-dark">{c.label}</span>
                  <span className="text-xs text-brand-charcoal ml-2">{c.desc}</span>
                </div>
                <span className={`text-lg font-bold ${scoreColor(scores[c.key])}`}>{scores[c.key]}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-brand-charcoal w-20 text-right">{c.low}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={scores[c.key]}
                  onChange={(e) => setScores({ ...scores, [c.key]: Number(e.target.value) })}
                  className="flex-1 accent-brand-orange"
                />
                <span className="text-xs text-brand-charcoal w-20">{c.high}</span>
              </div>
              <div className="flex justify-between mt-1 px-20">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`text-xs ${scores[c.key] === n ? 'font-bold text-brand-orange' : 'text-brand-charcoal/50'}`}>{n}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-surface-secondary rounded-b-xl border-t border-surface-border">
          <div>
            <span className="text-sm text-brand-charcoal">Total score: </span>
            <span className={`text-2xl font-bold ${total >= 16 ? 'text-status-green' : total >= 10 ? 'text-status-yellow' : 'text-status-red'}`}>
              {total}
            </span>
            <span className="text-sm text-brand-charcoal">/20</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Score'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mx-6 mb-4 bg-status-red-bg text-status-red rounded-lg text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Convert Modal ────────────────────────────────────────────────────────────
function ConvertModal({ request, profile, onClose, onConverted }) {
  const [form, setForm] = useState({
    name: request.title,
    description: request.problem_statement || '',
    type: request.project_type || 'dmaic',
    start_date: new Date().toISOString().slice(0, 10),
    target_date: '',
    estimated_savings: request.estimated_savings || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleConvert = async () => {
    setSaving(true)
    setError('')
    // Create project
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .insert({
        company_id: profile.company_id,
        name: form.name,
        description: form.description,
        type: form.type,
        status: 'active',
        phase: 'define',
        health: 'green',
        start_date: form.start_date || null,
        target_date: form.target_date || null,
        estimated_savings: form.estimated_savings ? parseFloat(form.estimated_savings) : null,
        project_lead_id: profile.id,
        created_by: profile.id,
      })
      .select()
      .single()

    if (projErr) {
      setError(projErr.message)
      setSaving(false)
      return
    }

    // Update intake to converted
    const { error: intakeErr } = await supabase
      .from('intake_requests')
      .update({ status: 'converted', converted_project_id: project.id })
      .eq('id', request.id)

    if (intakeErr) {
      setError(intakeErr.message)
      setSaving(false)
      return
    }

    onConverted()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-start justify-between p-6 border-b border-surface-border">
          <div>
            <h3 className="text-lg font-bold text-brand-charcoal-dark">Convert to Project</h3>
            <p className="text-sm text-brand-charcoal mt-0.5">This will create a new active project from this initiative.</p>
          </div>
          <button onClick={onClose} className="text-brand-charcoal hover:text-brand-charcoal-dark ml-4">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="label">Project Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="input min-h-[80px] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Project Type</label>
              <select name="type" value={form.type} onChange={handleChange} className="input">
                <option value="dmaic">DMAIC</option>
                <option value="dmadv">DMADV</option>
                <option value="kaizen">Kaizen</option>
                <option value="lean">Lean</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="label">Est. Savings ($)</label>
              <input name="estimated_savings" type="number" value={form.estimated_savings} onChange={handleChange} className="input" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="label">Target Date</label>
              <input name="target_date" type="date" value={form.target_date} onChange={handleChange} className="input" />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mx-6 bg-status-red-bg text-status-red rounded-lg text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 p-6 border-t border-surface-border">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleConvert} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
              <><FolderOpen size={15} /> Launch Project</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score, max = 20 }) {
  const pct = Math.round((score / max) * 100)
  const color = score >= 16 ? 'bg-status-green' : score >= 10 ? 'bg-status-yellow' : 'bg-status-red'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-brand-charcoal-dark w-8 text-right">{score}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Portfolio() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [tab, setTab] = useState('active')  // Default to Active Projects
  const [approved, setApproved] = useState([])      // approved intake items not yet scored (or re-score)
  const [ranked, setRanked] = useState([])           // scored items
  const [activeProjects, setActiveProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState('priority_score')
  const [sortDir, setSortDir] = useState('desc')
  const [activeSortField, setActiveSortField] = useState('name')
  const [activeSortDir, setActiveSortDir] = useState('asc')
  const [scoringItem, setScoringItem] = useState(null)
  const [convertingItem, setConvertingItem] = useState(null)

  const canScore = userProfile?.role && ['owner', 'program_leader', 'project_manager'].includes(userProfile.role)

  // Load profile
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  const fetchData = async (profile) => {
    setLoading(true)
    setError('')
    const [intakeRes, projectsRes] = await Promise.all([
      supabase
        .from('intake_requests')
        .select('*')
        .eq('company_id', profile.company_id)
        .in('status', ['approved', 'on_hold'])
        .order('created_at', { ascending: false }),
      supabase
        .from('projects')
        .select('*')
        .eq('company_id', profile.company_id)
        .in('status', ['active', 'on_hold'])
        .order('created_at', { ascending: false }),
    ])
    if (intakeRes.error) setError(intakeRes.error.message)
    else {
      const items = intakeRes.data || []
      setApproved(items.filter((i) => !i.priority_score || i.priority_score === 0))
      setRanked(items.filter((i) => i.priority_score && i.priority_score > 0))
    }
    if (projectsRes.error) setError((e) => e + ' ' + projectsRes.error.message)
    else setActiveProjects(projectsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (userProfile?.company_id) fetchData(userProfile)
  }, [userProfile])

  const sortedRanked = [...ranked].sort((a, b) => {
    let av = a[sortField] ?? 0
    let bv = b[sortField] ?? 0
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  const sortedActiveProjects = [...activeProjects].sort((a, b) => {
    let av = a[activeSortField] ?? 0
    let bv = b[activeSortField] ?? 0
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    return activeSortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  const toggleActiveSort = (field) => {
    if (activeSortField === field) setActiveSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setActiveSortField(field); setActiveSortDir('asc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={13} className="text-brand-charcoal/30" />
    return sortDir === 'asc' ? <ChevronUp size={13} className="text-brand-orange" /> : <ChevronDown size={13} className="text-brand-orange" />
  }

  const ActiveSortIcon = ({ field }) => {
    if (activeSortField !== field) return <ChevronUp size={13} className="text-brand-charcoal/30" />
    return activeSortDir === 'asc' ? <ChevronUp size={13} className="text-brand-orange" /> : <ChevronDown size={13} className="text-brand-orange" />
  }

  const scoreLabel = (s) => {
    if (!s) return { label: 'Unscored', cls: 'text-brand-charcoal bg-surface-secondary' }
    if (s >= 16) return { label: 'High', cls: 'text-status-green bg-status-green-bg' }
    if (s >= 10) return { label: 'Medium', cls: 'text-status-yellow bg-status-yellow-bg' }
    return { label: 'Low', cls: 'text-status-red bg-status-red-bg' }
  }

  const healthDot = (h) => ({
    green: 'bg-status-green',
    yellow: 'bg-status-yellow',
    red: 'bg-status-red',
  }[h] || 'bg-surface-border')

  const phaseLabel = (p) => p ? p.charAt(0).toUpperCase() + p.slice(1) : '—'

  const stats = [
    { label: 'Awaiting Score', value: approved.length, icon: Clock, color: 'text-status-yellow' },
    { label: 'Scored & Ranked', value: ranked.length, icon: Star, color: 'text-brand-orange' },
    {
      label: 'Avg Priority Score',
      value: ranked.length ? Math.round(ranked.reduce((a, b) => a + b.priority_score, 0) / ranked.length) + '/20' : '—',
      icon: BarChart3,
      color: 'text-brand-charcoal',
    },
    { label: 'Active Projects', value: activeProjects.length, icon: Zap, color: 'text-status-green' },
  ]

  const tabs = [
    { id: 'active', label: 'Active Projects', count: activeProjects.length },
    { id: 'queue', label: 'Score Queue', count: approved.length },
    { id: 'ranked', label: 'Ranked', count: ranked.length },
  ]

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="mb-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-brand-charcoal-dark">Prioritization Matrix</h1>
        <p className="text-sm text-brand-charcoal mt-1">Score approved initiatives and decide what gets resourced next.</p>
      </div>

      {/* Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-full">
        {/* Left Column: Tabs + Content */}
        <div className="flex-1 min-w-0">
          {/* Flow hint */}
          <div className="flex items-center gap-2 mb-6 text-xs text-brand-charcoal bg-surface-secondary rounded-lg px-4 py-3 overflow-x-auto whitespace-nowrap">
            <span className="font-medium">Workflow:</span>
            {['Intake Submitted', 'Approved', 'Scored Here ✦', 'Converted to Project', 'Executed in Workspace'].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className={step.includes('✦') ? 'font-semibold text-brand-orange' : ''}>{step}</span>
                {i < arr.length - 1 && <ArrowRight size={12} className="text-brand-charcoal/40 flex-shrink-0" />}
              </span>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-surface-border">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.id
                    ? 'border-brand-orange text-brand-orange'
                    : 'border-transparent text-brand-charcoal hover:text-brand-charcoal-dark'
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-brand-orange text-white' : 'bg-surface-secondary text-brand-charcoal'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-4 bg-status-red-bg text-status-red rounded-lg text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          ) : (
            <>
              {/* ── Score Queue ── */}
              {tab === 'queue' && (
                <div>
                  {approved.length === 0 ? (
                    <div className="text-center py-20 text-brand-charcoal">
                      <CheckCircle size={40} className="mx-auto mb-3 text-status-green opacity-60" />
                      <p className="font-medium text-brand-charcoal-dark">All caught up!</p>
                      <p className="text-sm mt-1">No approved initiatives waiting to be scored.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {approved.map((item) => {
                        const sl = scoreLabel(item.priority_score)
                        return (
                          <div key={item.id} className="card flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-brand-charcoal-dark text-sm truncate">{item.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${sl.cls}`}>{sl.label}</span>
                              </div>
                              <p className="text-xs text-brand-charcoal line-clamp-2 mb-2">{item.problem_statement}</p>
                              <div className="flex items-center gap-3 text-xs text-brand-charcoal">
                                {item.department && <span>📍 {item.department}</span>}
                                {item.estimated_savings && <span>💰 ${Number(item.estimated_savings).toLocaleString()}</span>}
                                <span className="capitalize">🔵 {item.project_type}</span>
                              </div>
                            </div>
                            {canScore && (
                              <button
                                onClick={() => setScoringItem(item)}
                                className="btn-primary flex-shrink-0 flex items-center gap-1.5 text-sm"
                              >
                                <Star size={14} /> Score It
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Ranked ── */}
              {tab === 'ranked' && (
                <div>
                  {ranked.length === 0 ? (
                    <div className="text-center py-20 text-brand-charcoal">
                      <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
                      <p className="font-medium text-brand-charcoal-dark">No scored initiatives yet.</p>
                      <p className="text-sm mt-1">Score items in the Score Queue tab to see them ranked here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-surface-border text-xs text-brand-charcoal">
                            <th className="text-left pb-3 pr-4 font-medium w-8">#</th>
                            <th
                              className="text-left pb-3 pr-4 font-medium cursor-pointer hover:text-brand-charcoal-dark"
                              onClick={() => toggleSort('title')}
                            >
                              <span className="flex items-center gap-1">Title <SortIcon field="title" /></span>
                            </th>
                            <th
                              className="text-left pb-3 pr-4 font-medium cursor-pointer hover:text-brand-charcoal-dark w-40"
                              onClick={() => toggleSort('priority_score')}
                            >
                              <span className="flex items-center gap-1">Score <SortIcon field="priority_score" /></span>
                            </th>
                            <th
                              className="text-left pb-3 pr-4 font-medium cursor-pointer hover:text-brand-charcoal-dark"
                              onClick={() => toggleSort('project_type')}
                            >
                              <span className="flex items-center gap-1">Type <SortIcon field="project_type" /></span>
                            </th>
                            <th
                              className="text-left pb-3 pr-4 font-medium cursor-pointer hover:text-brand-charcoal-dark"
                              onClick={() => toggleSort('estimated_savings')}
                            >
                              <span className="flex items-center gap-1">Savings <SortIcon field="estimated_savings" /></span>
                            </th>
                            <th
                              className="text-left pb-3 font-medium cursor-pointer hover:text-brand-charcoal-dark"
                              onClick={() => toggleSort('department')}
                            >
                              <span className="flex items-center gap-1">Department <SortIcon field="department" /></span>
                            </th>
                            <th className="text-left pb-3 pl-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                          {sortedRanked.map((item, idx) => {
                            const sl = scoreLabel(item.priority_score)
                            return (
                              <tr key={item.id} className="hover:bg-surface-secondary/50 transition-colors">
                                <td className="py-3 pr-4 text-brand-charcoal font-bold">{idx + 1}</td>
                                <td className="py-3 pr-4">
                                  <div className="font-medium text-brand-charcoal-dark">{item.title}</div>
                                  {item.department && <div className="text-xs text-brand-charcoal">{item.department}</div>}
                                </td>
                                <td className="py-3 pr-4 w-40">
                                  <ScoreBar score={item.priority_score} />
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${sl.cls}`}>{sl.label}</span>
                                </td>
                                <td className="py-3 pr-4">
                                  <span className="capitalize text-brand-charcoal">{item.project_type}</span>
                                </td>
                                <td className="py-3 pr-4 text-brand-charcoal">
                                  {item.estimated_savings ? `$${Number(item.estimated_savings).toLocaleString()}` : '—'}
                                </td>
                                <td className="py-3 pr-4 text-brand-charcoal">
                                  {item.department || '—'}
                                </td>
                                <td className="py-3 pl-4">
                                  <div className="flex items-center gap-2">
                                    {canScore && (
                                      <button
                                        onClick={() => setScoringItem(item)}
                                        className="text-xs text-brand-charcoal hover:text-brand-orange font-medium"
                                      >
                                        Rescore
                                      </button>
                                    )}
                                    {canScore && (
                                      <button
                                        onClick={() => setConvertingItem(item)}
                                        className="btn-primary text-xs px-3 py-1 flex items-center gap-1"
                                      >
                                        <TrendingUp size={12} /> Convert
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Active Projects ── */}
              {tab === 'active' && (
                <div>
                  {activeProjects.length === 0 ? (
                    <div className="text-center py-20 text-brand-charcoal">
                      <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
                      <p className="font-medium text-brand-charcoal-dark">No active projects yet.</p>
                      <p className="text-sm mt-1">Convert a scored initiative to launch your first project.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-surface-border text-xs text-brand-charcoal">
                            <th
                              className="text-left pb-3 pr-4 font-medium cursor-pointer hover:text-brand-charcoal-dark"
                              onClick={() => toggleActiveSort('name')}
                            >
                              <span className="flex items-center gap-1">Project <ActiveSortIcon field="name" /></span>
                            </th>
                            <th
                              className="text-left pb-3 pr-4 font-medium cursor-pointer hover:text-brand-charcoal-dark"
                              onClick={() => toggleActiveSort('phase')}
                            >
                              <span className="flex items-center gap-1">Phase <ActiveSortIcon field="phase" /></span>
                            </th>
                            <th
                              className="text-left pb-3 pr-4 font-medium cursor-pointer hover:text-brand-charcoal-dark"
                              onClick={() => toggleActiveSort('health')}
                            >
                              <span className="flex items-center gap-1">Health <ActiveSortIcon field="health" /></span>
                            </th>
                            <th
                              className="text-left pb-3 pr-4 font-medium cursor-pointer hover:text-brand-charcoal-dark"
                              onClick={() => toggleActiveSort('type')}
                            >
                              <span className="flex items-center gap-1">Type <ActiveSortIcon field="type" /></span>
                            </th>
                            <th
                              className="text-left pb-3 pr-4 font-medium cursor-pointer hover:text-brand-charcoal-dark"
                              onClick={() => toggleActiveSort('target_date')}
                            >
                              <span className="flex items-center gap-1">Target Date <ActiveSortIcon field="target_date" /></span>
                            </th>
                            <th
                              className="text-left pb-3 font-medium cursor-pointer hover:text-brand-charcoal-dark"
                              onClick={() => toggleActiveSort('estimated_savings')}
                            >
                              <span className="flex items-center gap-1">Est. Savings <ActiveSortIcon field="estimated_savings" /></span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                          {sortedActiveProjects.map((p) => (
                            <tr key={p.id} className="hover:bg-surface-secondary/50 transition-colors">
                              <td className="py-3 pr-4">
                                <div className="font-medium text-brand-charcoal-dark">{p.name}</div>
                                {p.description && <div className="text-xs text-brand-charcoal line-clamp-1 max-w-xs">{p.description}</div>}
                              </td>
                              <td className="py-3 pr-4">
                                <span className="text-xs px-2 py-0.5 bg-surface-secondary text-brand-charcoal rounded-full font-medium">
                                  {phaseLabel(p.phase)}
                                </span>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${healthDot(p.health)}`} />
                                  <span className="capitalize text-brand-charcoal">{p.health}</span>
                                </div>
                              </td>
                              <td className="py-3 pr-4 capitalize text-brand-charcoal">{p.type}</td>
                              <td className="py-3 pr-4 text-brand-charcoal">
                                {p.target_date ? new Date(p.target_date).toLocaleDateString() : '—'}
                              </td>
                              <td className="py-3 text-brand-charcoal">
                                {p.estimated_savings ? `$${Number(p.estimated_savings).toLocaleString()}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column: Stats Summary */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="sticky top-6 space-y-4">
            {/* Stats Cards */}
            <div className="space-y-3">
              {stats.map((s) => (
                <div key={s.label} className="card py-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon size={16} className={s.color} />
                    <span className="text-xs text-brand-charcoal font-medium">{s.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-brand-charcoal-dark">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {scoringItem && (
        <ScoringModal
          request={scoringItem}
          onClose={() => setScoringItem(null)}
          onSaved={() => { setScoringItem(null); fetchData(userProfile) }}
        />
      )}
      {convertingItem && (
        <ConvertModal
          request={convertingItem}
          profile={userProfile}
          onClose={() => setConvertingItem(null)}
          onConverted={() => { setConvertingItem(null); fetchData(userProfile) }}
        />
      )}
    </div>
  )
}
