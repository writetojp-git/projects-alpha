import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getTemplatePhasesForType } from '../../lib/templates'
import { seedTasksFromTemplate } from '../../lib/templateSeeding'
import {
  Plus, X, AlertCircle, Calendar, Flag,
  CheckCircle2, Circle, Clock, AlertTriangle, Loader2,
  Edit2, Trash2, MessageSquare, ShieldAlert, Send,
  CheckCheck, ChevronDown, ChevronRight, ClipboardList,
  Sparkles, Paperclip, Download, FileText, Image, X as XIcon,
  UploadCloud
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

const HEALTH_DOT = {
  green:  'bg-status-green',
  yellow: 'bg-status-yellow',
  red:    'bg-status-red',
}

function getPhasesForProject(project, companyId) {
  if (!project) return []
  return getTemplatePhasesForType(project.type, companyId).map(p => p.name)
}

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

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function fileIcon(mimeType) {
  if (!mimeType) return FileText
  if (mimeType.startsWith('image/')) return Image
  return FileText
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────
function TaskDetailModal({ task, project, companyId, userId, onClose, onSaved }) {
  const phases = getPhasesForProject(project, companyId)
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

  // Documents
  const [documents, setDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  const fetchComments = useCallback(async () => {
    if (!task?.id) return
    setCommentsLoading(true)
    const { data } = await supabase.from('task_comments')
      .select('*, profiles(full_name)').eq('task_id', task.id).order('created_at', { ascending: true })
    setComments(data || [])
    setCommentsLoading(false)
  }, [task?.id])

  const fetchBlockers = useCallback(async () => {
    if (!task?.id) return
    setBlockersLoading(true)
    const { data } = await supabase.from('task_blockers')
      .select('*, profiles(full_name)').eq('task_id', task.id).order('created_at', { ascending: false })
    setBlockers(data || [])
    setBlockersLoading(false)
  }, [task?.id])

  const fetchDocuments = useCallback(async () => {
    if (!task?.id) return
    setDocsLoading(true)
    const { data } = await supabase.from('task_documents')
      .select('*, profiles(full_name)').eq('task_id', task.id).order('created_at', { ascending: false })
    setDocuments(data || [])
    setDocsLoading(false)
  }, [task?.id])

  useEffect(() => {
    fetchComments()
    fetchBlockers()
    fetchDocuments()
  }, [fetchComments, fetchBlockers, fetchDocuments])

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
    }).eq('id', task.id)
    if (error) { setSaveError(error.message); setSaving(false) }
    else onSaved()
  }

  const handlePostComment = async () => {
    if (!commentText.trim()) return
    setPostingComment(true)
    await supabase.from('task_comments').insert({
      company_id: companyId, task_id: task.id, user_id: userId, content: commentText.trim(),
    })
    setCommentText('')
    await fetchComments()
    setPostingComment(false)
  }

  const handleLogBlocker = async () => {
    if (!blockerText.trim()) return
    setLoggingBlocker(true)
    await supabase.from('task_blockers').insert({
      company_id: companyId, task_id: task.id, project_id: project.id,
      reported_by: userId, description: blockerText.trim(), status: 'open',
    })
    setBlockerText('')
    await fetchBlockers()
    setLoggingBlocker(false)
  }

  const handleResolveBlocker = async (blockerId) => {
    await supabase.from('task_blockers').update({
      status: 'resolved', resolved_at: new Date().toISOString(),
    }).eq('id', blockerId)
    fetchBlockers()
  }

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${companyId}/${project.id}/${task.id}/${Date.now()}_${safeName}`
    const { data: uploadData, error: storageError } = await supabase.storage
      .from('task-documents').upload(path, file)
    if (storageError) {
      setUploadError(storageError.message)
      setUploading(false)
      return
    }
    const { error: dbError } = await supabase.from('task_documents').insert({
      company_id: companyId, project_id: project.id, task_id: task.id,
      file_name: file.name, file_path: uploadData.path,
      file_size: file.size, mime_type: file.type, uploaded_by: userId,
    })
    if (dbError) setUploadError(dbError.message)
    else { await fetchDocuments(); e.target.value = '' }
    setUploading(false)
  }

  const handleDownload = async (doc) => {
    const { data } = await supabase.storage.from('task-documents').createSignedUrl(doc.file_path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDeleteDoc = async (doc) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return
    await supabase.storage.from('task-documents').remove([doc.file_path])
    await supabase.from('task_documents').delete().eq('id', doc.id)
    fetchDocuments()
  }

  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()

  const openBlockers = blockers.filter(b => b.status === 'open').length

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-surface-border flex-shrink-0">
          <h3 className="font-bold text-brand-charcoal-dark">Task Detail</h3>
          <button onClick={onClose}><X size={18} className="text-brand-charcoal" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left: task info */}
          <div className="w-3/5 p-5 border-r border-surface-border overflow-y-auto space-y-4">
            <div>
              <label className="label">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input font-medium" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input min-h-[72px] resize-none" placeholder="Notes, context, links..." />
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
                  <option value="">— Unassigned —</option>
                  {phases.map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={`input ${isOverdue ? 'border-status-red/40 text-status-red' : ''}`} />
              </div>
            </div>
            {task.completed_at && (
              <p className="text-xs text-status-green">✓ Completed {new Date(task.completed_at).toLocaleDateString()}</p>
            )}
            {saveError && <div className="flex items-center gap-2 text-status-red text-sm"><AlertCircle size={14}/>{saveError}</div>}
            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Right: tabs */}
          <div className="w-2/5 flex flex-col overflow-hidden">
            <div className="flex border-b border-surface-border flex-shrink-0">
              {[
                { id: 'comments', icon: MessageSquare, label: 'Comments', badge: comments.length },
                { id: 'blockers', icon: ShieldAlert, label: 'Blockers', badge: openBlockers, badgeRed: true },
                { id: 'documents', icon: Paperclip, label: 'Docs', badge: documents.length },
              ].map(tab => {
                const Icon = tab.icon
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${activeTab === tab.id ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-brand-charcoal/60 hover:text-brand-charcoal'}`}
                  >
                    <Icon size={13} />
                    {tab.label}
                    {tab.badge > 0 && (
                      <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab.badgeRed ? 'bg-status-red-bg text-status-red' : 'bg-surface-secondary text-brand-charcoal'}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Comments */}
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
                    ) : comments.map(c => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{(c.profiles?.full_name || 'U')[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-brand-charcoal-dark">{c.profiles?.full_name || 'Unknown'}</span>
                            <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-brand-charcoal mt-0.5 break-words">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 pt-2 border-t border-surface-border">
                    <input value={commentText} onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePostComment()}
                      placeholder="Add a comment..." className="input text-sm flex-1" />
                    <button onClick={handlePostComment} disabled={!commentText.trim() || postingComment}
                      className="btn-primary text-sm px-3 py-2 flex-shrink-0 disabled:opacity-50">
                      {postingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Blockers */}
              {activeTab === 'blockers' && (
                <div className="flex flex-col gap-3">
                  {blockersLoading ? (
                    <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-brand-orange" /></div>
                  ) : blockers.length === 0 ? (
                    <div className="text-center py-6">
                      <ShieldAlert size={24} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-brand-charcoal/40">No blockers logged</p>
                    </div>
                  ) : blockers.map(b => (
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
                        </div>
                        {b.status === 'open' && (
                          <button onClick={() => handleResolveBlocker(b.id)}
                            className="flex items-center gap-1 text-xs text-status-green bg-white border border-status-green/30 px-2 py-1 rounded hover:bg-status-green-bg transition-colors flex-shrink-0">
                            <CheckCheck size={11} /> Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-surface-border space-y-2">
                    <label className="label text-xs">Log a Blocker</label>
                    <textarea value={blockerText} onChange={e => setBlockerText(e.target.value)} rows={2} className="input text-sm resize-none" placeholder="Describe what's blocking this task..." />
                    <button onClick={handleLogBlocker} disabled={!blockerText.trim() || loggingBlocker}
                      className="btn-primary text-sm w-full flex items-center justify-center gap-2 disabled:opacity-50">
                      {loggingBlocker ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                      Log Blocker
                    </button>
                  </div>
                </div>
              )}

              {/* Documents */}
              {activeTab === 'documents' && (
                <div className="flex flex-col gap-3">
                  {docsLoading ? (
                    <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-brand-orange" /></div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-6">
                      <Paperclip size={24} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-brand-charcoal/40">No documents uploaded yet</p>
                    </div>
                  ) : documents.map(doc => {
                    const FIcon = fileIcon(doc.mime_type)
                    return (
                      <div key={doc.id} className="flex items-center gap-3 p-2.5 bg-surface-secondary/50 rounded-lg border border-gray-100 group">
                        <FIcon size={18} className="text-brand-charcoal/50 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-charcoal-dark truncate">{doc.file_name}</p>
                          <p className="text-xs text-brand-charcoal/50">
                            {formatBytes(doc.file_size)} · {timeAgo(doc.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handleDownload(doc)} title="Download"
                            className="p-1.5 text-brand-charcoal/50 hover:text-brand-orange transition-colors">
                            <Download size={14} />
                          </button>
                          <button onClick={() => handleDeleteDoc(doc)} title="Delete"
                            className="p-1.5 text-brand-charcoal/50 hover:text-status-red transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Upload */}
                  <div className="pt-2 border-t border-surface-border">
                    {uploadError && (
                      <p className="text-xs text-status-red mb-2">{uploadError}</p>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadFile}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-brand-charcoal/60 hover:border-brand-orange/40 hover:text-brand-orange transition-colors disabled:opacity-50">
                      {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                      {uploading ? 'Uploading...' : 'Upload Document'}
                    </button>
                    <p className="text-xs text-brand-charcoal/40 text-center mt-1.5">
                      PDF, Word, Excel, PowerPoint, Images — max 50 MB
                    </p>
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

// ─── Task Add/Edit Modal ──────────────────────────────────────────────────────
function TaskModal({ task, project, defaultPhase, companyId, userId, onClose, onSaved }) {
  const phases = getPhasesForProject(project, companyId)
  const isEdit = !!task?.id
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    phase: task?.phase || defaultPhase || '',
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
          <h3 className="font-bold text-brand-charcoal-dark">{isEdit ? 'Edit Task' : 'Add Task'}</h3>
          <button onClick={onClose}><X size={18} className="text-brand-charcoal" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="What needs to be done?" autoFocus />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input min-h-[72px] resize-none" placeholder="Additional details..." />
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
                <option value="">— Unassigned —</option>
                {phases.map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
            </div>
          </div>
          {error && <div className="flex items-center gap-2 text-status-red text-sm"><AlertCircle size={14}/>{error}</div>}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-surface-border">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, onStatusChange, onEdit, onDetail, onDelete }) {
  const status = STATUSES.find(s => s.id === task.status) || STATUSES[0]
  const priority = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[1]
  const SIcon = status.icon
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()

  const cycleStatus = () => {
    const order = ['todo', 'in_progress', 'done']
    const idx = order.indexOf(task.status)
    const next = order[(idx + 1) % order.length]
    onStatusChange(task.id, next)
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 hover:bg-surface-secondary/40 group transition-colors ${task.status === 'done' ? 'opacity-60' : ''}`}>
      <button onClick={cycleStatus} className="flex-shrink-0 text-brand-charcoal/40 hover:text-brand-orange transition-colors" title={`${status.label} — click to advance`}>
        <SIcon size={16} className={
          task.status === 'done' ? 'text-status-green' :
          task.status === 'blocked' ? 'text-status-red' :
          task.status === 'in_progress' ? 'text-blue-500' : ''
        } />
      </button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onDetail(task)}>
        <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-brand-charcoal/50' : 'text-brand-charcoal-dark'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-brand-charcoal/60 truncate mt-0.5">{task.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 w-20">
        <Flag size={11} className={priority.flag} />
        <span className={`text-xs ${priority.cls}`}>{priority.label}</span>
      </div>
      <div className="flex-shrink-0 w-24">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>
      <div className="flex-shrink-0 w-24">
        {task.due_date ? (
          <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-status-red font-medium' : 'text-brand-charcoal/60'}`}>
            <Calendar size={11} />
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {isOverdue && ' ⚠'}
          </span>
        ) : (
          <span className="text-xs text-brand-charcoal/30">no due date</span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => onEdit(task)} className="p-1 text-brand-charcoal/50 hover:text-brand-orange transition-colors"><Edit2 size={12} /></button>
        <button onClick={() => onDelete(task.id)} className="p-1 text-brand-charcoal/50 hover:text-status-red transition-colors"><Trash2 size={12} /></button>
      </div>
    </div>
  )
}

// ─── Phase Section ────────────────────────────────────────────────────────────
function PhaseSection({ phaseName, tasks, isActive, onAddTask, onStatusChange, onEdit, onDetail, onDelete }) {
  const [expanded, setExpanded] = useState(isActive || tasks.some(t => t.status !== 'done'))
  const done = tasks.filter(t => t.status === 'done').length
  const blocked = tasks.filter(t => t.status === 'blocked').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  return (
    <div className={`border rounded-lg overflow-hidden ${isActive ? 'border-brand-orange/40' : 'border-gray-100'}`}>
      <button onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-brand-orange/5 hover:bg-brand-orange/10' : 'bg-white hover:bg-surface-secondary/50'}`}
      >
        {expanded ? <ChevronDown size={14} className="flex-shrink-0 text-brand-charcoal/50" /> : <ChevronRight size={14} className="flex-shrink-0 text-brand-charcoal/50" />}
        <span className={`text-sm font-semibold ${isActive ? 'text-brand-orange' : 'text-brand-charcoal-dark'}`}>{phaseName}</span>
        {isActive && <span className="text-xs bg-brand-orange text-white px-2 py-0.5 rounded-full font-medium flex-shrink-0">Active</span>}
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          {inProgress > 0 && <span className="text-xs text-blue-600">{inProgress} in progress</span>}
          {blocked > 0 && <span className="text-xs text-status-red font-medium">⚠ {blocked} blocked</span>}
          {tasks.length > 0 ? (
            <>
              <span className="text-xs text-brand-charcoal/50">{done}/{tasks.length} done</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-status-green rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-semibold text-brand-charcoal-dark w-8 text-right">{pct}%</span>
              </div>
            </>
          ) : (
            <span className="text-xs text-brand-charcoal/30">0 tasks</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="bg-white">
          {tasks.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-1.5 border-b border-gray-100 bg-surface-secondary/30">
              <div className="w-4 flex-shrink-0" />
              <div className="flex-1 text-xs text-brand-charcoal/50 font-medium">Task</div>
              <div className="w-20 text-xs text-brand-charcoal/50 font-medium flex-shrink-0">Priority</div>
              <div className="w-24 text-xs text-brand-charcoal/50 font-medium flex-shrink-0">Status</div>
              <div className="w-24 text-xs text-brand-charcoal/50 font-medium flex-shrink-0">Due Date</div>
              <div className="w-12 flex-shrink-0" />
            </div>
          )}
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} onStatusChange={onStatusChange}
              onEdit={onEdit} onDetail={onDetail} onDelete={onDelete} />
          ))}
          {tasks.length === 0 && (
            <div className="px-4 py-4 text-center">
              <p className="text-xs text-brand-charcoal/40">No tasks in this phase yet</p>
            </div>
          )}
          <div className="px-4 py-2.5 border-t border-gray-50">
            <button onClick={() => onAddTask(phaseName.toLowerCase())}
              className="flex items-center gap-1.5 text-xs text-brand-charcoal/50 hover:text-brand-orange transition-colors">
              <Plus size={13} /> Add task to {phaseName}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Execution() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [phaseAdvanceMsg, setPhaseAdvanceMsg] = useState('')
  const [modalConfig, setModalConfig] = useState(null)
  const [detailTask, setDetailTask] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  useEffect(() => {
    if (!userProfile?.company_id) return
    supabase.from('projects')
      .select('id, name, phase, health, type, status, department')
      .eq('company_id', userProfile.company_id)
      .not('status', 'eq', 'cancelled')
      .order('name')
      .then(({ data }) => {
        const list = data || []
        setProjects(list)
        if (list.length > 0) setSelectedProjectId(p => p || list[0].id)
        setLoading(false)
      })
  }, [userProfile])

  const fetchTasks = useCallback(async (projectId) => {
    if (!projectId || !userProfile?.company_id) return
    setTasksLoading(true)
    const { data, error } = await supabase.from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('company_id', userProfile.company_id)
      .order('order_index', { ascending: true, nullsFirst: false })
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
    if (selectedProjectId) {
      setTasks([])
      fetchTasks(selectedProjectId)
    }
  }, [selectedProjectId, fetchTasks])

  const handleStatusChange = async (taskId, newStatus) => {
    const now = new Date().toISOString()
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'done' ? now : null,
    }).eq('id', taskId)

    // Reload tasks
    const { data: updatedTasks } = await supabase.from('tasks')
      .select('*')
      .eq('project_id', selectedProjectId)
      .eq('company_id', userProfile.company_id)
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (updatedTasks) {
      setTasks(updatedTasks)

      // Check if all tasks in this phase are done → auto-advance phase
      if (newStatus === 'done') {
        const changedTask = updatedTasks.find(t => t.id === taskId)
        if (changedTask?.phase) {
          const phaseTasks = updatedTasks.filter(t => t.phase?.toLowerCase() === changedTask.phase.toLowerCase())
          const allDone = phaseTasks.length > 0 && phaseTasks.every(t => t.status === 'done')
          if (allDone) {
            const phases = getPhasesForProject(selectedProject, userProfile.company_id)
            const currentIdx = phases.findIndex(p => p.toLowerCase() === changedTask.phase.toLowerCase())
            if (currentIdx >= 0 && currentIdx < phases.length - 1) {
              const nextPhase = phases[currentIdx + 1]
              await supabase.from('projects').update({ phase: nextPhase.toLowerCase() }).eq('id', selectedProjectId)
              setProjects(prev => prev.map(p =>
                p.id === selectedProjectId ? { ...p, phase: nextPhase.toLowerCase() } : p
              ))
              setPhaseAdvanceMsg(`✓ ${phases[currentIdx]} complete — advanced to ${nextPhase}`)
              setTimeout(() => setPhaseAdvanceMsg(''), 5000)
            } else if (currentIdx === phases.length - 1) {
              // Last phase done — project complete
              await supabase.from('projects').update({
                status: 'completed',
                phase: changedTask.phase,
              }).eq('id', selectedProjectId)
              setProjects(prev => prev.map(p =>
                p.id === selectedProjectId ? { ...p, status: 'completed', phase: changedTask.phase } : p
              ))
              setPhaseAdvanceMsg('🎉 All phases complete! Project marked as completed.')
              setTimeout(() => setPhaseAdvanceMsg(''), 7000)
            }
          }
        }
      }
    }
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    fetchTasks(selectedProjectId)
  }

  const handleSeedFromTemplate = async () => {
    if (!selectedProject || !userProfile) return
    setSeeding(true)
    const { count, error } = await seedTasksFromTemplate(selectedProject, userProfile.company_id, userProfile.id)
    if (error) {
      alert('Failed to seed tasks: ' + (error.message || error))
    } else {
      await fetchTasks(selectedProjectId)
      setPhaseAdvanceMsg(`✓ ${count} tasks created from ${selectedProject.type?.toUpperCase()} template`)
      setTimeout(() => setPhaseAdvanceMsg(''), 5000)
    }
    setSeeding(false)
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const phases = getPhasesForProject(selectedProject, userProfile?.company_id)
  const activePhase = selectedProject?.phase?.toLowerCase()

  const tasksByPhase = phases.reduce((acc, p) => {
    acc[p.toLowerCase()] = tasks.filter(t => t.phase?.toLowerCase() === p.toLowerCase())
    return acc
  }, {})
  const unassignedTasks = tasks.filter(t =>
    !t.phase || !phases.map(p => p.toLowerCase()).includes(t.phase?.toLowerCase())
  )

  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const blocked = tasks.filter(t => t.status === 'blocked').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <div className="w-60 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-xs font-semibold text-brand-charcoal-dark uppercase tracking-wide">Active Projects</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-brand-orange" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-xs text-brand-charcoal/50 text-center py-8">No active projects</p>
          ) : projects.map(p => (
            <button key={p.id} onClick={() => setSelectedProjectId(p.id)}
              className={`w-full text-left px-4 py-2.5 transition-colors hover:bg-surface-secondary/50 ${selectedProjectId === p.id ? 'bg-brand-orange/5 border-r-2 border-brand-orange' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${HEALTH_DOT[p.health] || 'bg-gray-300'}`} />
                <span className={`text-sm leading-snug truncate ${selectedProjectId === p.id ? 'text-brand-orange font-semibold' : 'text-brand-charcoal-dark font-medium'}`}>
                  {p.name}
                </span>
              </div>
              {p.phase && (
                <p className="text-xs text-brand-charcoal/50 mt-0.5 pl-4 capitalize">{p.phase}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto bg-surface-secondary/30">
        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <ClipboardList size={36} className="text-gray-300" />
            <p className="text-sm text-brand-charcoal/50">Select a project to view its action register</p>
          </div>
        ) : migrationNeeded ? (
          <div className="p-6">
            <div className="p-6 bg-white border border-status-yellow rounded-xl">
              <div className="flex items-center gap-2 text-status-yellow font-semibold mb-2"><AlertCircle size={16}/> Database Migration Required</div>
              <p className="text-sm text-brand-charcoal">Run migration <strong>002_tasks_and_notes.sql</strong> in your Supabase SQL Editor.</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4 max-w-4xl">

            {/* Phase advance toast */}
            {phaseAdvanceMsg && (
              <div className="bg-status-green-bg border border-status-green/30 text-status-green text-sm font-medium px-4 py-2.5 rounded-lg flex items-center justify-between">
                <span>{phaseAdvanceMsg}</span>
                <button onClick={() => setPhaseAdvanceMsg('')}><X size={14} /></button>
              </div>
            )}

            {/* Project header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${HEALTH_DOT[selectedProject.health] || 'bg-gray-300'}`} />
                  <h2 className="text-xl font-bold text-brand-charcoal-dark">{selectedProject.name}</h2>
                  {selectedProject.type && (
                    <span className="text-xs bg-surface-secondary text-brand-charcoal px-2 py-0.5 rounded font-medium uppercase">
                      {selectedProject.type}
                    </span>
                  )}
                </div>
                {selectedProject.phase && (
                  <p className="text-sm text-brand-charcoal mt-0.5 ml-4">
                    Active phase: <span className="font-semibold text-brand-orange capitalize">{selectedProject.phase}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setModalConfig({ defaultPhase: activePhase || '' })} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={15} /> Add Task
              </button>
            </div>

            {/* Stats bar */}
            {total > 0 && (
              <div className="bg-white rounded-lg border border-gray-100 px-5 py-3 flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-brand-charcoal-dark">{total}</span>
                  <span className="text-xs text-brand-charcoal/60">Total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-blue-600">{inProgress}</span>
                  <span className="text-xs text-brand-charcoal/60">In Progress</span>
                </div>
                {blocked > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-status-red">{blocked}</span>
                    <span className="text-xs text-brand-charcoal/60">Blocked</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-status-green">{done}</span>
                  <span className="text-xs text-brand-charcoal/60">Done</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-status-green rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-bold text-brand-charcoal-dark">{pct}% complete</span>
                </div>
              </div>
            )}

            {/* Tasks */}
            {tasksLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-brand-orange" />
              </div>
            ) : (
              <div className="space-y-3">

                {/* Seed from template banner */}
                {total === 0 && (
                  <div className="bg-white rounded-lg border border-brand-orange/20 p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Sparkles size={18} className="text-brand-orange" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-brand-charcoal-dark mb-0.5">
                          Initialize from {selectedProject.type?.toUpperCase()} Template
                        </p>
                        <p className="text-sm text-brand-charcoal/70 mb-4">
                          Auto-create all tasks from the {selectedProject.type?.toUpperCase()} template — every phase and section pre-loaded. You can edit, add, or delete tasks afterward.
                        </p>
                        <div className="flex items-center gap-3">
                          <button onClick={handleSeedFromTemplate} disabled={seeding}
                            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {seeding ? 'Creating tasks...' : `Load ${selectedProject.type?.toUpperCase()} Template Tasks`}
                          </button>
                          <button onClick={() => setModalConfig({ defaultPhase: activePhase || '' })}
                            className="btn-secondary text-sm">
                            Add Tasks Manually
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {phases.map(phaseName => (
                  <PhaseSection
                    key={phaseName}
                    phaseName={phaseName}
                    tasks={tasksByPhase[phaseName.toLowerCase()] || []}
                    isActive={phaseName.toLowerCase() === activePhase}
                    onAddTask={(phase) => setModalConfig({ defaultPhase: phase })}
                    onStatusChange={handleStatusChange}
                    onEdit={(task) => setModalConfig({ task })}
                    onDetail={(task) => setDetailTask(task)}
                    onDelete={handleDelete}
                  />
                ))}

                {unassignedTasks.length > 0 && (
                  <PhaseSection
                    phaseName="Unassigned"
                    tasks={unassignedTasks}
                    isActive={false}
                    onAddTask={() => setModalConfig({ defaultPhase: '' })}
                    onStatusChange={handleStatusChange}
                    onEdit={(task) => setModalConfig({ task })}
                    onDetail={(task) => setDetailTask(task)}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {modalConfig && selectedProject && userProfile && (
        <TaskModal
          task={modalConfig.task}
          project={selectedProject}
          defaultPhase={modalConfig.defaultPhase}
          companyId={userProfile.company_id}
          userId={userProfile.id}
          onClose={() => setModalConfig(null)}
          onSaved={() => { setModalConfig(null); fetchTasks(selectedProjectId) }}
        />
      )}
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
