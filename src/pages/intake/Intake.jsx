import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, ChevronDown, Clock, CheckCircle2, XCircle,
  PauseCircle, ArrowRightCircle, Eye, Filter, Search,
  ClipboardList, Loader2, AlertCircle, TrendingUp, Trash2
} from 'lucide-react'
import SubmitRequestModal from '../../components/ui/SubmitRequestModal'

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
  { value: 'custom',  label: 'Custom — Define Your Own Phases' },
]

const REVIEWER_ROLES = ['owner', 'program_leader', 'project_manager']


// Status Badge
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.submitted
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}
// ── Review Modal ──────────────────────────────────────────────
function ReviewModal({ request, onClose, onSuccess, userProfile }) {
  const [action, setAction] = useState('approved')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [benefits, setBenefits] = useState([])

  useEffect(() => {
    if (!request?.id) return
    supabase
      .from('project_benefits')
      .select('*')
      .eq('intake_id', request.id)
      .then(({ data }) => setBenefits(data || []))
  }, [request?.id])

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

            {/* Show itemized benefits */}
            {benefits.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-brand-charcoal uppercase tracking-wide mb-2">Estimated Benefits</p>
                <div className="space-y-1.5">
                  {benefits.map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                      <span className="text-brand-charcoal-dark font-medium">{b.category_name}</span>
                      <span className="text-green-600 font-medium">{b.estimated_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback: show old estimated_savings if no itemized benefits */}
            {benefits.length === 0 && request.estimated_savings && (
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-green-600" />
                <span className="text-green-600 font-medium">
                  ${Number(request.estimated_savings).toLocaleString()} est. savings
                </span>
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
  const [benefits, setBenefits] = useState([])

  useEffect(() => {
    if (!request?.id) return
    supabase
      .from('project_benefits')
      .select('*')
      .eq('intake_id', request.id)
      .then(({ data }) => setBenefits(data || []))
  }, [request?.id])

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

          {/* Itemized benefits */}
          {benefits.length > 0 && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Estimated Benefits</p>
              <div className="space-y-1.5">
                {benefits.map(b => (
                  <div key={b.id} className="flex items-center justify-between">
                    <span className="text-brand-charcoal-dark">{b.category_name}</span>
                    <span className="text-green-700 font-medium">{b.estimated_value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback for legacy single savings */}
          {benefits.length === 0 && request.estimated_savings && (
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

  // Filtered lists
  const filtered = requests.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesSearch = search === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.problem_statement.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const myRequests = requests.filter(r => r.requested_by === userProfile?.id)
  const displayList = activeTab === 'mine' ? myRequests : filtered

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
                  <th className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide">Project Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide">Type</th>
                  {activeTab === 'queue' && (
                    <th className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide">Submitted By</th>
                  )}
                  <th className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide">Est. Savings</th>
                  <th className="text-left py-3 px-4 font-semibold text-brand-charcoal text-xs uppercase tracking-wide">Date</th>
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
        <SubmitRequestModal
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
