import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Search, ChevronDown, ChevronRight, Archive, CheckCircle2,
  Loader2, Calendar, Flag, Paperclip, Download, FileText,
  Image, BarChart3, Zap, Leaf, ClipboardList, BookOpen
} from 'lucide-react'

const TYPE_COLORS = {
  dmaic:   'bg-blue-50 text-blue-700 border-blue-200',
  dmadv:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  kaizen:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  lean:    'bg-green-50 text-green-700 border-green-200',
  general: 'bg-gray-50 text-gray-600 border-gray-200',
  custom:  'bg-purple-50 text-purple-700 border-purple-200',
}

function fileIcon(mimeType) {
  if (!mimeType) return FileText
  if (mimeType.startsWith('image/')) return Image
  return FileText
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function PhaseTaskList({ tasks, phaseName }) {
  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-3 mb-1.5">
        <p className="text-xs font-semibold text-brand-charcoal-dark capitalize">{phaseName}</p>
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-status-green rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-brand-charcoal/50 flex-shrink-0">{done}/{tasks.length} · {pct}%</span>
      </div>
      <div className="space-y-1">
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 px-2 py-1 rounded">
            <CheckCircle2 size={12} className={t.status === 'done' ? 'text-status-green' : 'text-brand-charcoal/20'} />
            <span className={`text-xs ${t.status === 'done' ? 'line-through text-brand-charcoal/40' : 'text-brand-charcoal'}`}>{t.title}</span>
            {t.due_date && (
              <span className="text-xs text-brand-charcoal/30 ml-auto flex-shrink-0">
                {new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ project, companyId }) {
  const [expanded, setExpanded] = useState(false)
  const [tasks, setTasks] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)

  const loadDetails = useCallback(async () => {
    if (tasks !== null) return
    setLoading(true)
    const [tasksRes, docsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('project_id', project.id)
        .order('order_index', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
      supabase.from('task_documents').select('*').eq('project_id', project.id)
        .order('created_at', { ascending: false }),
    ])
    setTasks(tasksRes.data || [])
    setDocuments(docsRes.data || [])
    setLoading(false)
  }, [project.id, tasks])

  const handleExpand = () => {
    setExpanded(e => !e)
    if (!expanded) loadDetails()
  }

  const handleDownload = async (doc) => {
    const { data } = await supabase.storage.from('task-documents').createSignedUrl(doc.file_path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const typeColor = TYPE_COLORS[project.type?.toLowerCase()] || TYPE_COLORS.general
  const totalTasks = tasks?.length || 0
  const doneTasks = tasks?.filter(t => t.status === 'done').length || 0
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // Group tasks by phase for display
  const tasksByPhase = tasks ? tasks.reduce((acc, t) => {
    const phase = t.phase || 'unassigned'
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(t)
    return acc
  }, {}) : {}

  const lessonsLearned = tasks?.filter(t =>
    t.title?.toLowerCase().includes('lessons learned') ||
    t.template_section?.toLowerCase().includes('lessons learned')
  ) || []

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      {/* Card header */}
      <button onClick={handleExpand} className="w-full flex items-start gap-4 p-5 text-left hover:bg-surface-secondary/30 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${typeColor} uppercase`}>{project.type || 'general'}</span>
            {project.department && (
              <span className="text-xs text-brand-charcoal/50">{project.department}</span>
            )}
          </div>
          <h3 className="font-semibold text-brand-charcoal-dark text-base leading-snug">{project.name}</h3>
          {project.description && (
            <p className="text-xs text-brand-charcoal/60 mt-1 line-clamp-2">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2">
            {project.completed_date && (
              <span className="text-xs text-brand-charcoal/50 flex items-center gap-1">
                <Calendar size={11} />
                Completed {new Date(project.completed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {project.actual_savings && (
              <span className="text-xs text-status-green font-medium">
                ${Number(project.actual_savings).toLocaleString()} saved
              </span>
            )}
          </div>
        </div>

        {/* Mini stats */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-lg font-bold text-status-green">{pct || '—'}%</p>
            <p className="text-xs text-brand-charcoal/50">complete</p>
          </div>
          {documents.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-brand-charcoal/50">
              <Paperclip size={12} />
              {documents.length} docs
            </div>
          )}
          {expanded ? <ChevronDown size={16} className="text-brand-charcoal/40" /> : <ChevronRight size={16} className="text-brand-charcoal/40" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-surface-secondary/20">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-brand-orange" /></div>
          ) : (
            <div className="grid grid-cols-5 gap-6">
              {/* Phase breakdown (3/5) */}
              <div className="col-span-3">
                <p className="text-xs font-semibold text-brand-charcoal-dark uppercase tracking-wide mb-3">Phase Breakdown</p>
                {Object.keys(tasksByPhase).length === 0 ? (
                  <p className="text-xs text-brand-charcoal/40">No tasks recorded</p>
                ) : (
                  Object.entries(tasksByPhase).map(([phase, pTasks]) => (
                    <PhaseTaskList key={phase} phaseName={phase} tasks={pTasks} />
                  ))
                )}
              </div>

              {/* Docs + Lessons Learned (2/5) */}
              <div className="col-span-2 space-y-4">
                {/* Documents */}
                <div>
                  <p className="text-xs font-semibold text-brand-charcoal-dark uppercase tracking-wide mb-2">
                    Documents ({documents.length})
                  </p>
                  {documents.length === 0 ? (
                    <p className="text-xs text-brand-charcoal/40">No documents</p>
                  ) : (
                    <div className="space-y-1.5">
                      {documents.slice(0, 8).map(doc => {
                        const FIcon = fileIcon(doc.mime_type)
                        return (
                          <button key={doc.id} onClick={() => handleDownload(doc)}
                            className="w-full flex items-center gap-2 p-2 rounded hover:bg-white border border-transparent hover:border-gray-100 transition-colors text-left">
                            <FIcon size={14} className="text-brand-charcoal/40 flex-shrink-0" />
                            <span className="text-xs text-brand-charcoal truncate flex-1">{doc.file_name}</span>
                            <Download size={11} className="text-brand-charcoal/30 flex-shrink-0" />
                          </button>
                        )
                      })}
                      {documents.length > 8 && (
                        <p className="text-xs text-brand-charcoal/40 pl-2">+{documents.length - 8} more</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Lessons Learned highlight */}
                {lessonsLearned.length > 0 && lessonsLearned[0].description && (
                  <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-brand-orange mb-1">Lessons Learned</p>
                    <p className="text-xs text-brand-charcoal-dark">{lessonsLearned[0].description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Repository() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  useEffect(() => {
    if (!userProfile?.company_id) return
    supabase.from('projects')
      .select('id, name, type, status, department, description, completed_date, actual_savings, phase')
      .eq('company_id', userProfile.company_id)
      .eq('status', 'completed')
      .order('completed_date', { ascending: false })
      .then(({ data }) => {
        setProjects(data || [])
        setLoading(false)
      })
  }, [userProfile])

  const filtered = projects.filter(p => {
    const matchesSearch = !search || [p.name, p.description, p.department].some(
      f => f?.toLowerCase().includes(search.toLowerCase())
    )
    const matchesType = typeFilter === 'all' || p.type === typeFilter
    return matchesSearch && matchesType
  })

  const types = ['all', ...new Set(projects.map(p => p.type).filter(Boolean))]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Archive size={18} className="text-brand-orange" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-charcoal-dark">Completed Projects Repository</h1>
          <p className="text-sm text-brand-charcoal/60">Searchable archive of completed projects — tasks, documents, and lessons learned</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-brand-charcoal-dark">{projects.length}</p>
          <p className="text-xs text-brand-charcoal/50">completed projects</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects, descriptions, departments..."
            className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-100 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange/40"
          />
        </div>
        <div className="flex gap-1">
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${typeFilter === t ? 'bg-brand-orange text-white' : 'bg-white border border-gray-100 text-brand-charcoal hover:bg-surface-secondary'}`}
            >
              {t === 'all' ? 'All Types' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-orange" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 px-8 py-16 text-center">
          <Archive size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="font-semibold text-brand-charcoal-dark mb-1">No completed projects yet</p>
          <p className="text-sm text-brand-charcoal/50">
            Projects appear here when their status is set to "completed".<br />
            When all phase tasks are done, projects are automatically moved here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 px-8 py-12 text-center">
          <Search size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-brand-charcoal/60">No projects match your search</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(project => (
            <ProjectCard key={project.id} project={project} companyId={userProfile?.company_id} />
          ))}
          {search && (
            <p className="text-xs text-brand-charcoal/40 text-center py-2">
              {filtered.length} of {projects.length} projects match "{search}"
            </p>
          )}
        </div>
      )}
    </div>
  )
}
