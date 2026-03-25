import { useState } from 'react'
import { X, Sparkles, Loader2, CheckCircle2, Plus, RotateCcw, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

const PROJECT_TYPES = ['dmaic', 'dmadv', 'kaizen', 'lean', 'general']

// Phase color palette
const PHASE_COLORS = [
  'bg-blue-500',
  'bg-brand-orange',
  'bg-purple-500',
  'bg-green-500',
  'bg-yellow-500',
]

function TimelineSection({ phases, totalWeeks, teamSize }) {
  const [expandedPhase, setExpandedPhase] = useState(null)
  const totalPhaseDuration = phases.reduce((sum, p) => sum + (p.duration_weeks || 0), 0) || 1

  return (
    <div className="border border-gray-100 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-brand-charcoal-dark">
          Estimated Project Timeline
          {totalWeeks && <span className="text-brand-orange ml-1">— {totalWeeks} weeks total</span>}
        </p>
        {teamSize && (
          <div className="flex items-center gap-1 text-xs text-brand-charcoal bg-surface-secondary px-2 py-1 rounded-full">
            <Users size={11} />
            {teamSize} people recommended
          </div>
        )}
      </div>

      {/* Timeline bar */}
      <div className="flex rounded-full overflow-hidden h-6 gap-px">
        {phases.map((phase, i) => {
          const widthPct = Math.round((phase.duration_weeks / totalPhaseDuration) * 100)
          return (
            <button
              key={i}
              onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
              style={{ width: `${widthPct}%` }}
              className={`${PHASE_COLORS[i % PHASE_COLORS.length]} flex items-center justify-center min-w-[32px] hover:opacity-90 transition-opacity`}
              title={`${phase.name} — ${phase.duration_weeks}w`}
            >
              <span className="text-white text-[9px] font-bold truncate px-1 leading-none">
                {phase.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Phase labels row */}
      <div className="flex gap-2 flex-wrap">
        {phases.map((phase, i) => (
          <button
            key={i}
            onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
            className="flex items-center gap-1 text-xs text-brand-charcoal hover:text-brand-charcoal-dark transition-colors"
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PHASE_COLORS[i % PHASE_COLORS.length]}`} />
            <span>{phase.name}</span>
            <span className="text-gray-400">{phase.duration_weeks}w</span>
            {expandedPhase === i ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        ))}
      </div>

      {/* Expanded phase tasks */}
      {expandedPhase !== null && phases[expandedPhase] && (
        <div className="bg-surface-secondary rounded-lg p-3">
          <p className="text-xs font-semibold text-brand-charcoal-dark mb-2">
            {phases[expandedPhase].name} — Key Tasks
          </p>
          <ul className="space-y-1">
            {(phases[expandedPhase].key_tasks || []).map((task, j) => (
              <li key={j} className="text-xs text-brand-charcoal flex items-start gap-1.5">
                <span className="text-brand-orange mt-0.5">•</span>
                {task}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function AIProjectPlanner({ onClose, userProfile }) {
  const navigate = useNavigate()
  const [step, setStep] = useState('input') // 'input' | 'loading' | 'review'
  const [description, setDescription] = useState('')
  const [editPlan, setEditPlan] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const generatePlan = async () => {
    if (!description.trim()) return
    setStep('loading')
    setError('')
    try {
      const res = await fetch('/api/ai-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate plan')
      setEditPlan({ ...data.plan })
      setStep('review')
    } catch (err) {
      setError(err.message || 'Failed to generate plan. Please try again.')
      setStep('input')
    }
  }

  const createProject = async () => {
    if (!editPlan) return
    setCreating(true)
    setError('')
    try {
      const descParts = [
        editPlan.problem_statement && `Problem: ${editPlan.problem_statement}`,
        editPlan.goal_statement && `Goal: ${editPlan.goal_statement}`,
        editPlan.sipoc_summary && `SIPOC: ${editPlan.sipoc_summary}`,
      ].filter(Boolean)

      const { data, error: err } = await supabase
        .from('projects')
        .insert({
          company_id: userProfile.company_id,
          name: editPlan.name,
          type: editPlan.type,
          description: descParts.join('\n\n'),
          status: 'active',
          phase: 'Define',
          health: 'green',
          department: editPlan.department || null,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (err) throw err
      onClose()
      navigate(`/workspace?project=${data.id}`)
    } catch (err) {
      setError('Failed to create project. Please try again.')
      setCreating(false)
    }
  }

  const field = (label, key, type = 'input', rows = 2) => (
    <div>
      <label className="label text-xs">{label}</label>
      {type === 'input' ? (
        <input
          value={editPlan[key] || ''}
          onChange={e => setEditPlan(p => ({ ...p, [key]: e.target.value }))}
          className="input text-sm"
        />
      ) : type === 'select' ? (
        <select
          value={editPlan[key] || ''}
          onChange={e => setEditPlan(p => ({ ...p, [key]: e.target.value }))}
          className="input text-sm"
        >
          {PROJECT_TYPES.map(t => (
            <option key={t} value={t}>{t.toUpperCase()}</option>
          ))}
        </select>
      ) : (
        <textarea
          value={editPlan[key] || ''}
          onChange={e => setEditPlan(p => ({ ...p, [key]: e.target.value }))}
          rows={rows}
          className="input text-sm resize-none"
        />
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 bg-brand-orange/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-brand-orange" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-brand-charcoal-dark text-base">AI Project Planner</h2>
            <p className="text-xs text-brand-charcoal">Describe your opportunity — AI generates a full Lean Six Sigma project brief</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="label">Describe your improvement opportunity</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  placeholder="e.g. Our order fulfillment process takes 5–7 days but competitors deliver in 2. We have high return rates due to picking errors and customer complaints are rising. We need to reduce cycle time by 50% and cut picking errors to under 1%."
                  className="input text-sm resize-none"
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) generatePlan() }}
                />
                <p className="text-xs text-brand-charcoal mt-1.5">
                  2–5 sentences works best. Include the problem, current state, and desired outcome.
                </p>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step: Loading */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 bg-brand-orange/10 rounded-2xl flex items-center justify-center">
                <Loader2 size={28} className="animate-spin text-brand-orange" />
              </div>
              <p className="text-sm font-semibold text-brand-charcoal-dark">Generating your project plan…</p>
              <p className="text-xs text-gray-400 text-center max-w-xs">
                Analyzing the opportunity and structuring a Lean Six Sigma project brief
              </p>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && editPlan && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-brand-charcoal-dark">Plan generated — review and edit before creating</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">{field('Project Name', 'name')}</div>
                <div>{field('Project Type', 'type', 'select')}</div>
                <div>{field('Department / Area', 'department')}</div>
                <div className="col-span-2">{field('Problem Statement', 'problem_statement', 'textarea', 3)}</div>
                <div className="col-span-2">{field('Goal Statement', 'goal_statement', 'textarea', 2)}</div>
                <div className="col-span-2">{field('SIPOC Summary', 'sipoc_summary', 'textarea', 2)}</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-semibold text-brand-charcoal mb-1.5">Key Risks</p>
                  <ul className="space-y-1">
                    {(editPlan.key_risks || []).map((r, i) => (
                      <li key={i} className="text-xs text-red-700 bg-red-50 px-2.5 py-1.5 rounded-lg">• {r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-charcoal mb-1.5">Success Metrics</p>
                  <ul className="space-y-1">
                    {(editPlan.success_metrics || []).map((m, i) => (
                      <li key={i} className="text-xs text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg">• {m}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-charcoal mb-1.5">Suggested Roles</p>
                  <ul className="space-y-1">
                    {(editPlan.team_roles || []).map((r, i) => (
                      <li key={i} className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg">• {r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {editPlan.estimated_savings && (
                <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-brand-orange mb-0.5">Estimated Value</p>
                  <p className="text-sm text-brand-charcoal-dark">{editPlan.estimated_savings}</p>
                </div>
              )}

              {/* Timeline section — v2 */}
              {editPlan.phases && editPlan.phases.length > 0 && (
                <TimelineSection
                  phases={editPlan.phases}
                  totalWeeks={editPlan.total_timeline_weeks}
                  teamSize={editPlan.recommended_team_size}
                />
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          {step === 'review' ? (
            <>
              <button
                onClick={() => { setStep('input'); setError('') }}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <RotateCcw size={14} />
                Start Over
              </button>
              <button
                onClick={createProject}
                disabled={creating || !editPlan?.name?.trim()}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Create Project
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={generatePlan}
                disabled={!description.trim() || step === 'loading'}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Sparkles size={15} />
                Generate Plan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
