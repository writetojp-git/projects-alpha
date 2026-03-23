import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle,
  PauseCircle, ArrowRightCircle, Eye, Filter, Search,
  ClipboardList, Loader2, AlertCircle, TrendingUp
} from 'lucide-react'

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  submitted:     { label: 'Submitted',     color: 'bg-blue-100 text-blue-700',    icon: Clock },
  under_review:  { label: 'Under Review',  color: 'bg-yellow-100 text-yellow-700', icon: Eye },
  approved:      { label: 'Approved',      color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  rejected:      { label: 'Rejected',      color: 'bg-red-100 text-red-700',      icon: XCircle },
  on_hold:       { label: 'On Hold',       color: 'bg-gray-100 text-gray-600',    icon: PauseCircle },
  converted:     { label: 'Converted',     color: 'bg-purple-100 text-purple-700', icon: ArrowRightCircle },
}

const PROJECT_TYPES = [
  { value: 'dmaic',   label: 'DMAIC — Process Improvement' },
  { value: 'dmadv',   label: 'DMADV — Design for Six Sigma' },
  { value: 'kaizen',  label: 'Kaizen — Rapid Improvement Event' },
  { value: 'lean',    label: 'Lean — Waste Elimination' },
  { value: 'general', label: 'General — Other Initiative' },
]

const REVIEWER_ROLES = ['owner', 'program_leader', 'project_manager']

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.submitted
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

// ── Submit Form Modal ─────────────────────────────────────────
function SubmitModal({ onClose, onSuccess, userProfile }) {
  const [form, setForm] = useState({
    title: '',
    problem_statement: '',
    business_case: '',
    expected_benefit: '',
    estimated_savings: '',
    department: '',
    project_type: 'dmaic',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.problem_statement.trim()) {
      setError('Project name and problem statement are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        title: form.title.trim(),
        problem_statement: form.problem_statement.trim(),
        business_case: form.business_case.trim() || null,
        expected_benefit: form.expected_benefit.trim() || null,
        estimated_savings: form.estimated_savings ? parseFloat(form.estimated_savings) : null,
        department: form.department.trim() || null,
        project_type: form.project_type,
        company_id: userProfile.company_id,
        requested_by: userProfile.id,
        status: 'submitted',
      }
      const { error: err } = await supabase.from('intake_requests').insert(payload)
      if (err) throw err
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

          {/* Project Type */}
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

          {/* Expected Benefit */}
          <div>
            <label className="label">Expected Benefit</label>
            <textarea
              className="input min-h-[70px] resize-none"
              placeholder="What will success look like? What metrics will improve?"
              value={form.expected_benefit}
              onChange={e => update('expected_benefit', e.target.value)}
            />
          </div>

          {/* Savings + Department row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Estimated Savings ($)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 50000"
                value={form.estimated_savings}
                onChange={e => update('estimated_savings', e.target.value)}
              />
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

// ── Review Modal ──────────────────────────────────────────────
function ReviewModal({ request, onClose, onSuccess, userProfile }) {
  const [action, setAction] = useState('approved')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleReview = async () => {
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('intake_requests')
        .update({
          status: action,
          review_notes: notes.trim() || null,
          reviewed_by: userProfile.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id)
      if (err) throw err
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to update request.')
    } finally {
      setLoading(false)
    }
  }

  const type = PROJECT_TYPES.find(t => t.value === request.project_type)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-brand-charcoal-dark">Review Request</h2>
            <p className="text-sm text-brand-charcoal mt-0.5 truncate max-w-xs">{request.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-brand-charcoal" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Request details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={request.status} />
              <span className="text-brand-charcoal">{type?.label || request.project_type}</span>
              {request.department && (
                <span className="text-brand-charcoal">· {request.department}</span>
              )}
              {request.estimated_savings && (
                <span className="text-green-600 font-medium">
                  · ${Number(request.estimated_savings).toLocaleString()} est. savings
                </span>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-brand-charcoal uppercase tracking-wide mb-1">Problem Statement</p>
              <p className="text-brand-charcoal-dark leading-relaxed">{request.problem_statement}</p>
            </div>

            {request.business_case && (
              <div>
                <p className="text-xs font-semibold text-brand-charcoal uppercase tracking-wide mb-1">Business Case</p>
                <p className="text-brand-charcoal-dark leading-relaxed">{request.business_case}</p>
              </div>
            )}

            {request.expected_benefit && (
              <div>
                <p className="text-xs font-semibold text-brand-charcoal uppercase tracking-wide mb-1">Expected Benefit</p>
                <p className="text-brand-charcoal-dark leading-relaxed">{request.expected_benefit}</p>
              </div>
            )}

            <div className="text-xs text-brand-charcoal">
              Submitted by <span className="font-medium">{request.profiles?.full_name || 'Unknown'}</span>
              {' · '}
              {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Decision */}
          <div>
            <label className="label">Decision</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'approved', label: 'Approve', color: 'border-green-400 bg-green-50 text-green-700' },
                { value: 'on_hold',  label: 'Defer',   color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
                { value: 'rejected', label: 'Decline', color: 'border-red-400 bg-red-50 text-red-700' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAction(opt.value)}
                  className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    action === opt.value ? opt.color : 'border-gray-200 bg-white text-brand-charcoal hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review Notes */}
          <div>
            <label className="label">Review Notes</label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Add context for the requestor about your decision…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleReview} className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Saving…</span>
              ) : 'Submit Decision'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Detail Modal ──────────────────────────────────────────────
function DetailModal({ request, onClose }) {
  const type = PROJECT_TYPES.find(t => t.value === request.project_type)
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-brand-charcoal-dark">Request Details</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-brand-charcoal" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={request.status} />
            <span className="text-brand-charcoal">{type?.label}</span>
            {request.department && <span className="text-brand-charcoal">· {request.department}</span>}
          </div>

          <div>
            <h3 className="font-bold text-brand-charcoal-dark text-base mb-1">{request.title}</h3>
            <p className="text-brand-charcoal text-xs">
              Submitted by {request.profiles?.full_name || 'Unknown'} on{' '}
              {new Date(request.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {[
            { key: 'problem_statement', label: 'Problem Statement' },
            { key: 'business_case', label: 'Business Case' },
            { key: 'expected_benefit', label: 'Expected Benefit' },
          ].map(({ key, label }) =>
            request[key] ? (
              <div key={key} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-brand-charcoal uppercase tracking-wide mb-1">{label}</p>
                <p className="text-brand-charcoal-dark leading-relaxed">{request[key]}</p>
              </div>
            ) : null
          )}

          {request.estimated_savings && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
              <TrendingUp size={16} className="text-green-600" />
              <span className="text-green-700 font-medium">
                ${Number(request.estimated_savings).toLocaleString()} estimated savings
              </span>
            </div>
          )}

          {request.review_notes && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Review Notes</p>
              <p className="text-blue-900 leading-relaxed">{request.review_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Intake Page ──────────────────────────────────────────
export default function Intake() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('queue') // 'queue' | 'mine'
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showSubmit, setShowSubmit] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

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

  // Load intake requests
  const loadRequests = async () => {
    if (!userProfile) return
    setLoading(true)
    const { data } = await supabase
      .from('intake_requests')
      .select('*, profiles:requested_by(full_name, avatar_url)')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => { loadRequests() }, [userProfile])

  const isReviewer = userProfile && REVIEWER_ROLES.includes(userProfile.role)

  // Toggle sort function
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ChevronUp size={13} className="text-brand-charcoal/30" />
    }
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="text-brand-orange" />
      : <ChevronDown size={13} className="text-brand-orange" />
  }

  // Filtered lists
  const filtered = requests.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesSearch = search === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.problem_statement.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const myRequests = requests.filter(r => r.requested_by === userProfile?.id)
  const unsortedList = activeTab === 'mine' ? myRequests : filtered

  // Apply sorting
  const displayList = [...unsortedList].sort((a, b) => {
    let av = sortField.includes('.')
      ? sortField.split('.').reduce((obj, key) => obj?.[key], a) ?? ''
      : a[sortField] ?? ''
    let bv = sortField.includes('.')
      ? sortField.split('.').reduce((obj, key) => obj?.[key], b) ?? ''
      : b[sortField] ?? ''

    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av

    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => ['submitted', 'under_review'].includes(r.status)).length,
    approved: requests.filter(r => r.status === 'approved').length,
    converted: requests.filter(r => r.status === 'converted').length,
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal-dark">Intake Queue</h1>
          <p className="text-brand-charcoal text-sm mt-1">Submit and review project requests for approval</p>
        </div>
        <button onClick={() => setShowSubmit(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Request
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: stats.total, color: 'text-brand-charcoal-dark' },
          { label: 'Awaiting Review', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          { label: 'Converted to Projects', value: stats.converted, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="card">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-brand-charcoal mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="card p-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center border-b border-gray-100 px-4">
          {[
            { id: 'queue', label: isReviewer ? 'All Requests' : 'Queue' },
            { id: 'mine', label: 'My Submissions' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-brand-orange text-brand-orange'
                  : 'border-transparent text-brand-charcoal hover:text-brand-charcoal-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        {activeTab === 'queue' && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-100">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-charcoal" />
              <input
                className="input pl-9 py-2 text-sm"
                placeholder="Search requests…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-brand-charcoal" />
              <div className="relative">
                <select
                  className="input py-2 text-sm pr-8 appearance-none"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <option key={val} value={val}>{cfg.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-charcoal pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-orange" />
          </div>
        ) : displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-brand-orange/10 rounded-full flex items-center justify-center mb-3">
              <ClipboardList size={22} className="text-brand-orange" />
            </div>
            <p className="font-semibold text-brand-charcoal-dark">No requests found</p>
            <p className="text-sm text-brand-charcoal mt-1">
              {activeTab === 'mine'
                ? 'You haven\'t submitted any project requests yet.'
                : 'No requests match your current filters.'}
            </p>
            {activeTab === 'mine' && (
              <button onClick={() => setShowSubmit(true)} className="btn-primary mt-4 flex items-center gap-2">
                <Plus size={15} /> Submit Your First Request
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th
                    onClick={() => toggleSort('title')}
                    className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide cursor-pointer hover:text-brand-charcoal-dark transition-colors"
                  >
                    <span className="flex items-center gap-1">Project Name <SortIcon field="title" /></span>
                  </th>
                  <th
                    onClick={() => toggleSort('project_type')}
                    className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide cursor-pointer hover:text-brand-charcoal-dark transition-colors"
                  >
                    <span className="flex items-center gap-1">Type <SortIcon field="project_type" /></span>
                  </th>
                  {activeTab === 'queue' && (
                    <th
                      onClick={() => toggleSort('profiles.full_name')}
                      className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide cursor-pointer hover:text-brand-charcoal-dark transition-colors"
                    >
                      <span className="flex items-center gap-1">Submitted By <SortIcon field="profiles.full_name" /></span>
                    </th>
                  )}
                  <th
                    onClick={() => toggleSort('status')}
                    className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide cursor-pointer hover:text-brand-charcoal-dark transition-colors"
                  >
                    <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
                  </th>
                  <th
                    onClick={() => toggleSort('estimated_savings')}
                    className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide cursor-pointer hover:text-brand-charcoal-dark transition-colors"
                  >
                    <span className="flex items-center gap-1">Savings <SortIcon field="estimated_savings" /></span>
                  </th>
                  <th
                    onClick={() => toggleSort('created_at')}
                    className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide cursor-pointer hover:text-brand-charcoal-dark transition-colors"
                  >
                    <span className="flex items-center gap-1">Date <SortIcon field="created_at" /></span>
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayList.map(req => {
                  const typeCfg = PROJECT_TYPES.find(t => t.value === req.project_type)
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-brand-charcoal-dark leading-tight">{req.title}</p>
                          {req.department && (
                            <p className="text-xs text-brand-charcoal mt-0.5">{req.department}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-brand-charcoal">
                        {typeCfg?.label.split(' — ')[0] || req.project_type.toUpperCase()}
                      </td>
                      {activeTab === 'queue' && (
                        <td className="py-3.5 px-4 text-brand-charcoal">
                          {req.profiles?.full_name || '—'}
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3.5 px-4 text-brand-charcoal">
                        {req.estimated_savings
                          ? <span className="text-green-600 font-medium">${Number(req.estimated_savings).toLocaleString()}</span>
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-brand-charcoal whitespace-nowrap">
                        {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setDetailTarget(req)}
                            className="p-1.5 text-brand-charcoal hover:text-brand-charcoal-dark hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>
                          {isReviewer && ['submitted', 'under_review', 'on_hold'].includes(req.status) && (
                            <button
                              onClick={() => setReviewTarget(req)}
                              className="btn-secondary py-1 px-3 text-xs"
                            >
                              Review
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

      {/* Modals */}
      {showSubmit && userProfile && (
        <SubmitModal
          onClose={() => setShowSubmit(false)}
          onSuccess={() => { setShowSubmit(false); loadRequests() }}
          userProfile={userProfile}
        />
      )}
      {reviewTarget && userProfile && (
        <ReviewModal
          request={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => { setReviewTarget(null); loadRequests() }}
          userProfile={userProfile}
        />
      )}
      {detailTarget && (
        <DetailModal
          request={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}
