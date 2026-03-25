import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Loader2, Sparkles, Save, CheckCircle2, XCircle, Clock,
  Plus, Trash2, AlertCircle, ChevronRight, FileCheck
} from 'lucide-react'

// ─── Health dot ───────────────────────────────────────────────
function HealthDot({ health }) {
  const colors = { green: 'bg-status-green', yellow: 'bg-status-yellow', red: 'bg-status-red' }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[health] || colors.green}`} />
}

// ─── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    draft:     { label: 'Draft',     cls: 'badge-blue' },
    submitted: { label: 'Submitted', cls: 'badge-yellow' },
    approved:  { label: 'Approved',  cls: 'badge-green' },
    rejected:  { label: 'Rejected',  cls: 'badge-red' },
  }
  const c = cfg[status] || cfg.draft
  return <span className={c.cls}>{c.label}</span>
}

// ─── Inline table row for metrics/milestones/team ─────────────
function EditableRow({ columns, row, rowIndex, onChange, onDelete }) {
  return (
    <tr className="border-b border-gray-100 last:border-0 group">
      {columns.map(col => (
        <td key={col.key} className="py-1.5 px-2">
          <input
            type={col.type || 'text'}
            value={row[col.key] || ''}
            onChange={e => onChange(rowIndex, col.key, e.target.value)}
            placeholder={col.placeholder || ''}
            className="w-full text-sm border-0 bg-transparent focus:outline-none focus:bg-surface-secondary rounded px-1 py-0.5 text-brand-charcoal-dark placeholder:text-gray-300"
          />
        </td>
      ))}
      <td className="py-1.5 px-2 w-8">
        <button
          onClick={() => onDelete(rowIndex)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-status-red"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

// ─── Main Charter Page ─────────────────────────────────────────
export default function Charter() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [charter, setCharter] = useState(null)
  const [charterExists, setCharterExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [charterLoading, setCharterLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [rejectionInput, setRejectionInput] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [approverName, setApproverName] = useState('')
  const autoSaveTimer = useRef(null)

  const emptyCharter = {
    problem_statement: '',
    goal_statement: '',
    business_case: '',
    scope_in: '',
    scope_out: '',
    success_metrics: [],
    milestones: [],
    team_assignments: [],
    status: 'draft',
    submitted_by: null,
    approved_by: null,
    submitted_at: null,
    approved_at: null,
    rejection_reason: null,
    ai_generated: false,
  }

  // Load profile
  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  // Load projects
  useEffect(() => {
    if (!userProfile?.company_id) return
    supabase
      .from('projects')
      .select('id, name, phase, health, type')
      .eq('company_id', userProfile.company_id)
      .not('status', 'eq', 'cancelled')
      .order('name')
      .then(({ data }) => {
        const list = data || []
        setProjects(list)
        if (list.length > 0) setSelectedProjectId(list[0].id)
        setLoading(false)
      })
  }, [userProfile])

  // Load charter for selected project
  const loadCharter = useCallback(async (projectId) => {
    if (!projectId || !userProfile?.company_id) return
    setCharterLoading(true)
    setSaveError('')
    const { data } = await supabase
      .from('project_charters')
      .select('*')
      .eq('project_id', projectId)
      .eq('company_id', userProfile.company_id)
      .maybeSingle()

    if (data) {
      setCharter(data)
      setCharterExists(true)
      // Load approver name if present
      if (data.approved_by) {
        supabase.from('profiles').select('full_name').eq('id', data.approved_by).single()
          .then(({ data: p }) => setApproverName(p?.full_name || 'Unknown'))
      }
    } else {
      setCharter({ ...emptyCharter })
      setCharterExists(false)
    }
    setCharterLoading(false)
  }, [userProfile?.company_id])

  useEffect(() => {
    if (selectedProjectId) loadCharter(selectedProjectId)
  }, [selectedProjectId, loadCharter])

  // Debounced auto-save on blur
  const scheduleAutoSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      handleSave(true)
    }, 1000)
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  // Generate AI Charter
  const generateAICharter = async () => {
    if (!selectedProject) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai-charter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            name: selectedProject.name,
            type: selectedProject.type,
            phase: selectedProject.phase,
          },
          intake: {},
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate charter')
      const c = data.charter
      setCharter(prev => ({
        ...prev,
        problem_statement: c.problem_statement || '',
        goal_statement: c.goal_statement || '',
        business_case: c.business_case || '',
        scope_in: c.scope_in || '',
        scope_out: c.scope_out || '',
        success_metrics: Array.isArray(c.success_metrics) ? c.success_metrics : [],
        milestones: Array.isArray(c.milestones) ? c.milestones : [],
        team_assignments: Array.isArray(c.team_assignments) ? c.team_assignments : [],
        ai_generated: true,
      }))
    } catch (err) {
      setSaveError(err.message || 'AI generation failed')
    }
    setAiLoading(false)
  }

  // Save charter
  const handleSave = async (silent = false) => {
    if (!charter || !selectedProjectId || !userProfile?.company_id) return
    if (!silent) setSaving(true)
    setSaveError('')

    const payload = {
      company_id: userProfile.company_id,
      project_id: selectedProjectId,
      problem_statement: charter.problem_statement || null,
      goal_statement: charter.goal_statement || null,
      business_case: charter.business_case || null,
      scope_in: charter.scope_in || null,
      scope_out: charter.scope_out || null,
      success_metrics: charter.success_metrics || [],
      milestones: charter.milestones || [],
      team_assignments: charter.team_assignments || [],
      status: charter.status || 'draft',
      submitted_by: charter.submitted_by || null,
      approved_by: charter.approved_by || null,
      submitted_at: charter.submitted_at || null,
      approved_at: charter.approved_at || null,
      rejection_reason: charter.rejection_reason || null,
      ai_generated: charter.ai_generated || false,
    }

    let error
    if (charterExists) {
      const res = await supabase
        .from('project_charters')
        .update(payload)
        .eq('project_id', selectedProjectId)
        .eq('company_id', userProfile.company_id)
      error = res.error
    } else {
      const res = await supabase
        .from('project_charters')
        .insert(payload)
        .select()
        .single()
      error = res.error
      if (!error) setCharterExists(true)
    }

    if (error && !silent) setSaveError(error.message)
    if (!silent) setSaving(false)
  }

  // Submit for approval
  const handleSubmit = async () => {
    setCharter(prev => ({
      ...prev,
      status: 'submitted',
      submitted_by: userProfile.id,
      submitted_at: new Date().toISOString(),
    }))
    setTimeout(() => handleSave(), 100)
  }

  // Approve
  const handleApprove = async () => {
    setCharter(prev => ({
      ...prev,
      status: 'approved',
      approved_by: userProfile.id,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    }))
    setApproverName(userProfile.full_name || 'You')
    setTimeout(() => handleSave(), 100)
  }

  // Reject
  const handleReject = async () => {
    if (!rejectionInput.trim()) return
    setCharter(prev => ({
      ...prev,
      status: 'rejected',
      rejection_reason: rejectionInput,
    }))
    setShowRejectInput(false)
    setRejectionInput('')
    setTimeout(() => handleSave(), 100)
  }

  // Revise (back to draft)
  const handleRevise = () => {
    setCharter(prev => ({
      ...prev,
      status: 'draft',
      rejection_reason: null,
    }))
    setTimeout(() => handleSave(), 100)
  }

  // Table helpers
  const updateMetric = (i, key, val) => {
    setCharter(prev => {
      const arr = [...(prev.success_metrics || [])]
      arr[i] = { ...arr[i], [key]: val }
      return { ...prev, success_metrics: arr }
    })
  }
  const deleteMetric = (i) => {
    setCharter(prev => ({ ...prev, success_metrics: prev.success_metrics.filter((_, idx) => idx !== i) }))
  }
  const addMetric = () => {
    setCharter(prev => ({ ...prev, success_metrics: [...(prev.success_metrics || []), { metric: '', target: '', baseline: '' }] }))
  }

  const updateMilestone = (i, key, val) => {
    setCharter(prev => {
      const arr = [...(prev.milestones || [])]
      arr[i] = { ...arr[i], [key]: val }
      return { ...prev, milestones: arr }
    })
  }
  const deleteMilestone = (i) => {
    setCharter(prev => ({ ...prev, milestones: prev.milestones.filter((_, idx) => idx !== i) }))
  }
  const addMilestone = () => {
    setCharter(prev => ({ ...prev, milestones: [...(prev.milestones || []), { name: '', description: '', weeks_from_start: '' }] }))
  }

  const updateTeam = (i, key, val) => {
    setCharter(prev => {
      const arr = [...(prev.team_assignments || [])]
      arr[i] = { ...arr[i], [key]: val }
      return { ...prev, team_assignments: arr }
    })
  }
  const deleteTeam = (i) => {
    setCharter(prev => ({ ...prev, team_assignments: prev.team_assignments.filter((_, idx) => idx !== i) }))
  }
  const addTeam = () => {
    setCharter(prev => ({ ...prev, team_assignments: [...(prev.team_assignments || []), { role: '', responsibilities: '' }] }))
  }

  const canApprove = userProfile?.role === 'owner' || userProfile?.role === 'program_leader'

  const isCharterEmpty = !charter?.problem_statement && !charter?.goal_statement && !charter?.business_case

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* Left sidebar — project list */}
      <div className="w-64 flex-shrink-0 border-r border-surface-border bg-white overflow-y-auto">
        <div className="px-4 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-brand-charcoal-dark">Projects</h2>
          <p className="text-xs text-brand-charcoal mt-0.5">Select a project to view its charter</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-brand-orange" />
          </div>
        ) : projects.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-brand-charcoal/50">
            No projects found
          </div>
        ) : (
          <div className="py-2">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`w-full text-left px-4 py-3 flex items-start gap-2 hover:bg-surface-secondary transition-colors ${
                  selectedProjectId === p.id ? 'bg-brand-orange/8 border-r-2 border-brand-orange' : ''
                }`}
              >
                <HealthDot health={p.health} className="mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${selectedProjectId === p.id ? 'text-brand-orange' : 'text-brand-charcoal-dark'}`}>
                    {p.name}
                  </p>
                  <p className="text-xs text-brand-charcoal/60 uppercase mt-0.5">{p.type}</p>
                </div>
                {selectedProjectId === p.id && <ChevronRight size={14} className="text-brand-orange flex-shrink-0 mt-0.5" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto bg-surface-secondary/30">
        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileCheck size={40} className="text-gray-300 mb-3" />
            <h3 className="text-base font-semibold text-brand-charcoal-dark mb-1">Select a project</h3>
            <p className="text-sm text-brand-charcoal/50">Choose a project from the left to view or create its charter</p>
          </div>
        ) : charterLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-brand-orange" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-6 space-y-6">

            {/* Page header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-brand-charcoal-dark">{selectedProject.name}</h2>
                <span className="text-xs px-2 py-0.5 bg-surface-secondary text-brand-charcoal rounded uppercase font-medium">{selectedProject.type}</span>
                <HealthDot health={selectedProject.health} />
                {charter && <StatusBadge status={charter.status} />}
              </div>
              <div className="flex items-center gap-2">
                {saveError && (
                  <span className="text-xs text-status-red flex items-center gap-1">
                    <AlertCircle size={12} /> {saveError}
                  </span>
                )}
                <button
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 text-sm py-1.5"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Charter
                </button>
              </div>
            </div>

            {/* AI Draft button */}
            {isCharterEmpty && (
              <div className="card flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold text-brand-charcoal-dark">No charter yet</p>
                  <p className="text-xs text-brand-charcoal mt-0.5">Generate an AI-powered draft based on your project details, or fill in the fields manually below.</p>
                </div>
                <button
                  onClick={generateAICharter}
                  disabled={aiLoading}
                  className="btn-primary flex items-center gap-2 text-sm py-1.5 flex-shrink-0 ml-4"
                >
                  {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {aiLoading ? 'Generating...' : 'Generate AI Charter Draft'}
                </button>
              </div>
            )}

            {/* Section 1 — Problem & Goal */}
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-brand-charcoal-dark border-b border-surface-border pb-2">Problem, Goal & Business Case</h3>
              <div>
                <label className="label">Problem Statement</label>
                <textarea
                  value={charter?.problem_statement || ''}
                  onChange={e => setCharter(prev => ({ ...prev, problem_statement: e.target.value }))}
                  onBlur={scheduleAutoSave}
                  rows={3}
                  className="input resize-none"
                  placeholder="What is the problem? What is the current state and its impact on the business?"
                />
              </div>
              <div>
                <label className="label">Goal Statement</label>
                <textarea
                  value={charter?.goal_statement || ''}
                  onChange={e => setCharter(prev => ({ ...prev, goal_statement: e.target.value }))}
                  onBlur={scheduleAutoSave}
                  rows={2}
                  className="input resize-none"
                  placeholder="SMART goal: specific, measurable, achievable, relevant, time-bound target"
                />
              </div>
              <div>
                <label className="label">Business Case</label>
                <textarea
                  value={charter?.business_case || ''}
                  onChange={e => setCharter(prev => ({ ...prev, business_case: e.target.value }))}
                  onBlur={scheduleAutoSave}
                  rows={2}
                  className="input resize-none"
                  placeholder="Why is this project important? What is the financial or strategic justification?"
                />
              </div>
            </div>

            {/* Section 2 — Scope */}
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-brand-charcoal-dark border-b border-surface-border pb-2">Scope</h3>
              <div>
                <label className="label">In Scope</label>
                <textarea
                  value={charter?.scope_in || ''}
                  onChange={e => setCharter(prev => ({ ...prev, scope_in: e.target.value }))}
                  onBlur={scheduleAutoSave}
                  rows={3}
                  className="input resize-none"
                  placeholder="What IS included in this project (processes, departments, locations, time periods)..."
                />
              </div>
              <div>
                <label className="label">Out of Scope</label>
                <textarea
                  value={charter?.scope_out || ''}
                  onChange={e => setCharter(prev => ({ ...prev, scope_out: e.target.value }))}
                  onBlur={scheduleAutoSave}
                  rows={3}
                  className="input resize-none"
                  placeholder="What is NOT included in this project..."
                />
              </div>
            </div>

            {/* Section 3 — Success Metrics */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-brand-charcoal-dark">Success Metrics</h3>
                <button onClick={addMetric} className="btn-secondary text-xs flex items-center gap-1 py-1">
                  <Plus size={12} /> Add Metric
                </button>
              </div>
              {(charter?.success_metrics || []).length === 0 ? (
                <p className="text-sm text-brand-charcoal/40 text-center py-4">No metrics yet — click "Add Metric" to get started</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-brand-charcoal/60 px-2 py-1.5">Metric</th>
                        <th className="text-left text-xs font-semibold text-brand-charcoal/60 px-2 py-1.5">Target</th>
                        <th className="text-left text-xs font-semibold text-brand-charcoal/60 px-2 py-1.5">Baseline</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(charter.success_metrics || []).map((row, i) => (
                        <EditableRow
                          key={i}
                          columns={[
                            { key: 'metric', placeholder: 'e.g. Cycle time' },
                            { key: 'target', placeholder: 'e.g. < 2 days' },
                            { key: 'baseline', placeholder: 'e.g. 5.3 days avg' },
                          ]}
                          row={row}
                          rowIndex={i}
                          onChange={updateMetric}
                          onDelete={deleteMetric}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 4 — Milestones */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-brand-charcoal-dark">Milestones</h3>
                <button onClick={addMilestone} className="btn-secondary text-xs flex items-center gap-1 py-1">
                  <Plus size={12} /> Add Milestone
                </button>
              </div>
              {(charter?.milestones || []).length === 0 ? (
                <p className="text-sm text-brand-charcoal/40 text-center py-4">No milestones yet — click "Add Milestone"</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-brand-charcoal/60 px-2 py-1.5">Milestone Name</th>
                        <th className="text-left text-xs font-semibold text-brand-charcoal/60 px-2 py-1.5">Description</th>
                        <th className="text-left text-xs font-semibold text-brand-charcoal/60 px-2 py-1.5 w-24">Weeks from Start</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(charter.milestones || []).map((row, i) => (
                        <EditableRow
                          key={i}
                          columns={[
                            { key: 'name', placeholder: 'e.g. Define complete' },
                            { key: 'description', placeholder: 'What will be done' },
                            { key: 'weeks_from_start', placeholder: '4', type: 'number' },
                          ]}
                          row={row}
                          rowIndex={i}
                          onChange={updateMilestone}
                          onDelete={deleteMilestone}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 5 — Team Assignments */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-brand-charcoal-dark">Team Assignments</h3>
                <button onClick={addTeam} className="btn-secondary text-xs flex items-center gap-1 py-1">
                  <Plus size={12} /> Add Role
                </button>
              </div>
              {(charter?.team_assignments || []).length === 0 ? (
                <p className="text-sm text-brand-charcoal/40 text-center py-4">No team roles yet — click "Add Role"</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-brand-charcoal/60 px-2 py-1.5 w-1/3">Role</th>
                        <th className="text-left text-xs font-semibold text-brand-charcoal/60 px-2 py-1.5">Responsibilities</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(charter.team_assignments || []).map((row, i) => (
                        <EditableRow
                          key={i}
                          columns={[
                            { key: 'role', placeholder: 'e.g. Project Lead' },
                            { key: 'responsibilities', placeholder: 'Key responsibilities...' },
                          ]}
                          row={row}
                          rowIndex={i}
                          onChange={updateTeam}
                          onDelete={deleteTeam}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Approval section */}
            <div className="card">
              <h3 className="text-sm font-semibold text-brand-charcoal-dark border-b border-surface-border pb-2 mb-4">Approval</h3>

              {charter?.status === 'draft' && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-brand-charcoal">Charter is in draft. Submit for review when ready.</p>
                  <button
                    onClick={handleSubmit}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <Clock size={14} />
                    Submit for Approval
                  </button>
                </div>
              )}

              {charter?.status === 'submitted' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-status-yellow">
                    <Clock size={16} />
                    <span className="text-sm font-medium">Awaiting approval</span>
                  </div>
                  {canApprove && !showRejectInput && (
                    <div className="flex gap-2">
                      <button onClick={handleApprove} className="flex items-center gap-2 text-sm px-4 py-2 bg-status-green text-white rounded-lg hover:bg-status-green/90 transition-colors">
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button onClick={() => setShowRejectInput(true)} className="flex items-center gap-2 text-sm px-4 py-2 bg-status-red text-white rounded-lg hover:bg-status-red/90 transition-colors">
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                  {showRejectInput && (
                    <div className="space-y-2">
                      <label className="label">Rejection reason</label>
                      <textarea
                        value={rejectionInput}
                        onChange={e => setRejectionInput(e.target.value)}
                        rows={2}
                        className="input resize-none"
                        placeholder="Explain why the charter needs revision..."
                      />
                      <div className="flex gap-2">
                        <button onClick={handleReject} disabled={!rejectionInput.trim()} className="flex items-center gap-2 text-sm px-4 py-2 bg-status-red text-white rounded-lg hover:bg-status-red/90 transition-colors disabled:opacity-50">
                          <XCircle size={14} /> Confirm Rejection
                        </button>
                        <button onClick={() => setShowRejectInput(false)} className="btn-secondary text-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {charter?.status === 'approved' && (
                <div className="flex items-center gap-3 p-3 bg-status-green-bg rounded-lg">
                  <CheckCircle2 size={18} className="text-status-green flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-status-green">Charter Approved</p>
                    <p className="text-xs text-status-green/80 mt-0.5">
                      Approved by {approverName || 'team lead'}
                      {charter.approved_at ? ` on ${new Date(charter.approved_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {charter?.status === 'rejected' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-status-red-bg rounded-lg">
                    <XCircle size={18} className="text-status-red flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-status-red">Charter Rejected</p>
                      {charter.rejection_reason && (
                        <p className="text-xs text-status-red/80 mt-0.5">{charter.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={handleRevise} className="btn-secondary text-sm">
                    Revise Charter
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
