import { useState, useEffect } from 'react'
import {
  FileText, X, ChevronRight, BookOpen, BarChart3,
  Zap, Leaf, Users, ClipboardList, Search, Tag, Plus, Trash2, Edit3
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// ─── Template Data ────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'dmaic-full',
    name: 'DMAIC Full Project',
    category: 'DMAIC',
    type: 'dmaic',
    icon: BarChart3,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    headerColor: 'bg-blue-600',
    description: 'Complete Define-Measure-Analyze-Improve-Control framework for process improvement projects targeting measurable defect or efficiency reduction.',
    useFor: 'Use when: existing process needs improvement and you can measure defects or performance gaps.',
    phases: [
      {
        name: 'Define',
        sections: ['Project Charter', 'Problem Statement', 'Goal Statement', 'SIPOC Diagram', 'Voice of Customer (VOC)', 'Project Scope', 'Business Case', 'Team & Stakeholders', 'Tollgate Sign-off'],
      },
      {
        name: 'Measure',
        sections: ['Data Collection Plan', 'Process Map (Detailed)', 'Measurement System Analysis (MSA/Gage R&R)', 'Baseline Performance (Cpk, Sigma Level)', 'Process Capability Study', 'Tollgate Sign-off'],
      },
      {
        name: 'Analyze',
        sections: ['Fishbone / Ishikawa Diagram', '5-Why Analysis', 'Hypothesis Testing', 'Root Cause Validation', 'Pareto Analysis', 'Regression / ANOVA', 'Tollgate Sign-off'],
      },
      {
        name: 'Improve',
        sections: ['Solution Generation (Brainstorming)', 'Solution Selection Matrix', 'Failure Mode & Effects Analysis (FMEA)', 'Pilot Plan & Results', 'Cost-Benefit Analysis', 'Implementation Plan', 'Tollgate Sign-off'],
      },
      {
        name: 'Control',
        sections: ['Control Plan', 'Statistical Process Control (SPC) Setup', 'Standard Operating Procedures (SOPs)', 'Training Plan', 'Response Plan', 'Handover to Process Owner', 'Project Closure & Lessons Learned'],
      },
    ],
  },
  {
    id: 'dmadv',
    name: 'DMADV / Design for Six Sigma',
    category: 'DMAIC',
    type: 'dmadv',
    icon: BarChart3,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    headerColor: 'bg-indigo-600',
    description: 'Define-Measure-Analyze-Design-Verify framework for creating new processes or products to Six Sigma standards.',
    useFor: 'Use when: creating a new process, product, or service from scratch rather than improving an existing one.',
    phases: [
      { name: 'Define',   sections: ['Project Charter', 'CTQ Requirements', 'Customer Segmentation', 'Business Case', 'Team Charter'] },
      { name: 'Measure',  sections: ['Customer Requirements (VOC)', 'CTQ Translation Tree', 'Competitive Benchmarking', 'QFD / House of Quality'] },
      { name: 'Analyze',  sections: ['Gap Analysis', 'Design Concepts', 'Concept Selection (Pugh Matrix)', 'Risk Assessment'] },
      { name: 'Design',   sections: ['Detailed Design', 'Simulation & Modeling', 'Prototype Plan', 'FMEA for New Design', 'Pilot Plan'] },
      { name: 'Verify',   sections: ['Pilot Results', 'Capability Verification', 'Production Readiness', 'Handover & Close'] },
    ],
  },
  {
    id: 'kaizen',
    name: 'Kaizen Event (Rapid Improvement)',
    category: 'Kaizen',
    type: 'kaizen',
    icon: Zap,
    color: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    headerColor: 'bg-yellow-500',
    description: '3-to-5-day rapid improvement event focused on a specific process area with a cross-functional team implementing changes in real-time.',
    useFor: 'Use when: you need fast results (days not months), the solution is known or discoverable, and the team is available full-time during the event.',
    phases: [
      { name: 'Pre-Event (Week -2)', sections: ['Scope Definition', 'Team Selection', 'Data Collection (Pre-work)', 'Current State Documentation', 'Logistics Planning'] },
      { name: 'Day 1: Understand',   sections: ['Event Kick-off', 'Current State Process Walk (Gemba)', 'Waste Identification', 'Current State VSM', 'Root Cause Analysis'] },
      { name: 'Day 2-3: Improve',    sections: ['Future State Design', 'Solution Implementation', 'Standard Work Development', '5S Implementation', 'Visual Management'] },
      { name: 'Day 4-5: Sustain',    sections: ['Pilot Validation', 'Training Delivery', 'Before/After Metrics', 'Action Item List (30/60/90 day)', 'Event Report-out'] },
      { name: 'Post-Event (30-Day)', sections: ['30-Day Follow-up Audit', 'Results Verification', 'Sustain Plan', 'Lessons Learned'] },
    ],
  },
  {
    id: 'lean-vsm',
    name: 'Lean / Value Stream Mapping',
    category: 'Lean',
    type: 'lean',
    icon: Leaf,
    color: 'bg-green-50 text-green-600 border-green-200',
    headerColor: 'bg-green-600',
    description: 'Value stream mapping and waste elimination framework to reduce lead time and improve flow across a value stream.',
    useFor: 'Use when: lead time reduction, flow improvement, or elimination of non-value-added steps is the primary goal.',
    phases: [
      { name: 'Current State',   sections: ['Value Stream Selection', 'Current State VSM', 'Lead Time & Process Time Analysis', 'Value-Added vs Non-Value-Added Analysis', 'Waste Identification (8 Wastes)'] },
      { name: 'Future State',    sections: ['Future State VSM Design', 'Takt Time Calculation', 'Pull System Design', 'Supermarket / Kanban Design', 'Improvement Opportunities'] },
      { name: 'Implementation',  sections: ['Kaizen Burst Actions', 'Pilot Implementation', 'Lead Time Measurement', 'Flow Metrics (Cycle Time, WIP)', 'Visual Management'] },
      { name: 'Sustain',         sections: ['Standard Work Documentation', 'KPI Dashboard', 'Audit Schedule', 'Management Review Cadence', 'Lessons Learned'] },
    ],
  },
  {
    id: 'a3',
    name: 'A3 Problem Solving',
    category: 'Lean',
    type: 'lean',
    icon: FileText,
    color: 'bg-teal-50 text-teal-600 border-teal-200',
    headerColor: 'bg-teal-600',
    description: 'Toyota-originated single-page problem solving format (A3 paper size). Structures the full PDCA cycle on one page for visual storytelling.',
    useFor: 'Use when: communicating a problem and its solution to leadership on a single page, or for smaller scope improvements.',
    phases: [
      { name: 'Left Side (Plan)',    sections: ['Title & Owner', 'Background / Business Context', 'Current Condition (with data & visuals)', 'Goal / Target Condition', 'Root Cause Analysis'] },
      { name: 'Right Side (Do-Check-Act)', sections: ['Countermeasures / Actions', 'Implementation Plan (Who/What/When)', 'Results & Verification', 'Follow-up Actions', 'Lessons Learned'] },
    ],
  },
  {
    id: 'gemba-walk',
    name: 'Gemba Walk Checklist',
    category: 'Lean',
    type: 'lean',
    icon: Users,
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    headerColor: 'bg-orange-500',
    description: 'Structured leadership observation checklist for Gemba walks — going to where work happens to observe, ask questions, and identify improvement opportunities.',
    useFor: 'Use when: conducting structured floor/workplace observation walks with leadership or improvement teams.',
    phases: [
      { name: 'Preparation',    sections: ['Purpose / Focus Area', 'Team & Roles', 'Questions to Investigate', 'Metrics to Review'] },
      { name: 'During Walk',    sections: ['Safety Observations', 'Standard Work Adherence', '5S Status', 'Visual Management Review', 'Waste Observations', 'Team Engagement Notes'] },
      { name: 'Debrief',        sections: ['Key Findings', 'Immediate Actions (Quick Wins)', '30-Day Action Items', 'Follow-up Schedule'] },
    ],
  },
  {
    id: 'sipoc',
    name: 'SIPOC Diagram',
    category: 'Tools',
    type: 'general',
    icon: ClipboardList,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    headerColor: 'bg-purple-600',
    description: 'Suppliers-Inputs-Process-Outputs-Customers high-level process definition tool. Defines boundaries and key elements of a process at the macro level.',
    useFor: 'Use at project kick-off to align the team on what process is being improved and who the customers are.',
    phases: [
      { name: 'SIPOC Components', sections: ['Suppliers (who provides inputs)', 'Inputs (what enters the process)', 'Process (high-level steps: 4-7 boxes)', 'Outputs (what leaves the process)', 'Customers (who receives outputs)', 'Customer Requirements (CTQs)'] },
    ],
  },
  {
    id: 'control-plan',
    name: 'Control Plan Template',
    category: 'Tools',
    type: 'general',
    icon: ClipboardList,
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    headerColor: 'bg-gray-600',
    description: 'Structured document specifying what process parameters to control, how to control them, who is responsible, and what to do when controls go out of range.',
    useFor: 'Use in the Control phase of DMAIC to formalize how improvements will be sustained long-term.',
    phases: [
      { name: 'Control Plan Sections', sections: ['Process Step', 'Process Parameter / Input', 'Product / Output Characteristic', 'Specification / Target', 'Measurement Method', 'Sample Size & Frequency', 'Control Method (SPC Chart, Poka-Yoke, etc.)', 'Responsible Party', 'Reaction Plan (if out of control)', 'Related SOP / Work Instruction'] },
    ],
  },
]

const CATEGORIES = ['All', 'DMAIC', 'Kaizen', 'Lean', 'Tools', 'Custom']

// Map icon names to components (for serialization to/from localStorage)
const ICON_MAP = {
  BarChart3,
  Zap,
  Leaf,
  Users,
  ClipboardList,
  FileText,
}

// Export for use by Workspace
export const DEFAULT_TEMPLATES = TEMPLATES

export function getTemplatePhases(projectType, companyId) {
  // Check localStorage for overrides first
  const overrideKey = `template_override_${projectType}_${companyId}`
  const override = localStorage.getItem(overrideKey)
  if (override) {
    try { return JSON.parse(override) } catch {}
  }
  // Fall back to default
  const template = TEMPLATES.find(t => t.type === projectType)
  return template ? template.phases : TEMPLATES[0].phases
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({ template, onClick, isCustom }) {
  const Icon = template.icon
  const totalSections = template.phases.reduce((a, p) => a + p.sections.length, 0)
  return (
    <button
      onClick={onClick}
      className={`card text-left hover:shadow-md transition-all hover:border-brand-orange/30 border ${template.color} group`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${template.color}`}>
          <Icon size={18} />
        </div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${template.color}`}>{template.category}</span>
      </div>
      <h3 className="font-semibold text-brand-charcoal-dark mb-1.5 text-sm leading-snug group-hover:text-brand-orange transition-colors">{template.name}</h3>
      <p className="text-xs text-brand-charcoal line-clamp-3 mb-3">{template.description}</p>
      <div className="flex items-center gap-3 text-xs text-brand-charcoal">
        <span>{template.phases.length} phases</span>
        <span className="text-brand-charcoal/40">·</span>
        <span>{totalSections} sections</span>
        {isCustom && <span className="text-brand-orange font-medium ml-auto">Custom</span>}
        <ChevronRight size={12} className="ml-auto text-brand-charcoal/40 group-hover:text-brand-orange transition-colors" />
      </div>
    </button>
  )
}

// ─── Create Template Modal ─────────────────────────────────────────────────────
function CreateTemplateModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Custom',
    type: 'general',
    phases: [{ name: '', sections: [] }],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addPhase = () => {
    setForm(f => ({
      ...f,
      phases: [...f.phases, { name: '', sections: [] }],
    }))
  }

  const deletePhase = (idx) => {
    setForm(f => ({
      ...f,
      phases: f.phases.filter((_, i) => i !== idx),
    }))
  }

  const updatePhase = (idx, name) => {
    setForm(f => ({
      ...f,
      phases: f.phases.map((p, i) => i === idx ? { ...p, name } : p),
    }))
  }

  const addSection = (phaseIdx) => {
    setForm(f => ({
      ...f,
      phases: f.phases.map((p, i) => i === phaseIdx ? { ...p, sections: [...p.sections, ''] } : p),
    }))
  }

  const deleteSection = (phaseIdx, secIdx) => {
    setForm(f => ({
      ...f,
      phases: f.phases.map((p, i) => i === phaseIdx ? { ...p, sections: p.sections.filter((_, j) => j !== secIdx) } : p),
    }))
  }

  const updateSection = (phaseIdx, secIdx, value) => {
    setForm(f => ({
      ...f,
      phases: f.phases.map((p, i) => i === phaseIdx ? { ...p, sections: p.sections.map((s, j) => j === secIdx ? value : s) } : p),
    }))
  }

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) {
      setError('Template name is required')
      return
    }
    if (form.phases.length === 0 || form.phases.some(p => !p.name.trim())) {
      setError('All phases must have a name')
      return
    }

    setSaving(true)
    try {
      const templateId = `custom-${Date.now()}`
      const customTemplate = {
        id: templateId,
        name: form.name,
        description: form.description,
        category: form.category,
        type: form.type,
        icon: ClipboardList,
        iconName: 'ClipboardList',
        color: 'bg-gray-50 text-gray-600 border-gray-200',
        headerColor: 'bg-gray-600',
        useFor: form.description || 'Custom template',
        phases: form.phases,
        isCustom: true,
      }

      // Try to save to DB, fallback to localStorage
      try {
        const { error: dbError } = await supabase.from('custom_templates').insert({
          id: templateId,
          name: form.name,
          description: form.description,
          category: form.category,
          type: form.type,
          phases: form.phases,
        })
        if (dbError && dbError.code !== '42P01') throw dbError // Ignore "table doesn't exist" error
      } catch (err) {
        // Table doesn't exist, save to localStorage
        const existing = JSON.parse(localStorage.getItem('custom_templates') || '[]')
        existing.push(customTemplate)
        localStorage.setItem('custom_templates', JSON.stringify(existing))
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <h2 className="text-lg font-bold text-brand-charcoal-dark">Create Custom Template</h2>
          <button onClick={onClose} className="text-brand-charcoal/50 hover:text-brand-charcoal transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-status-red-bg text-status-red text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <tag size={14} />
              {error}
            </div>
          )}

          <div>
            <label className="label">Template Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Cost Reduction Initiative"
              className="input"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
              className="input min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="input"
              >
                <option>DMAIC</option>
                <option>Kaizen</option>
                <option>Lean</option>
                <option>Tools</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <label className="label">Project Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="input"
              >
                <option value="dmaic">DMAIC</option>
                <option value="dmadv">DMADV</option>
                <option value="kaizen">Kaizen</option>
                <option value="lean">Lean</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold text-brand-charcoal-dark">Phases</label>
              <button
                onClick={addPhase}
                className="flex items-center gap-1.5 text-sm text-brand-orange hover:text-brand-orange/80 font-medium transition-colors"
              >
                <Plus size={14} /> Add Phase
              </button>
            </div>
            <div className="space-y-4">
              {form.phases.map((phase, phaseIdx) => (
                <div key={phaseIdx} className="border border-surface-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={phase.name}
                      onChange={e => updatePhase(phaseIdx, e.target.value)}
                      placeholder="Phase name"
                      className="input flex-1 text-sm"
                    />
                    <button
                      onClick={() => deletePhase(phaseIdx)}
                      className="text-status-red hover:text-status-red/80 transition-colors"
                      disabled={form.phases.length === 1}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-2 ml-2 border-l-2 border-surface-border pl-3">
                    {phase.sections.map((section, secIdx) => (
                      <div key={secIdx} className="flex items-center gap-2">
                        <input
                          value={section}
                          onChange={e => updateSection(phaseIdx, secIdx, e.target.value)}
                          placeholder="Section name"
                          className="input flex-1 text-sm"
                        />
                        <button
                          onClick={() => deleteSection(phaseIdx, secIdx)}
                          className="text-status-red hover:text-status-red/80 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addSection(phaseIdx)}
                      className="flex items-center gap-1.5 text-xs text-brand-charcoal/60 hover:text-brand-orange transition-colors mt-2"
                    >
                      <Plus size={12} /> Add Section
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-surface-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Template Modal ───────────────────────────────────────────────────────
function EditTemplateModal({ template, onClose, onSaved, isCustom, isSystemTemplate }) {
  const [phases, setPhases] = useState(template.phases)
  const [saving, setSaving] = useState(false)

  const addPhase = () => {
    setPhases(p => [...p, { name: '', sections: [] }])
  }

  const deletePhase = (idx) => {
    setPhases(p => p.filter((_, i) => i !== idx))
  }

  const updatePhaseName = (idx, name) => {
    setPhases(p => p.map((ph, i) => i === idx ? { ...ph, name } : ph))
  }

  const addSection = (phaseIdx) => {
    setPhases(p => p.map((ph, i) => i === phaseIdx ? { ...ph, sections: [...ph.sections, ''] } : ph))
  }

  const deleteSection = (phaseIdx, secIdx) => {
    setPhases(p => p.map((ph, i) => i === phaseIdx ? { ...ph, sections: ph.sections.filter((_, j) => j !== secIdx) } : ph))
  }

  const updateSection = (phaseIdx, secIdx, value) => {
    setPhases(p => p.map((ph, i) => i === phaseIdx ? { ...ph, sections: ph.sections.map((s, j) => j === secIdx ? value : s) } : ph))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isCustom) {
        // Save custom template to localStorage
        const existing = JSON.parse(localStorage.getItem('custom_templates') || '[]')
        const idx = existing.findIndex(t => t.id === template.id)
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], phases }
          localStorage.setItem('custom_templates', JSON.stringify(existing))
        }
      } else if (isSystemTemplate) {
        // Save system template override to localStorage
        const user = JSON.parse(localStorage.getItem('auth_user') || '{}')
        const companyId = user.company_id || 'default'
        const overrideKey = `template_override_${template.id}_${companyId}`
        localStorage.setItem(overrideKey, JSON.stringify(phases))
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error('Error saving template:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <h2 className="text-lg font-bold text-brand-charcoal-dark">Edit Template: {template.name}</h2>
          <button onClick={onClose} className="text-brand-charcoal/50 hover:text-brand-charcoal transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-brand-charcoal-dark">Phases</h3>
            <button
              onClick={addPhase}
              className="flex items-center gap-1.5 text-sm text-brand-orange hover:text-brand-orange/80 font-medium transition-colors"
            >
              <Plus size={14} /> Add Phase
            </button>
          </div>

          <div className="space-y-4">
            {phases.map((phase, phaseIdx) => (
              <div key={phaseIdx} className="border border-surface-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={phase.name}
                    onChange={e => updatePhaseName(phaseIdx, e.target.value)}
                    placeholder="Phase name"
                    className="input flex-1 text-sm font-semibold"
                  />
                  <button
                    onClick={() => deletePhase(phaseIdx)}
                    className="text-status-red hover:text-status-red/80 transition-colors"
                    disabled={phases.length === 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-2 ml-2 border-l-2 border-surface-border pl-3">
                  {phase.sections.map((section, secIdx) => (
                    <div key={secIdx} className="flex items-center gap-2">
                      <input
                        value={section}
                        onChange={e => updateSection(phaseIdx, secIdx, e.target.value)}
                        placeholder="Section name"
                        className="input flex-1 text-sm"
                      />
                      <button
                        onClick={() => deleteSection(phaseIdx, secIdx)}
                        className="text-status-red hover:text-status-red/80 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addSection(phaseIdx)}
                    className="flex items-center gap-1.5 text-xs text-brand-charcoal/60 hover:text-brand-orange transition-colors mt-2"
                  >
                    <Plus size={12} /> Add Section
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-surface-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Template Detail Modal ────────────────────────────────────────────────────
function TemplateModal({ template, onClose, onEdit, canEdit, isCustom, isSystemTemplate }) {
  const Icon = template.icon
  const totalSections = template.phases.reduce((a, p) => a + p.sections.length, 0)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className={`${template.headerColor} text-white rounded-t-2xl p-6`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">{template.name}</h2>
                <p className="text-sm opacity-80">{template.phases.length} phases · {totalSections} sections</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="bg-surface-secondary rounded-xl p-4">
            <p className="text-sm text-brand-charcoal-dark leading-relaxed">{template.description}</p>
          </div>
          <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-brand-orange uppercase tracking-wide mb-1">When to use</p>
            <p className="text-sm text-brand-charcoal-dark">{template.useFor}</p>
          </div>

          <div>
            <h3 className="font-semibold text-brand-charcoal-dark mb-3">Template Structure</h3>
            <div className="space-y-3">
              {template.phases.map((phase, i) => (
                <div key={i} className="border border-surface-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-secondary">
                    <div className="w-5 h-5 rounded-full bg-brand-orange text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
                    <span className="text-sm font-semibold text-brand-charcoal-dark">{phase.name}</span>
                    <span className="text-xs text-brand-charcoal ml-auto">{phase.sections.length} sections</span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {phase.sections.map((s, j) => (
                        <span key={j} className="text-xs bg-white border border-surface-border text-brand-charcoal px-2.5 py-1 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-surface-border flex items-center justify-between">
          <p className="text-xs text-brand-charcoal">This template guides the Workspace charter sections for your project.</p>
          <div className="flex gap-2">
            {canEdit && (
              <button onClick={onEdit} className="btn-primary flex items-center gap-1.5">
                <Edit3 size={14} /> Edit Template
              </button>
            )}
            <button onClick={onClose} className="btn-secondary">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Templates() {
  const { user } = useAuth()
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [profile, setProfile] = useState(null)
  const [customTemplates, setCustomTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  // Check user role
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role, company_id')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          setProfile(null)
        } else {
          setProfile(data)
          localStorage.setItem('auth_user', JSON.stringify(data))
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  // Load custom templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('custom_templates')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Restore icon components (can't be serialized to JSON)
        const restored = parsed.map(t => ({
          ...t,
          icon: ICON_MAP[t.iconName] || ClipboardList,
        }))
        setCustomTemplates(restored)
      } catch (err) {
        console.error('Error loading custom templates:', err)
      }
    }
  }, [])

  const canEdit = profile?.role && ['owner', 'program_leader', 'project_manager'].includes(profile.role)

  const allTemplates = [...TEMPLATES, ...customTemplates]
  const filtered = allTemplates.filter(t => {
    const matchCat = category === 'All' || t.category === category
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleTemplateClick = (template) => {
    setSelectedTemplate(template)
    setEditingTemplate(null)
  }

  const handleEditTemplate = (template) => {
    setEditingTemplate(template)
  }

  const handleRefreshTemplates = () => {
    const saved = localStorage.getItem('custom_templates')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const restored = parsed.map(t => ({
          ...t,
          icon: ICON_MAP[t.iconName] || ClipboardList,
        }))
        setCustomTemplates(restored)
      } catch (err) {
        console.error('Error loading custom templates:', err)
      }
    }
    setSelectedTemplate(null)
    setEditingTemplate(null)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <p className="text-brand-charcoal">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal-dark">Templates</h1>
          <p className="text-sm text-brand-charcoal mt-1">Lean Six Sigma frameworks and tools to structure your projects.</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} /> Create Template
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-charcoal/50" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="input pl-9 text-sm" />
        </div>
        <div className="flex gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-sm px-4 py-2 rounded-full font-medium transition-colors ${category === c ? 'bg-brand-orange text-white' : 'bg-surface-secondary text-brand-charcoal hover:bg-surface-border'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 mb-5 text-xs text-brand-charcoal">
        <BookOpen size={13} />
        <span>{filtered.length} template{filtered.length !== 1 ? 's' : ''} available</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={40} className="mx-auto text-brand-charcoal/20 mb-3" />
          <p className="text-brand-charcoal font-medium">No templates match your search</p>
          <button onClick={() => { setSearch(''); setCategory('All') }} className="text-sm text-brand-orange mt-2 hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onClick={() => handleTemplateClick(t)}
              isCustom={customTemplates.some(ct => ct.id === t.id)}
            />
          ))}
        </div>
      )}

      {selectedTemplate && (
        <TemplateModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onEdit={() => handleEditTemplate(selectedTemplate)}
          canEdit={canEdit}
          isCustom={customTemplates.some(ct => ct.id === selectedTemplate.id)}
          isSystemTemplate={TEMPLATES.some(st => st.id === selectedTemplate.id)}
        />
      )}

      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={handleRefreshTemplates}
          isCustom={customTemplates.some(ct => ct.id === editingTemplate.id)}
          isSystemTemplate={TEMPLATES.some(st => st.id === editingTemplate.id)}
        />
      )}

      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSaved={handleRefreshTemplates}
        />
      )}
    </div>
  )
}
