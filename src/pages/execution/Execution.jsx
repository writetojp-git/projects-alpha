import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, AlertCircle, ChevronDown, Calendar, Flag,
  CheckCircle2, Circle, Clock, AlertTriangle, Loader2,
  GripVertical, Edit2, Trash2, User, MessageSquare,
  ShieldAlert, Send, CheckCheck
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES = [
  { id: 'todo',        label: 'To Do',       color: 'bg-surface-secondary text-brand-charcoal',  dot: 'bg-brand-charcoal/40', icon: Circle },
  { id: 'in_progress', label: 'In Progress',  color: 'bg-blue-50 text-blue-700',                  dot: 'bg-blue-500',          icon: Clock },
  { id: 'blocked',     label: 'Blocked',      color: 'bg-status-red-bg text-status-red',          dot: 'bg-status-red',        icon: AlertTriangle },
  { id: 'done',        label: 'Done',         color: 'bg-status-green-bg text-status-green',      dot: 'bg-status-green',      icon: CheckCircle2 },
]

const PRIORITIES = [
  { id: 'low',      label: 'Low',      cls: 'text-brand-charcoal/60',  flag: 'text-brand-charcoal/40' },
  { id: 'medium',   label: 'Medium',   cls: 'text-status-yellow',      flag: 'text-status-yellow' },
  { id: 'high',     label: 'High',     cls: 'text-status-red',         flag: 'text-status-red' },
  { id: 'critical', label: 'Critical', cls: 'text-red-700 font-bold',  flag: 'text-red-700' },
]

const PHASES = ['define', 'measure', 'analyze', 'improve', 'control']

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────
function TaskDetailModal({ task, project, companyId, userId, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('comments')
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    phase: task?.phase || '',
    due_date: task?.due_date || '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Comments
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  // Blockers
  const [blockers, setBlockers] = useState([])
  const [blockersLoading, setBlockersLoading] = useState(false)
  const [blockerText, setBlockerText] = useState('')
  const [loggingBlocker, setLoggingBlocker] = useState(false)

  // Load comments
  const fetchComments = useCallback(async () => {
    if (!task?.id) return
    setCommentsLoading(true)
    const { data } = await supabase
      .from('task_comments')
      .select('*, profiles(full_name)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setCommentsLoading(false)
  }, [task?.id])

  // Load blockers
  const fetchBlockers = useCallback(async () => {
    if (!task?.id) return
    setBlockersLoading(true)
    const { data } = await supabase
      .from('task_blockers')
      .select('*, profiles(full_name)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: false })
    setBlockers(data || [])
    setBlockersLoading(false)
  }, [task?.id])

  useEffect(() => {
    fetchComments()
    fetchBlockers()
  }, [fetchComments, fetchBlockers])

  const handleSave = async () => {
    if (!form.title.trim()) { setSaveError('Task title is required'); return }
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('tasks').update({
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      phase: form.phase || null,
      due_date: form.due_date || null,
      updated_by: userId,
    }).eq('id', task.id)
    if (error) { setSaveError(error.message); setSaving(false) }
    else onSaved()
  }

  const handlePostComment = async () => {
    if (!commentText.trim()) return
    setPostingComment(true)
    await supabase.from('task_comments').insert({
      company_id: companyId,
      task_id: task.id,
      user_id: userId,
      content: commentText.trim(),
    })
    setCommentText('')
    await fetchComments()
    setPostingComment(false)
  }

  const handleLogBlocker = async () => {
    if (!blockerText.trim()) return
    setLoggingBlocker(true)
    await supabase.from('task_blockers').insert({
      company_id: companyId,
      task_id: task.id,
      project_id: project.id,
      reported_by: userId,
      description: blockerText.trim(),
      status: 'open',
    })
    setBlockerText('')
    await fetchBlockers()
    setLoggingBlocker(false)
  }

  const handleResolveBlocker = async (blockerId) => {
    await supabase.from('task_blockers').update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    }).eq('id', blockerId)
    fetchBlockers()
  }

  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-border flex-shrink-0">
          <h3 className="font-bold text-brand-charcoal-dark">Task Detail</h3>
          <button onClick={onClose}><X size={18} className="text-brand-charcoal" /></button>
        </div>

        {/* Body — two columns */}
        <div className="flex-1 overflow-hidden flex">

          {/* Left: task info (60%) */}
          <div className="w-3/5 p-5 border-r border-surface-border overflow-y-auto space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input font-medium"
                placeholder="Task title"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input min-h-[80px] resize-none"
                placeholder="Additional details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input">
                  {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Phase</label>
                <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))} className="input">
                  <option value="">— Any —</option>
                  {PHASES.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className={`input ${isOverdue ? 'border-status-red/40 text-status-red' : ''}`}
                />
              </div>
            </div>
            {saveError && <div className="flex items-center gap-2 text-status-red text-sm"><AlertCircle size={14}/>{saveError}</div>}
            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Right: comments + blockers (40%) */}
          <div className="w-2/5 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-surface-border flex-shrink-0">
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'comments' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-brand-charcoal/60 hover:text-brand-charcoal'
                }`}
              >
                <MessageSquare size={14} />
                Comments
                {comments.length > 0 && <span className="text-xs bg-surface-secondary text-brand-charcoal rounded-full px-1.5 py-0.5">{comments.length}</span>}
              </button>
              <button
                onClick={() => setActiveTab('blockers')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'blockers' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-brand-charcoal/60 hover:text-brand-charcoal'
                }`}
              >
                <ShieldAlert size={14} />
                Blockers
                {blockers.filter(b => b.status === 'open').length > 0 && (
                  <span className="text-xs bg-status-red-bg text-status-red rounded-full px-1.5 py-0.5">
                    {blockers.filter(b => b.status === 'open').length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">

              {/* Comments tab */}
              {activeTab === 'comments' && (
                <div className="flex flex-col h-full gap-3">
                  <div className="flex-1 space-y-3">
                    {commentsLoading ? (
                      <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-brand-orange" /></div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-brand-charcoal/40">No comments yet</p>
                      </div>
                    ) : (
                      comments.map(c => (
                        <div key={c.id} className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {(c.profiles?.full_name || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-semibold text-brand-charcoal-dark">
                                {c.profiles?.full_name || 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                            </div>
                            <p className="text-sm text-brand-charcoal mt-0.5 break-words">{c.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Post comment */}
                  <div className="flex gap-2 flex-shrink-0 pt-2 border-t border-surface-border">
                    <input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePostComment()}
                      placeholder="Add a comment..."
                      className="input text-sm flex-1"
                    />
                    <button
                      onClick={handlePostComment}
                      disabled={!commentText.trim() || postingComment}
                      className="btn-primary text-sm px-3 py-2 flex-shrink-0 disabled:opacity-50"
                    >
                      {postingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Blockers tab */}
              {activeTab === 'blockers' && (
                <div className="flex flex-col gap-3">
                  {blockersLoading ? (
                    <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-brand-orange" /></div>
                  ) : blockers.length === 0 ? (
                    <div className="text-center py-6">
                      <ShieldAlert size={24} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-brand-charcoal/40">No blockers logged</p>
                    </div>
                  ) : (
                    blockers.map(b => (
                      <div key={b.id} className={`rounded-lg p-3 border ${b.status === 'open' ? 'bg-status-red-bg border-status-red/20' : 'bg-status-green-bg border-status-green/20'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-brand-charcoal-dark break-words">{b.description}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-xs font-medium ${b.status === 'open' ? 'text-status-red' : 'text-status-green'}`}>
                                {b.status === 'open' ? '● Open' : '● Resolved'}
                              </span>
                              <span className="text-xs text-gray-400">{timeAgo(b.created_at)}</span>
                            </div>
                            {b.status === 'resolved' && b.resolved_at && (
                              <p className="text-xs text-status-green/70 mt-0.5">Resolved {timeAgo(b.resolved_at)}</p>
                            )}
                          </div>
                          {b.status === 'open' && (
                            <button
                              onClick={() => handleResolveBlocker(b.id)}
                              className="flex items-center gap-1 text-xs text-status-green bg-white border border-status-green/30 px-2 py-1 rounded hover:bg-status-green-bg transition-colors flex-shrink-0"
                            >
                              <CheckCheck size={11} /> Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Log blocker form */}
                  <div className="pt-2 border-t border-surface-border space-y-2">
                    <label className="label text-xs">Log a Blocker</label>
                    <textarea
                      value={blockerText}
                      onChange={e => setBlockerText(e.target.value)}
                      rows={2}
                      className="input text-sm resize-none"
                      placeholder="Describe what's blocking this task..."
                    />
                    <button
                      onClick={handleLogBlocker}
                      disabled={!blockerText.trim() || loggingBlocker}
                      className="btn-primary text-sm w-full flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loggingBlocker ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                      Log Blocker
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onEdit, onDetail, onStatusChange, onDelete }) {
  const status = STATUSES.find(s => s.id === task.status) || STATUSES[0]
  const priority = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[1]
  const SIcon = status.icon

  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()

  return (
    <div
      className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group cursor-pointer ${task.status === 'done' ? 'opacity-70' : ''}`}
      onClick={(e) => {
        // Only open detail if not clicking the status button, edit, or delete
        if (e.target.closest('[data-action]')) return
        onDetail(task)
      }}
    >
      <div className="flex items-start gap-2">
        <button
          data-action="status"
          onClick={(e) => {
            e.stopPropagation()
            const next = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : task.status === 'done' ? 'todo' : task.status
            onStatusChange(task.id, next)
          }}
          className="mt-0.5 flex-shrink-0 text-brand-charcoal/40 hover:text-brand-orange transition-colors"
        >
          <SIcon size={16} className={task.status === 'done' ? 'text-status-green' : task.status === 'blocked' ? 'text-status-red' : task.status === 'in_progress' ? 'text-blue-500' : ''} />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-brand-charcoal/50' : 'text-brand-charcoal-dark'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-brand-charcoal mt-0.5 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.phase && (
              <span className="text-xs px-1.5 py-0.5 bg-surface-secondary text-brand-charcoal rounded capitalize">{task.phase}</span>
            )}
            <Flag size={11} className={priority.flag} />
            <span className={`text-xs ${priority.cls}`}>{priority.label}</span>
            {task.due_date && (
              <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? 'text-status-red font-medium' : 'text-brand-charcoal'}`}>
                <Calendar size={10} /> {new Date(task.due_date).toLocaleDateString()}
                {isOverdue && ' ⚠'}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            data-action="edit"
            onClick={(e) => { e.stopPropagation(); onEdit(task) }}
            className="p-1 text-brand-charcoal hover:text-brand-orange transition-colors"
          >
            <Edit2 size={12} />
          </button>
          <button
            data-action="delete"
            onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
            className="p-1 text-brand-charcoal hover:text-status-red transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({ status, tasks, onAddTask, onEdit, onDetail, onStatusChange, onDelete }) {
  const SIcon = status.icon
  return (
    <div className="flex flex-col min-w-[260px] max-w-[280px] flex-1">
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${status.color}`}>
        <div className="flex items-center gap-2">
          <SIcon size={14} />
          <span className="text-xs font-semibold">{status.label}</span>
          <span className="text-xs bg-white/50 rounded-full px-1.5 py-0.5 font-bold">{tasks.length}</span>
        </div>
        <button onClick={onAddTask} className="text-current opacity-60 hover:opacity-100 transition-opacity">
          <Plus size={14} />
        </button>
      </div>
      <div className="flex-1 p-2 space-y-2 bg-surface-secondary/50 rounded-b-lg min-h-[200px]">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDetail={onDetail}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-brand-charcoal/30 text-xs">No tasks</div>
        )}
      </div>
    </div>
  )
}

// ─── Task Edit Modal ───────────────────────────────────────────────────────────
function TaskModal({ task, project, companyId, userId, onClose, onSaved }) {
  const isEdit = !!task?.id
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    phase: task?.phase || project?.phase || '',
    due_date: task?.due_date || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Task title is required'); return }
    setSaving(true)
    setError('')
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      phase: form.phase || null,
      due_date: form.due_date || null,
      updated_by: userId,
    }
    let err
    if (isEdit) {
      const res = await supabase.from('tasks').update(payload).eq('id', task.id)
      err = res.error
    } else {
      const res = await supabase.from('tasks').insert({
        ...payload, project_id: project.id, company_id: companyId, created_by: userId,
      })
      err = res.error
    }
    if (err) { setError(err.message); setSaving(false) }
    else onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h3 className="font-bold text-brand-charcoal-dark">{isEdit ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose}><X size={18} className="text-brand-charcoal" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="What needs to be done?" autoFocus />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input min-h-[80px] resize-none" placeholder="Additional details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input">
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phase</label>
              <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))} className="input">
                <option value="">— Any —</option>
                {PHASES.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
            </div>
          </div>
          {error && <div className="flex items-center gap-2 text-status-red text-sm"><AlertCircle size={14}/>{error}</div>}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-surface-border">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Execution() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [modalConfig, setModalConfig] = useState(null) // { task?, defaultStatus? }
  const [detailTask, setDetailTask] = useState(null)   // task for detail modal

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  useEffect(() => {
    if (!userProfile?.company_id) return
    supabase.from('projects').select('id, name, phase, health, type')
      .eq('company_id', userProfile.company_id)
      .not('status', 'eq', 'cancelled')
      .order('name')
      .then(({ data }) => {
        const list = data || []
        setProjects(list)
        if (list.length > 0 && !selectedProjectId) setSelectedProjectId(list[0].id)
        setLoading(false)
      })
  }, [userProfile])

  const fetchTasks = useCallback(async (projectId) => {
    if (!projectId || !userProfile?.company_id) return
    setTasksLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: true })
    if (error) {
      if (error.message?.includes('does not exist')) setMigrationNeeded(true)
    } else {
      setMigrationNeeded(false)
      setTasks(data || [])
    }
    setTasksLoading(false)
  }, [userProfile?.company_id])

  useEffect(() => {
    if (selectedProjectId) fetchTasks(selectedProjectId)
  }, [selectedProjectId, fetchTasks])

  const handleStatusChange = async (taskId, newStatus) => {
    await supabase.from('tasks').update({ status: newStatus, ...(newStatus === 'done' ? { completed_at: new Date().toISOString() } : { completed_at: null }) }).eq('id', taskId)
    fetchTasks(selectedProjectId)
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    fetchTasks(selectedProjectId)
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  const filteredTasks = tasks.filter(t => phaseFilter === 'all' || t.phase === phaseFilter)

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s.id] = filteredTasks.filter(t => t.status === s.id)
    return acc
  }, {})

  const stats = [
    { label: 'Total', value: filteredTasks.length, color: 'text-brand-charcoal-dark' },
    { label: 'In Progress', value: tasksByStatus.in_progress?.length || 0, color: 'text-blue-600' },
    { label: 'Blocked', value: tasksByStatus.blocked?.length || 0, color: 'text-status-red' },
    { label: 'Done', value: tasksByStatus.done?.length || 0, color: 'text-status-green' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal-dark">Execution Tracker</h1>
          <p className="text-sm text-brand-charcoal mt-1">Manage tasks and track progress across DMAIC phases.</p>
        </div>
        <button onClick={() => setModalConfig({ defaultStatus: 'todo' })} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Project Selector + Phase Filter */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex-shrink-0">
          <label className="label">Project</label>
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="input pr-8 font-medium min-w-[260px]"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-shrink-0">
          <label className="label">Phase Filter</label>
          <div className="flex gap-1">
            <button onClick={() => setPhaseFilter('all')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${phaseFilter === 'all' ? 'bg-brand-orange text-white' : 'bg-surface-secondary text-brand-charcoal hover:bg-surface-border'}`}>All</button>
            {PHASES.map(p => (
              <button key={p} onClick={() => setPhaseFilter(p)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${phaseFilter === p ? 'bg-brand-orange text-white' : 'bg-surface-secondary text-brand-charcoal hover:bg-surface-border'}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-orange" />
        </div>
      ) : migrationNeeded ? (
        <div className="p-6 bg-white border border-status-yellow rounded-xl">
          <div className="flex items-center gap-2 text-status-yellow font-semibold mb-2"><AlertCircle size={16}/> Database Migration Required</div>
          <p className="text-sm text-brand-charcoal">Run <strong>002_tasks_and_notes.sql</strong> in your Supabase SQL Editor to enable task tracking.</p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="flex items-center gap-4 mb-5 flex-wrap">
            {stats.map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
                <span className="text-sm text-brand-charcoal">{s.label}</span>
              </div>
            ))}
            {tasksByStatus.blocked?.length > 0 && (
              <span className="ml-2 text-xs text-status-red bg-status-red-bg px-2.5 py-1 rounded-full font-medium">
                ⚠ {tasksByStatus.blocked.length} task{tasksByStatus.blocked.length > 1 ? 's' : ''} blocked
              </span>
            )}
          </div>

          {/* Kanban Board */}
          {tasksLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {STATUSES.map(status => (
                <KanbanColumn
                  key={status.id}
                  status={status}
                  tasks={tasksByStatus[status.id] || []}
                  onAddTask={() => setModalConfig({ defaultStatus: status.id })}
                  onEdit={(task) => setModalConfig({ task })}
                  onDetail={(task) => setDetailTask(task)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Task Edit Modal */}
      {modalConfig && selectedProject && userProfile && (
        <TaskModal
          task={modalConfig.task}
          project={{ ...selectedProject, phase: modalConfig.task?.phase || selectedProject.phase }}
          companyId={userProfile.company_id}
          userId={userProfile.id}
          onClose={() => setModalConfig(null)}
          onSaved={() => { setModalConfig(null); fetchTasks(selectedProjectId) }}
        />
      )}

      {/* Task Detail Modal */}
      {detailTask && selectedProject && userProfile && (
        <TaskDetailModal
          task={detailTask}
          project={selectedProject}
          companyId={userProfile.company_id}
          userId={userProfile.id}
          onClose={() => setDetailTask(null)}
          onSaved={() => { setDetailTask(null); fetchTasks(selectedProjectId) }}
        />
      )}
    </div>
  )
}
