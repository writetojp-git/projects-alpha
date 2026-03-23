import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Search, ChevronRight, Edit3, Save, X, AlertCircle,
  CheckCircle2, Clock, AlertTriangle, FolderOpen, Users,
  Calendar, DollarSign, TrendingUp, ChevronDown, Plus
} from 'lucide-react'

// ─── Template Phases by Project Type ───────────────────────────────────────
const TEMPLATE_PHASES = {
  dmaic: [
    { name: 'Define', sections: ['Project Charter', 'Problem Statement', 'Goal Statement', 'SIPOC Diagram', 'Voice of Customer (VOC)', 'Project Scope', 'Business Case', 'Team & Stakeholders', 'Tollgate Sign-off'] },
    { name: 'Measure', sections: ['Data Collection Plan', 'Process Map (Detailed)', 'Measurement System Analysis (MSA/Gage R&R)', 'Baseline Performance (Cpk, Sigma Level)', 'Process Capability Study', 'Tollgate Sign-off'] },
    { name: 'Analyze', sections: ['Fishbone / Ishikawa Diagram', '5-Why Analysis', 'Hypothesis Testing', 'Root Cause Validation', 'Pareto Analysis', 'Regression / ANOVA', 'Tollgate Sign-off'] },
    { name: 'Improve', sections: ['Solution Generation (Brainstorming)', 'Solution Selection Matrix', 'Failure Mode & Effects Analysis (FMEA)', 'Pilot Plan & Results', 'Cost-Benefit Analysis', 'Implementation Plan', 'Tollgate Sign-off'] },
    { name: 'Control', sections: ['Control Plan', 'Statistical Process Control (SPC) Setup', 'Standard Operating Procedures (SOPs)', 'Training Plan', 'Response Plan', 'Handover to Process Owner', 'Project Closure & Lessons Learned'] },
  ],
  dmadv: [
    { name: 'Define', sections: ['Project Charter', 'CTQ Requirements', 'Customer Segmentation', 'Business Case', 'Team Charter'] },
    { name: 'Measure', sections: ['Customer Requirements (VOC)', 'CTQ Translation Tree', 'Competitive Benchmarking', 'QFD / House of Quality'] },
    { name: 'Analyze', sections: ['Gap Analysis', 'Design Concepts', 'Concept Selection (Pugh Matrix)', 'Risk Assessment'] },
    { name: 'Design', sections: ['Detailed Design', 'Simulation & Modeling', 'Prototype Plan', 'FMEA for New Design', 'Pilot Plan'] },
    { name: 'Verify', sections: ['Pilot Results', 'Capability Verification', 'Production Readiness', 'Handover & Close'] },
  ],
  kaizen: [
    { name: 'Pre-Event', sections: ['Scope Definition', 'Team Selection', 'Data Collection (Pre-work)', 'Current State Documentation', 'Logistics Planning'] },
    { name: 'Day 1: Understand', sections: ['Event Kick-off', 'Current State Process Walk (Gemba)', 'Waste Identification', 'Current State VSM', 'Root Cause Analysis'] },
    { name: 'Day 2-3: Improve', sections: ['Future State Design', 'Solution Implementation', 'Standard Work Development', '5S Implementation', 'Visual Management'] },
    { name: 'Day 4-5: Sustain', sections: ['Pilot Validation', 'Training Delivery', 'Before/After Metrics', 'Action Item List (30/60/90 day)', 'Event Report-out'] },
    { name: 'Post-Event', sections: ['30-Day Follow-up Audit', 'Results Verification', 'Sustain Plan', 'Lessons Learned'] },
  ],
  lean: [
    { name: 'Current State', sections: ['Value Stream Selection', 'Current State VSM', 'Lead Time & Process Time Analysis', 'Value-Added vs Non-Value-Added Analysis', 'Waste Identification (8 Wastes)'] },
    { name: 'Future State', sections: ['Future State VSM Design', 'Takt Time Calculation', 'Pull System Design', 'Supermarket / Kanban Design', 'Improvement Opportunities'] },
    { name: 'Implementation', sections: ['Kaizen Burst Actions', 'Pilot Implementation', 'Lead Time Measurement', 'Flow Metrics (Cycle Time, WIP)', 'Visual Management'] },
    { name: 'Sustain', sections: ['Standard Work Documentation', 'KPI Dashboard', 'Audit Schedule', 'Management Review Cadence', 'Lessons Learned'] },
  ],
  general: [
    { name: 'Initiate', sections: ['Project Charter', 'Stakeholder Analysis', 'Requirements Gathering', 'Success Criteria'] },
    { name: 'Plan', sections: ['Work Breakdown Structure', 'Timeline & Milestones', 'Resource Plan', 'Risk Assessment'] },
    { name: 'Execute', sections: ['Task Tracking', 'Progress Updates', 'Issue Log', 'Change Requests'] },
    { name: 'Close', sections: ['Deliverable Verification', 'Lessons Learned', 'Final Report', 'Handover'] },
  ],
}

// ─── Phase Colors (cycling palette) ─────────────────────────────────────────
const PHASE_COLORS = [
  { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
]

const healthConfig = {
  green:  { label: 'On Track',  icon: CheckCircle2, cls: 'text-status-green' },
  yellow: { label: 'At Risk',   icon: AlertTriangle, cls: 'text-status-yellow' },
  red:    { label: 'Off Track', icon: AlertCircle,  cls: 'text-status-red' },
}

// ─── Helper Functions ──────────────────────────────────────────────────────

// Convert phase name to slugified ID
function slugifyPhase(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '')
}

// Get project phases with custom overrides from localStorage
function getProjectPhases(project) {
  const customKey = `project_phases_${project.id}`
  const custom = localStorage.getItem(customKey)
  if (custom) {
    try { return JSON.parse(custom) } catch {}
  }
  return TEMPLATE_PHASES[project.type] || TEMPLATE_PHASES.dmaic
}

// Get sections for a phase with custom overrides
function getPhasesSections(projectId, phaseId) {
  const customKey = `project_sections_${projectId}_${phaseId}`
  const custom = localStorage.getItem(customKey)
  if (custom) {
    try { return JSON.parse(custom) } catch {}
  }
  return []
}

// Get color for phase based on index
function getPhaseColor(index) {
  return PHASE_COLORS[index % PHASE_COLORS.length]
}

// Get phase index in project phases
function getPhaseIndex(project, phaseId) {
  const phases = getProjectPhases(project)
  return phases.findIndex(p => slugifyPhase(p.name) === phaseId)
}

// ─── Phase Progress Bar ───────────────────────────────────────────────────────
function PhaseProgress({ project, currentPhaseId }) {
  const phases = getProjectPhases(project)
  const currentIdx = getPhaseIndex(project, currentPhaseId)

  return (
    <div className="flex items-center gap-1">
      {phases.map((_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`h-1.5 rounded-full transition-all ${i <= currentIdx ? 'bg-brand-orange' : 'bg-surface-border'}`}
            style={{ width: i <= currentIdx ? '32px' : '24px' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Charter Section ──────────────────────────────────────────────────────────
function CharterSection({ section, note, projectId, companyId, userId, onSaved, phaseId }) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(note?.content || '')
  const [saving, setSaving] = useState(false)

  // For dynamic sections, use section name as label; for standard sections from templates, try to match
  const label = section
  const prompt = `Document your findings and notes for: ${section}`

  const handleSave = async () => {
    setSaving(true)
    if (note?.id) {
      await supabase.from('project_notes').update({ content, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', note.id)
    } else {
      await supabase.from('project_notes').insert({
        project_id: projectId, company_id: companyId,
        phase: phaseId, section, title: label, content, created_by: userId, updated_by: userId,
      })
    }
    setSaving(false)
    setEditing(false)
    onSaved()
  }

  return (
    <div className="border border-surface-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary">
        <span className="text-sm font-semibold text-brand-charcoal-dark">{label}</span>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-brand-charcoal hover:text-brand-orange transition-colors">
            <Edit3 size={12} /> {note?.content ? 'Edit' : 'Add'}
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-xs text-brand-orange font-medium hover:text-brand-orange/80">
              {saving ? '...' : <><Save size={12} /> Save</>}
            </button>
            <button onClick={() => { setEditing(false); setContent(note?.content || '') }} className="text-xs text-brand-charcoal hover:text-brand-charcoal-dark">
              <X size={12} />
            </button>
          </div>
        )}
      </div>
      <div className="p-4">
        {editing ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={prompt}
            className="w-full text-sm text-brand-charcoal-dark resize-none focus:outline-none min-h-[120px] placeholder:text-brand-charcoal/40"
            autoFocus
          />
        ) : note?.content ? (
          <p className="text-sm text-brand-charcoal-dark whitespace-pre-wrap leading-relaxed">{note.content}</p>
        ) : (
          <p className="text-sm text-brand-charcoal/50 italic">{prompt}</p>
        )}
      </div>
    </div>
  )
}

// ─── Project Detail Panel ─────────────────────────────────────────────────────
function ProjectDetail({ project, userId, userRole, onProjectUpdated }) {
  const [activePhaseId, setActivePhaseId] = useState(null)
  const [phases, setPhases] = useState([])
  const [notes, setNotes] = useState([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [notesError, setNotesError] = useState('')
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ health: project.health, phase: project.phase, target_date: project.target_date || '' })
  const [savingHeader, setSavingHeader] = useState(false)

  // Initialize phases and active phase
  useEffect(() => {
    const projectPhases = getProjectPhases(project)
    setPhases(projectPhases)

    // Set active phase: either the current project phase or the first phase
    const currentPhaseId = project.phase ? slugifyPhase(project.phase) : (projectPhases.length > 0 ? slugifyPhase(projectPhases[0].name) : null)
    setActivePhaseId(currentPhaseId)
  }, [project.id, project.type, project.phase])

  const fetchNotes = useCallback(async () => {
    setNotesLoading(true)
    setNotesError('')
    const { data, error } = await supabase
      .from('project_notes')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true })
    if (error) {
      if (error.message?.includes('does not exist')) {
        setNotesError('migration_needed')
      } else {
        setNotesError(error.message)
      }
    } else {
      setNotes(data || [])
    }
    setNotesLoading(false)
  }, [project.id])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleSaveHeader = async () => {
    setSavingHeader(true)
    await supabase.from('projects').update({
      health: headerForm.health,
      phase: headerForm.phase,
      target_date: headerForm.target_date || null,
    }).eq('id', project.id)
    setSavingHeader(false)
    setEditingHeader(false)
    onProjectUpdated()
  }

  // Get sections for active phase
  const activePhase = phases.find(p => slugifyPhase(p.name) === activePhaseId)
  const sections = activePhase?.sections || []
  const customSections = getPhasesSections(project.id, activePhaseId)
  const allSections = [...sections, ...customSections]

  const currentPhaseIdx = getPhaseIndex(project, project.phase)
  const H = healthConfig[project.health] || healthConfig.green
  const HIcon = H.icon

  // Check if user can edit phases/sections
  const canEdit = ['owner', 'program_leader', 'project_manager'].includes(userRole)

  const handleAddPhase = () => {
    const name = prompt('Enter phase name:')
    if (!name) return

    const newPhases = [...phases, { name, sections: [] }]
    const customKey = `project_phases_${project.id}`
    localStorage.setItem(customKey, JSON.stringify(newPhases))
    setPhases(newPhases)
  }

  const handleRemovePhase = (index) => {
    if (!confirm('Remove this phase? This cannot be undone.')) return
    const newPhases = phases.filter((_, i) => i !== index)
    const customKey = `project_phases_${project.id}`
    localStorage.setItem(customKey, JSON.stringify(newPhases))
    setPhases(newPhases)
    if (activePhaseId === slugifyPhase(phases[index].name)) {
      setActivePhaseId(newPhases.length > 0 ? slugifyPhase(newPhases[0].name) : null)
    }
  }

  const handleAddSection = () => {
    const name = prompt('Enter section name:')
    if (!name) return

    const customKey = `project_sections_${project.id}_${activePhaseId}`
    const current = JSON.parse(localStorage.getItem(customKey) || '[]')
    current.push(name)
    localStorage.setItem(customKey, JSON.stringify(current))
    // Trigger re-render by forcing state update
    setActivePhaseId(activePhaseId)
  }

  const handleRemoveSection = (section) => {
    if (!confirm('Remove this section?')) return

    const customKey = `project_sections_${project.id}_${activePhaseId}`
    const current = JSON.parse(localStorage.getItem(customKey) || '[]')
    const filtered = current.filter(s => s !== section)
    localStorage.setItem(customKey, JSON.stringify(filtered))
    // Trigger re-render
    setActivePhaseId(activePhaseId)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Project Header */}
      <div className="p-6 border-b border-surface-border bg-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-brand-charcoal-dark leading-tight">{project.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs px-2 py-0.5 bg-surface-secondary text-brand-charcoal rounded-full capitalize font-medium">{project.type?.toUpperCase()}</span>
              <HIcon size={14} className={H.cls} />
              <span className={`text-xs font-medium ${H.cls}`}>{H.label}</span>
              {project.estimated_savings > 0 && (
                <span className="text-xs text-status-green font-medium flex items-center gap-1">
                  <DollarSign size={11} />{Number(project.estimated_savings).toLocaleString()} estimated
                </span>
              )}
            </div>
          </div>
          {canEdit && (
            <button onClick={() => setEditingHeader(!editingHeader)} className="btn-secondary text-xs ml-4 flex items-center gap-1">
              <Edit3 size={12} /> Edit
            </button>
          )}
        </div>

        {editingHeader && (
          <div className="flex items-end gap-3 p-4 bg-surface-secondary rounded-lg mb-4">
            <div>
              <label className="label">Phase</label>
              <select value={headerForm.phase} onChange={e => setHeaderForm(f => ({ ...f, phase: e.target.value }))} className="input text-sm py-1.5">
                {phases.map((p, i) => {
                  const phaseId = slugifyPhase(p.name)
                  return <option key={phaseId} value={phaseId}>{p.name}</option>
                })}
              </select>
            </div>
            <div>
              <label className="label">Health</label>
              <select value={headerForm.health} onChange={e => setHeaderForm(f => ({ ...f, health: e.target.value }))} className="input text-sm py-1.5">
                <option value="green">On Track</option>
                <option value="yellow">At Risk</option>
                <option value="red">Off Track</option>
              </select>
            </div>
            <div>
              <label className="label">Target Date</label>
              <input type="date" value={headerForm.target_date} onChange={e => setHeaderForm(f => ({ ...f, target_date: e.target.value }))} className="input text-sm py-1.5" />
            </div>
            <button onClick={handleSaveHeader} disabled={savingHeader} className="btn-primary text-xs px-3 py-1.5">{savingHeader ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditingHeader(false)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
          </div>
        )}

        {/* Phase Progress */}
        <div className="flex items-center gap-2 flex-wrap">
          {phases.map((phase, i) => {
            const phaseId = slugifyPhase(phase.name)
            const phaseColor = getPhaseColor(i)
            const isPast = i < currentPhaseIdx
            const isCurrent = i === currentPhaseIdx
            const isFuture = i > currentPhaseIdx
            return (
              <div key={phaseId} className="flex items-center gap-2">
                <button
                  onClick={() => setActivePhaseId(phaseId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    activePhaseId === phaseId
                      ? `${phaseColor.bg} ${phaseColor.color} ${phaseColor.border} shadow-sm`
                      : isCurrent
                      ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/30'
                      : isPast
                      ? 'bg-surface-secondary text-brand-charcoal border-surface-border'
                      : 'bg-white text-brand-charcoal/50 border-surface-border'
                  }`}
                >
                  {isPast && <CheckCircle2 size={11} className="text-status-green" />}
                  {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />}
                  {phase.name}
                </button>
                {i < phases.length - 1 && <ChevronRight size={12} className="text-brand-charcoal/30" />}
              </div>
            )
          })}
          {canEdit && (
            <button
              onClick={handleAddPhase}
              className="ml-2 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-surface-secondary text-brand-charcoal border border-surface-border hover:bg-surface-border transition-colors"
            >
              <Plus size={12} /> Add Phase
            </button>
          )}
        </div>
      </div>

      {/* Charter Sections */}
      <div className={`p-6 space-y-4 min-h-full ${activePhase ? getPhaseColor(phases.findIndex(p => slugifyPhase(p.name) === activePhaseId)).bg : 'bg-white'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-sm font-semibold ${activePhase ? getPhaseColor(phases.findIndex(p => slugifyPhase(p.name) === activePhaseId)).color : 'text-brand-charcoal'}`}>
            {activePhase?.name} Phase — Charter Sections
          </span>
        </div>

        {notesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
          </div>
        ) : notesError === 'migration_needed' ? (
          <div className="p-5 bg-white border border-status-yellow rounded-lg">
            <div className="flex items-center gap-2 text-status-yellow font-semibold mb-2"><AlertCircle size={16} /> Database Migration Required</div>
            <p className="text-sm text-brand-charcoal">Run <strong>002_tasks_and_notes.sql</strong> in your Supabase SQL Editor to enable charter sections.</p>
          </div>
        ) : notesError ? (
          <div className="p-4 bg-status-red-bg text-status-red rounded-lg text-sm flex items-center gap-2"><AlertCircle size={15}/> {notesError}</div>
        ) : (
          <div className="space-y-3">
            {allSections.map((section, i) => {
              const note = notes.find(n => n.section === section && n.phase === activePhaseId)
              const isCustom = customSections.includes(section)
              return (
                <div key={i} className="relative">
                  {canEdit && isCustom && (
                    <button
                      onClick={() => handleRemoveSection(section)}
                      className="absolute top-2 right-2 z-10 p-1 text-brand-charcoal/50 hover:text-status-red transition-colors"
                      title="Remove section"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <CharterSection
                    key={section}
                    section={section}
                    note={note}
                    projectId={project.id}
                    companyId={project.company_id}
                    userId={userId}
                    onSaved={fetchNotes}
                    phaseId={activePhaseId}
                  />
                </div>
              )
            })}
            {canEdit && (
              <button
                onClick={handleAddSection}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-surface-border bg-white hover:bg-surface-secondary transition-colors"
              >
                <Plus size={14} /> Add Section
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Workspace() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [healthFilter, setHealthFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  const fetchProjects = useCallback(async (profile) => {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', profile.company_id)
      .not('status', 'eq', 'cancelled')
      .order('updated_at', { ascending: false })
    const list = data || []
    setProjects(list)
    if (!selectedProject && list.length > 0) setSelectedProject(list[0])
    if (selectedProject) {
      const refreshed = list.find(p => p.id === selectedProject.id)
      if (refreshed) setSelectedProject(refreshed)
    }
    setLoading(false)
  }, [selectedProject])

  useEffect(() => {
    if (userProfile?.company_id) fetchProjects(userProfile)
  }, [userProfile])

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchHealth = healthFilter === 'all' || p.health === healthFilter
    return matchSearch && matchHealth
  })

  const H = (h) => healthConfig[h] || healthConfig.green

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 64px)' }}>
      {/* ── Left sidebar: project list ── */}
      <div className="w-72 flex-shrink-0 border-r border-surface-border bg-white flex flex-col">
        <div className="p-4 border-b border-surface-border">
          <h1 className="text-base font-bold text-brand-charcoal-dark mb-3">Workspace</h1>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-charcoal/50" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="input pl-8 py-1.5 text-sm" />
          </div>
          <select value={healthFilter} onChange={e => setHealthFilter(e.target.value)} className="input text-xs py-1.5">
            <option value="all">All Health</option>
            <option value="green">On Track</option>
            <option value="yellow">At Risk</option>
            <option value="red">Off Track</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-4 h-4 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <FolderOpen size={28} className="mx-auto text-brand-charcoal/30 mb-2" />
              <p className="text-sm text-brand-charcoal">No projects found</p>
            </div>
          ) : (
            filtered.map(p => {
              const hi = H(p.health)
              const HIcon = hi.icon
              const isSelected = selectedProject?.id === p.id
              const projectPhases = getProjectPhases(p)
              const phaseId = p.phase ? slugifyPhase(p.phase) : (projectPhases.length > 0 ? slugifyPhase(projectPhases[0].name) : null)
              const phaseDef = projectPhases.find(ph => slugifyPhase(ph.name) === phaseId)
              const phaseColorIdx = projectPhases.findIndex(ph => slugifyPhase(ph.name) === phaseId)
              const phaseColor = phaseColorIdx >= 0 ? getPhaseColor(phaseColorIdx) : null

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={`w-full text-left px-4 py-3.5 border-b border-surface-border transition-colors ${isSelected ? 'bg-brand-orange/5 border-l-2 border-l-brand-orange' : 'hover:bg-surface-secondary/50'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-brand-charcoal-dark leading-snug line-clamp-2">{p.name}</span>
                    <HIcon size={13} className={`${hi.cls} flex-shrink-0 mt-0.5`} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {phaseColor && phaseDef && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${phaseColor.bg} ${phaseColor.color}`}>{phaseDef.name}</span>
                    )}
                    <span className="text-xs text-brand-charcoal uppercase">{p.type}</span>
                  </div>
                  {p.target_date && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-brand-charcoal">
                      <Calendar size={10} /> {new Date(p.target_date).toLocaleDateString()}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right: Project Detail ── */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {!selectedProject ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FolderOpen size={40} className="mx-auto text-brand-charcoal/20 mb-3" />
              <p className="text-brand-charcoal font-medium">Select a project to view its charter</p>
              <p className="text-sm text-brand-charcoal/60 mt-1">Click any project from the left panel</p>
            </div>
          </div>
        ) : (
          <ProjectDetail
            project={selectedProject}
            userId={userProfile?.id}
            userRole={userProfile?.role}
            onProjectUpdated={() => fetchProjects(userProfile)}
          />
        )}
      </div>
    </div>
  )
}
