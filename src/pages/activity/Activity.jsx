import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Activity, FolderOpen, Inbox, CheckCircle2, XCircle, Clock,
  TrendingUp, AlertTriangle, Edit3, Plus, ChevronDown, Loader2,
  AlertCircle, RefreshCw, Filter
} from 'lucide-react'

// ─── Action config ────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  created:          { label: 'Project created',     icon: Plus,          color: 'bg-blue-100 text-blue-600' },
  phase_updated:    { label: 'Phase advanced',      icon: TrendingUp,    color: 'bg-purple-100 text-purple-600' },
  health_updated:   { label: 'Health updated',      icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-600' },
  task_completed:   { label: 'Task completed',      icon: CheckCircle2,  color: 'bg-green-100 text-green-600' },
  submitted:        { label: 'Intake submitted',    icon: Inbox,         color: 'bg-orange-100 text-orange-600' },
  approved:         { label: 'Intake approved',     icon: CheckCircle2,  color: 'bg-green-100 text-green-600' },
  rejected:         { label: 'Intake rejected',     icon: XCircle,       color: 'bg-red-100 text-red-600' },
  converted:        { label: 'Converted to project',icon: FolderOpen,    color: 'bg-blue-100 text-blue-600' },
  updated:          { label: 'Updated',             icon: Edit3,         color: 'bg-gray-100 text-gray-600' },
  scored:           { label: 'Priority scored',     icon: Activity,      color: 'bg-orange-100 text-orange-600' },
  default:          { label: 'Activity',            icon: Clock,         color: 'bg-gray-100 text-gray-600' },
}

function getActionConfig(action) {
  return ACTION_CONFIG[action] || ACTION_CONFIG.default
}

function buildDescription(log) {
  const meta = log.metadata || {}
  switch (log.action) {
    case 'created':
      return `New project started: "${meta.project_name || 'Unnamed'}"`
    case 'phase_updated':
      return `"${meta.project_name || 'Project'}" advanced from ${capitalize(meta.from)} → ${capitalize(meta.to)}`
    case 'health_updated':
      return `"${meta.project_name || 'Project'}" status changed to ${meta.to === 'red' ? '🔴 Off Track' : meta.to === 'yellow' ? '🟡 At Risk' : '🟢 On Track'}${meta.notes ? ` — ${meta.notes}` : ''}`
    case 'task_completed':
      return `Task completed: "${meta.task_title}" on "${meta.project_name}"`
    case 'submitted':
      return `Intake request submitted: "${meta.title}"`
    case 'approved':
      return `Intake approved: "${meta.title}"${meta.notes ? ` — ${meta.notes}` : ''}`
    case 'rejected':
      return `Intake declined: "${meta.title}"${meta.notes ? ` — ${meta.notes}` : ''}`
    case 'converted':
      return `"${meta.title}" converted to active project`
    default:
      return `${capitalize(log.action)} on ${log.entity_type}`
  }
}

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const secs = Math.floor((now - date) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function formatDateHeader(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Activity Item ────────────────────────────────────────────────────────────
function ActivityItem({ log }) {
  const cfg = getActionConfig(log.action)
  const Icon = cfg.icon
  const desc = buildDescription(log)

  return (
    <div className="flex gap-4 pb-6 relative">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
          <Icon size={15} />
        </div>
        <div className="w-px flex-1 bg-surface-border mt-2" />
      </div>
      <div className="flex-1 min-w-0 pb-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-brand-charcoal-dark font-medium leading-snug">{desc}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-brand-charcoal">{timeAgo(log.created_at)}</span>
              <span className="text-xs text-brand-charcoal/40">·</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color} font-medium`}>{cfg.label}</span>
            </div>
          </div>
          <span className="text-xs text-brand-charcoal/50 flex-shrink-0 whitespace-nowrap">
            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ActivityPage() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')

  const PAGE_SIZE = 25

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  const fetchLogs = useCallback(async (profile, pageNum = 0, replace = true) => {
    if (replace) setLoading(true)
    else setLoadingMore(true)
    setError('')

    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter)
    if (actionFilter !== 'all') query = query.eq('action', actionFilter)

    const { data, error: err } = await query
    if (err) setError(err.message)
    else {
      setHasMore((data || []).length === PAGE_SIZE)
      setLogs(prev => replace ? (data || []) : [...prev, ...(data || [])])
    }
    setLoading(false)
    setLoadingMore(false)
  }, [actionFilter, entityFilter])

  useEffect(() => {
    if (userProfile?.company_id) {
      setPage(0)
      fetchLogs(userProfile, 0, true)
    }
  }, [userProfile, actionFilter, entityFilter])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchLogs(userProfile, nextPage, false)
  }

  // Group by date
  const grouped = logs.reduce((acc, log) => {
    const dateKey = new Date(log.created_at).toDateString()
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(log)
    return acc
  }, {})

  const stats = [
    { label: 'All Events', value: logs.length + (hasMore ? '+' : ''), action: 'all', entity: 'all' },
    { label: 'Projects', value: logs.filter(l => l.entity_type === 'project').length, action: 'all', entity: 'project' },
    { label: 'Intake', value: logs.filter(l => l.entity_type === 'intake').length, action: 'all', entity: 'intake' },
    { label: 'Tasks', value: logs.filter(l => l.entity_type === 'task').length, action: 'all', entity: 'task' },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal-dark">Activity Feed</h1>
          <p className="text-sm text-brand-charcoal mt-1">Everything happening across your portfolio.</p>
        </div>
        <button onClick={() => fetchLogs(userProfile, 0, true)} className="btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <button
            key={s.label}
            onClick={() => { setEntityFilter(s.entity); setActionFilter(s.action) }}
            className={`card py-3 text-left transition-all hover:border-brand-orange/30 ${entityFilter === s.entity && actionFilter === s.action ? 'border-brand-orange bg-brand-orange/5' : ''}`}
          >
            <div className="text-xl font-bold text-brand-charcoal-dark">{s.value}</div>
            <div className="text-xs text-brand-charcoal mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Filter size={14} className="text-brand-charcoal" />
        <div className="flex gap-2 flex-wrap">
          {['all', 'project', 'intake', 'task'].map(e => (
            <button key={e} onClick={() => setEntityFilter(e)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${entityFilter === e ? 'bg-brand-orange text-white' : 'bg-surface-secondary text-brand-charcoal hover:bg-surface-border'}`}>
              {e === 'all' ? 'All types' : e}
            </button>
          ))}
          <span className="text-brand-charcoal/30">|</span>
          {['all', 'created', 'phase_updated', 'health_updated', 'approved', 'rejected', 'task_completed'].map(a => (
            <button key={a} onClick={() => setActionFilter(a)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${actionFilter === a ? 'bg-brand-charcoal-dark text-white' : 'bg-surface-secondary text-brand-charcoal hover:bg-surface-border'}`}>
              {a === 'all' ? 'All actions' : getActionConfig(a).label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-orange" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-status-red-bg text-status-red rounded-lg text-sm">
          <AlertCircle size={15} />{error}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20">
          <Activity size={40} className="mx-auto text-brand-charcoal/20 mb-3" />
          <p className="text-brand-charcoal font-medium">No activity yet</p>
          <p className="text-sm text-brand-charcoal/60 mt-1">Actions on projects and intake will appear here.</p>
        </div>
      ) : (
        <div>
          {Object.entries(grouped).map(([dateKey, dayLogs]) => (
            <div key={dateKey} className="mb-2">
              <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 py-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-surface-border" />
                  <span className="text-xs font-semibold text-brand-charcoal px-3">{formatDateHeader(dayLogs[0].created_at)}</span>
                  <div className="h-px flex-1 bg-surface-border" />
                </div>
              </div>
              <div>
                {dayLogs.map((log, i) => (
                  <ActivityItem key={log.id} log={log} isLast={i === dayLogs.length - 1} />
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <button onClick={loadMore} disabled={loadingMore} className="btn-secondary flex items-center gap-2 mx-auto">
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
