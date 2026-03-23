import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, AlertCircle, ChevronDown, Calendar, Flag,
  CheckCircle2, Circle, Clock, AlertTriangle, Loader2,
  GripVertical, Edit2, Trash2, User
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

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onEdit, onStatusChange, onDelete }) {
  const status = STATUSES.find(s => s.id === task.status) || STATUSES[0]
  const priority = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[1]
  const SIcon = status.icon

  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()

  return (
    <div className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group ${task.status === 'done' ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => {
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
          <button onClick={() => onEdit(task)} className="p-1 text-brand-charcoal hover:text-brand-orange transition-colors">
            <Edit2 size={12} />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 text-brand-charcoal hover:text-status-red transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({ status, tasks, onAddTask, onEdit, onStatusChange, onDelete }) {
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
          <TaskCard key={task.id} task={task} onEdit={onEdit} onStatusChange={onStatusChange} onDelete={onDelete} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-brand-charcoal/30 text-xs">No tasks</div>
        )}
      </div>
    </div>
  )
}

// ─── Task Modal ───────────────────────────────────────────────────────────────
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
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Task Modal */}
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
    </div>
  )
}
