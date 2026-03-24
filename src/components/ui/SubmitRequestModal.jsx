import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus, X, ChevronDown, Loader2, AlertCircle, Trash2
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────
const PROJECT_TYPES = [
  { value: 'dmaic',   label: 'DMAIC — Process Improvement' },
  { value: 'dmadv',   label: 'DMADV — Design for Six Sigma' },
  { value: 'kaizen',  label: 'Kaizen — Rapid Improvement Event' },
  { value: 'lean',    label: 'Lean — Waste Elimination' },
  { value: 'general', label: 'General — Other Initiative' },
]

const UNIT_PLACEHOLDERS = {
  currency: 'e.g. 50000',
  percentage: 'e.g. 95',
  number: 'e.g. 10',
  days: 'e.g. 30',
  text: 'e.g. High',
}

const UNIT_PREFIXES = {
  currency: '$',
  percentage: '',
  number: '',
  days: '',
  text: '',
}

const UNIT_SUFFIXES = {
  currency: '',
  percentage: '%',
  number: '',
  days: ' days',
  text: '',
}

export function formatBenefitValue(val, unitType) {
  if (!val && val !== 0) return '—'
  const prefix = UNIT_PREFIXES[unitType] || ''
  const suffix = UNIT_SUFFIXES[unitType] || ''
  if (unitType === 'currency') {
    const num = Number(val)
    return isNaN(num) ? val : `${prefix}${num.toLocaleString()}${suffix}`
  }
  return `${prefix}${val}${suffix}`
}

// ── Benefit Row Component ────────────────────────────────────
function BenefitRow({ benefit, categories, onChange, onRemove }) {
  const cat = categories.find(c => c.id === benefit.category_id)
  const unitType = cat?.unit_type || 'currency'

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <select
          className="input py-1.5 text-sm"
          value={benefit.category_id}
          onChange={e => {
            const selected = categories.find(c => c.id === e.target.value)
            onChange({ ...benefit, category_id: e.target.value, category_name: selected?.name || '' })
          }}
        >
          <option value="">Select benefit type…</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="w-40">
        <div className="relative">
          {unitType === 'currency' && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-charcoal text-sm">$</span>
          )}
          <input
            className={`input py-1.5 text-sm ${unitType === 'currency' ? 'pl-7' : ''} ${unitType === 'percentage' ? 'pr-7' : ''}`}
            type={unitType === 'text' ? 'text' : 'number'}
            min="0"
            step={unitType === 'currency' ? '1000' : unitType === 'percentage' ? '0.1' : '1'}
            placeholder={UNIT_PLACEHOLDERS[unitType]}
            value={benefit.estimated_value}
            onChange={e => onChange({ ...benefit, estimated_value: e.target.value })}
          />
          {unitType === 'percentage' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-charcoal text-sm">%</span>
          )}
          {unitType === 'days' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-charcoal text-xs">days</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ── Submit Request Modal ─────────────────────────────────────
export default function SubmitRequestModal({ onClose, onSuccess, userProfile }) {
  const [form, setForm] = useState({
    title: '',
    problem_statement: '',
    business_case: '',
    expected_benefit: '',
    department: '',
    project_type: 'dmaic',
  })
  const [benefits, setBenefits] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load benefit categories
  useEffect(() => {
    supabase
      .from('benefit_categories')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setCategories(data || [])
      })
  }, [userProfile.company_id])

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const addBenefit = () => {
    setBenefits(b => [...b, { category_id: '', category_name: '', estimated_value: '' }])
  }

  const updateBenefit = (idx, updated) => {
    setBenefits(b => b.map((item, i) => i === idx ? updated : item))
  }

  const removeBenefit = (idx) => {
    setBenefits(b => b.filter((_, i) => i !== idx))
  }

  // Calculate total estimated savings from currency-type benefits
  const totalSavings = benefits.reduce((sum, b) => {
    const cat = categories.find(c => c.id === b.category_id)
    if (cat?.unit_type === 'currency' && b.estimated_value) {
      return sum + (parseFloat(b.estimated_value) || 0)
    }
    return sum
  }, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.problem_statement.trim()) {
      setError('Project name and problem statement are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Insert intake request
      const payload = {
        title: form.title.trim(),
        problem_statement: form.problem_statement.trim(),
        business_case: form.business_case.trim() || null,
        expected_benefit: form.expected_benefit.trim() || null,
        estimated_savings: totalSavings > 0 ? totalSavings : null,
        department: form.department.trim() || null,
        project_type: form.project_type,
        company_id: userProfile.company_id,
        requested_by: userProfile.id,
        status: 'submitted',
      }
      const { data: intake, error: err } = await supabase
        .from('intake_requests')
        .insert(payload)
        .select()
        .single()
      if (err) throw err

      // Insert individual benefits
      const validBenefits = benefits.filter(b => b.category_id && b.estimated_value)
      if (validBenefits.length > 0) {
        const benefitRows = validBenefits.map(b => {
          const cat = categories.find(c => c.id === b.category_id)
          const numericVal = parseFloat(b.estimated_value)
          return {
            company_id: userProfile.company_id,
            intake_id: intake.id,
            category_id: b.category_id,
            category_name: b.category_name || cat?.name || '',
            estimated_value: formatBenefitValue(b.estimated_value, cat?.unit_type || 'text'),
            estimated_numeric: isNaN(numericVal) ? null : numericVal,
            created_by: userProfile.id,
          }
        })
        const { error: bErr } = await supabase.from('project_benefits').insert(benefitRows)
        if (bErr) console.error('Benefits insert error:', bErr)
      }

      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to submit request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-brand-charcoal-dark">Submit Project Request</h2>
            <p className="text-sm text-brand-charcoal mt-0.5">Describe your initiative and submit it for review</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-brand-charcoal" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="label">Project Name <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="e.g. Reduce Order Processing Time"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              required
            />
          </div>

          {/* Project Type + Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Project Type</label>
              <div className="relative">
                <select
                  className="input appearance-none pr-10"
                  value={form.project_type}
                  onChange={e => update('project_type', e.target.value)}
                >
                  {PROJECT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-charcoal pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="label">Department</label>
              <input
                className="input"
                placeholder="e.g. Operations"
                value={form.department}
                onChange={e => update('department', e.target.value)}
              />
            </div>
          </div>

          {/* Problem Statement */}
          <div>
            <label className="label">Problem Statement <span className="text-red-500">*</span></label>
            <textarea
              className="input min-h-[90px] resize-none"
              placeholder="Describe the problem you're trying to solve. Be specific — what is happening, where, and how often?"
              value={form.problem_statement}
              onChange={e => update('problem_statement', e.target.value)}
              required
            />
          </div>

          {/* Business Case */}
          <div>
            <label className="label">Business Case</label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Why does this project matter to the business? What happens if we don't act?"
              value={form.business_case}
              onChange={e => update('business_case', e.target.value)}
            />
          </div>

          {/* Expected Benefit (text) */}
          <div>
            <label className="label">Expected Benefit</label>
            <textarea
              className="input min-h-[70px] resize-none"
              placeholder="What will success look like? What metrics will improve?"
              value={form.expected_benefit}
              onChange={e => update('expected_benefit', e.target.value)}
            />
          </div>

          {/* Estimated Benefits — multi-select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Estimated Benefits</label>
              {totalSavings > 0 && (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Total savings: ${totalSavings.toLocaleString()}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {benefits.map((b, i) => (
                <BenefitRow
                  key={i}
                  benefit={b}
                  categories={categories}
                  onChange={updated => updateBenefit(i, updated)}
                  onRemove={() => removeBenefit(i)}
                />
              ))}
              <button
                type="button"
                onClick={addBenefit}
                className="flex items-center gap-1.5 text-sm text-brand-orange hover:text-brand-orange-dark font-medium py-2 px-3 rounded-lg hover:bg-brand-orange/5 transition-colors"
              >
                <Plus size={14} />
                Add Benefit
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Submitting…</span>
              ) : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

