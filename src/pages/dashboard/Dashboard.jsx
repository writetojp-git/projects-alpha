import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  BarChart3, Inbox, Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Loader2, AlertCircle, Users, DollarSign, X, ChevronDown, Calendar, ExternalLink,
  Target, Shield, Sparkles
} from 'lucide-react'

const healthBadge = { green: 'badge-green', yellow: 'badge-yellow', red: 'badge-red' }
const healthLabel = { green: 'On Track', yellow: 'At Risk', red: 'Off Track' }
const phaseLabel = {
  define: 'Define', measure: 'Measure', analyze: 'Analyze',
  improve: 'Improve', control: 'Control', closed: 'Closed'
}

const METRIC_STATUS_CONFIG = {
  tracking:  { label: 'Tracking',  color: 'bg-blue-100 text-blue-700' },
  on_target: { label: 'On Target', color: 'bg-green-100 text-green-700' },
  at_risk:   { label: 'At Risk',   color: 'bg-yellow-100 text-yellow-700' },
  achieved:  { label: 'Achieved',  color: 'bg-emerald-100 text-emerald-700' },
  missed:    { label: 'Missed',    color: 'bg-red-100 text-red-700' },
}

// âââ Drill-Down Modal ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function DrillDownModal({ title, projects, onClose, onNavigateToProject }) {
  if (!projects) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-brand-charcoal-dark">{title}</h3>
          <button onClick={onClose} className="text-brand-charcoal hover:text-brand-charcoal-dark">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Users size={32} className="text-brand-charcoal/30 mx-auto mb-3" />
              <p className="text-brand-charcoal font-medium">No projects found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-secondary text-xs font-semibold text-brand-charcoal uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Phase</th>
                    <th className="text-left px-4 py-3">Health</th>
                    <th className="text-left px-4 py-3">Department</th>
                    <th className="text-right px-4 py-3">Estimated Savings</th>
                    <th className="text-center px-4 py-3">Workspace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projects.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <button onClick={() => onNavigateToProject(p.id)}
                          className="text-brand-orange hover:text-brand-orange-dark hover:underline text-left font-medium">
                          {p.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-brand-charcoal capitalize">{p.type || 'â'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium bg-surface-secondary px-2.5 py-1 rounded-full text-brand-charcoal">
                          {phaseLabel[p.phase] || p.phase || 'â'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.health ? (
                          <span className={healthBadge[p.health] || 'badge-gray'}>{healthLabel[p.health]}</span>
                        ) : 'â'}
                      </td>
                      <td className="px-4 py-3 text-brand-charcoal">{p.department || 'â'}</td>
                      <td className="px-4 py-3 text-right text-brand-charcoal">
                        ${(p.estimated_savings || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => onNavigateToProject(p.id)}
                          className="inline-flex items-center gap-1 text-xs text-brand-orange hover:text-brand-orange-dark font-medium">
                          <ExternalLink size={14} /> Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// âââ Improvement Metrics Summary Widget ââââââââââââââââââââââââââââââââââââââ
function MetricsSummaryWidget({ companyId }) {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    const loadMetrics = async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('company_id', companyId)
        .in('status', ['active', 'on_hold'])

      if (!projects?.length) { setLoading(false); return }

      const projectIds = projects.map(p => p.id)
      const { data } = await supabase
        .from('improvement_metrics')
        .select('*')
        .in('project_id', projectIds)

      setMetrics(data || [])
      setLoading(false)
    }
    loadMetrics()
  }, [companyId])

  if (loading) return null
  if (metrics.length === 0) return null

  const statusCounts = {}
  metrics.forEach(m => {
    statusCounts[m.status] = (statusCounts[m.status] || 0) + 1
  })

  const byCategory = {}
  metrics.forEach(m => {
    const cat = m.category || 'Other'
    byCategory[cat] = (byCategory[cat] || 0) + 1
  })

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Target size={18} className="text-brand-orange" />
        <h3 className="font-semibold text-brand-charcoal-dark">Improvement Metrics Overview</h3>
        <span className="text-xs text-brand-charcoal bg-surface-secondary px-2 py-0.5 rounded-full ml-auto">
          {metrics.length} total metrics
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {Object.entries(METRIC_STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className={`p-3 rounded-lg text-center ${cfg.color}`}>
            <p className="text-2xl font-bold">{statusCounts[key] || 0}</p>
            <p className="text-xs font-medium mt-0.5">{cfg.label}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-brand-charcoal mb-2">By Category</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <span key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-secondary rounded-full text-xs">
              <span className="font-medium text-brand-charcoal-dark">{cat}</span>
              <span className="text-brand-charcoal">{count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// âââ Benefits Summary Widget âââââââââââââââââââââââââââââââââââââââââââââââââ
function BenefitsSummaryWidget({ companyId }) {
  const [benefits, setBenefits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    const loadBenefits = async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, intake_id')
        .eq('company_id', companyId)
        .in('status', ['active', 'on_hold'])

      if (!projects?.length) { setLoading(false); return }

      const intakeIds = projects.map(p => p.intake_id).filter(Boolean)
      const projectIds = projects.map(p => p.id)

      let allBenefits = []

      if (intakeIds.length) {
        const { data: intakeBenefits } = await supabase
          .from('project_benefits')
          .select('*')
          .in('intake_id', intakeIds)
        if (intakeBenefits) allBenefits = [...allBenefits, ...intakeBenefits]
      }

      if (projectIds.length) {
        const { data: projBenefits } = await supabase
          .from('project_benefits')
          .select('*')
          .in('project_id', projectIds)
        if (projBenefits) {
          const existingIds = new Set(allBenefits.map(b => b.id))
          allBenefits = [...allBenefits, ...projBenefits.filter(b => !existingIds.has(b.id))]
        }
      }

      setBenefits(allBenefits)
      setLoading(false)
    }
    loadBenefits()
  }, [companyId])

  if (loading) return null
  if (benefits.length === 0) return null

  const byCategory = {}
  benefits.forEach(b => {
    const cat = b.category_name || 'Other'
    if (!byCategory[cat]) byCategory[cat] = { count: 0, values: [] }
    byCategory[cat].count++
    if (b.estimated_value) byCategory[cat].values.push(b.estimated_value)
  })

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-brand-orange" />
        <h3 className="font-semibold text-brand-charcoal-dark">Estimated Benefits Breakdown</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(byCategory).sort((a, b) => b[1].count - a[1].count).map(([cat, data]) => (
          <div key={cat} className="p-3 bg-surface-secondary rounded-lg">
            <p className="text-sm font-medium text-brand-charcoal-dark">{cat}</p>
            <p className="text-lg font-bold text-brand-orange mt-1">{data.count}</p>
            <p className="text-xs text-brand-charcoal">across active projects</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// âââ Phase Health Widget âââââââââââââââââââââââââââââââââââââââââââââââââââââ
function PhaseHealthWidget({ companyId }) {
  const [phaseData, setPhaseData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    const loadPhaseHealth = async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('company_id', companyId)
        .in('status', ['active', 'on_hold'])

      if (!projects?.length) { setLoading(false); return }

      const projectIds = projects.map(p => p.id)
      const { data } = await supabase
        .from('project_phase_dates')
        .select('*')
        .in('project_id', projectIds)
        .order('phase_order')

      setPhaseData(data || [])
      setLoading(false)
    }
    loadPhaseHealth()
  }, [companyId])

  if (loading) return null
  if (phaseData.length === 0) return null

  const today = new Date().toISOString().split('T')[0]
  const phaseSummary = {}
  phaseData.forEach(pd => {
    const phase = pd.phase_name
    if (!phaseSummary[phase]) phaseSummary[phase] = { total: 0, completed: 0, overdue: 0, inProgress: 0 }
    phaseSummary[phase].total++
    if (pd.status === 'completed') phaseSummary[phase].completed++
    else if (pd.status === 'in_progress') phaseSummary[phase].inProgress++
    if (['pending', 'in_progress'].includes(pd.status) && pd.target_end_date && pd.target_end_date < today) {
      phaseSummary[phase].overdue++
    }
  })

  const phaseOrder = ['define', 'measure', 'analyze', 'improve', 'control']

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={18} className="text-brand-orange" />
        <h3 className="font-semibold text-brand-charcoal-dark">Phase Timeline Health</h3>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {phaseOrder.map(phase => {
          const data = phaseSummary[phase] || { total: 0, completed: 0, overdue: 0, inProgress: 0 }
          const hasOverdue = data.overdue > 0
          return (
            <div key={phase} className={`p-3 rounded-lg text-center ${hasOverdue ? 'bg-red-50 border border-red-200' : 'bg-surface-secondary'}`}>
              <p className="text-xs font-semibold text-brand-charcoal-dark capitalize mb-2">{phase}</p>
              <div className="space-y-1">
                <p className="text-xs text-brand-charcoal">
                  <span className="font-medium text-green-600">{data.completed}</span> done
                </p>
                <p className="text-xs text-brand-charcoal">
                  <span className="font-medium text-blue-600">{data.inProgress}</span> active
                </p>
                {hasOverdue && (
                  <p className="text-xs text-red-600 font-medium">{data.overdue} overdue</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// âââ Main Dashboard Component ââââââââââââââââââââââââââââââââââââââââââââââââ
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const handleNavigateToProject = (projectId) => {
    setDrillDownData(null)
    navigate(`/workspace?project=${projectId}`)
  }

  const [userProfile, setUserProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [intakeRequests, setIntakeRequests] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [timePeriod, setTimePeriod] = useState('this-year')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const [selectedType, setSelectedType] = useState('all')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedDepartmentCost, setSelectedDepartmentCost] = useState('all')
  const [selectedDepartmentCompleted, setSelectedDepartmentCompleted] = useState('all')
  const [selectedDepartmentProjectCount, setSelectedDepartmentProjectCount] = useState('all')

  const [drillDownData, setDrillDownData] = useState(null)
  const [drillDownTitle, setDrillDownTitle] = useState('')

  // Dashboard section visibility
  const [visibleSections, setVisibleSections] = useState({
    metrics: true,
    benefits: true,
    phaseHealth: true,
    projectsByType: true,
    projectsByDept: true,
    costSavings: true,
    completedByDept: true,
    completedVsPlan: true,
    recentActivity: true,
    recentProjects: true,
  })

  const toggleSection = (key) => {
    setVisibleSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return }
        setUserProfile(data)
      })
  }, [user])

  useEffect(() => {
    if (!userProfile?.company_id) return
    const fetchData = async () => {
      try {
        const { data: projData, error: projErr } = await supabase
          .from('projects')
          .select('*, lead_profile:profiles!project_lead_id(department)')
          .eq('company_id', userProfile.company_id)
          .order('updated_at', { ascending: false })
        if (projErr) throw projErr

        const enrichedProjects = (projData || []).map(p => ({
          ...p, department: p.lead_profile?.department || 'Unassigned'
        }))
        setProjects(enrichedProjects)

        const { data: intakeData, error: intakeErr } = await supabase
          .from('intake_requests').select('*')
          .eq('company_id', userProfile.company_id).eq('status', 'under_review')
        if (intakeErr) throw intakeErr
        setIntakeRequests(intakeData || [])

        const { data: actData, error: actErr } = await supabase
          .from('activity_logs').select('*')
          .eq('company_id', userProfile.company_id)
          .order('created_at', { ascending: false }).limit(5)
        if (actErr) throw actErr
        setActivityLogs(actData || [])

        setLoading(false)
      } catch (err) { setError(err.message); setLoading(false) }
    }
    fetchData()
  }, [userProfile?.company_id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-orange animate-spin mx-auto mb-2" />
          <p className="text-brand-charcoal text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const getFilteredProjects = () => {
    const now = new Date()
    let startDate, endDate
    if (timePeriod === 'this-year') {
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
    } else if (timePeriod === 'last-year') {
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate = new Date(now.getFullYear() - 1, 11, 31)
    } else if (timePeriod === 'custom') {
      startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), 0, 1)
      endDate = customEndDate ? new Date(customEndDate) : now
    } else {
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = now
    }
    return projects.filter(p => {
      if (!p.target_date) return true
      const targetDate = new Date(p.target_date)
      return targetDate >= startDate && targetDate <= endDate
    })
  }

  const filteredProjects = getFilteredProjects()

  const activeCount = filteredProjects.filter(p => p.status === 'active').length
  const pendingCount = intakeRequests.length
  const onTrackCount = filteredProjects.filter(p => p.health === 'green').length
  const atRiskCount = filteredProjects.filter(p => p.health === 'red' || p.health === 'yellow').length
  const pipelineValue = filteredProjects.filter(p => p.status === 'active').reduce((sum, p) => sum + (p.estimated_savings || 0), 0)

  const projectsByType = {}
  filteredProjects.forEach(p => { const type = p.type || 'General'; projectsByType[type] = (projectsByType[type] || 0) + 1 })

  const projectsByDept = {}
  filteredProjects.forEach(p => { const dept = p.department || 'Unassigned'; projectsByDept[dept] = (projectsByDept[dept] || 0) + 1 })

  const actualSavings = filteredProjects.reduce((sum, p) => sum + (p.actual_savings || 0), 0)
  const estimatedSavings = filteredProjects.reduce((sum, p) => sum + (p.estimated_savings || 0), 0)

  const completedByDept = {}
  filteredProjects.filter(p => p.status === 'completed').forEach(p => {
    const dept = p.department || 'Unassigned'; completedByDept[dept] = (completedByDept[dept] || 0) + 1
  })

  const stats = [
    { label: 'Active Projects', value: activeCount.toString(), icon: BarChart3, color: 'text-brand-orange', key: 'active', projects: filteredProjects.filter(p => p.status === 'active') },
    { label: 'Pending Review', value: pendingCount.toString(), icon: Inbox, color: 'text-status-blue', key: 'pending', projects: null },
    { label: 'On Track', value: onTrackCount.toString(), icon: CheckCircle2, color: 'text-status-green', key: 'ontrack', projects: filteredProjects.filter(p => p.health === 'green') },
    { label: 'At Risk', value: atRiskCount.toString(), icon: AlertTriangle, color: 'text-status-red', key: 'atrisk', projects: filteredProjects.filter(p => p.health === 'red' || p.health === 'yellow') },
  ]

  const handleCardClick = (stat) => { if (stat.projects) { setDrillDownData(stat.projects); setDrillDownTitle(stat.label) } }

  const healthOrder = { red: 0, yellow: 1, green: 2 }
  const recentProjects = filteredProjects
    .sort((a, b) => (healthOrder[a.health] || 3) - (healthOrder[b.health] || 3))
    .slice(0, 5)

  const sectionConfig = [
    { key: 'metrics', label: 'Improvement Metrics' },
    { key: 'benefits', label: 'Benefits Breakdown' },
    { key: 'phaseHealth', label: 'Phase Health' },
    { key: 'projectsByType', label: 'Projects by Type' },
    { key: 'projectsByDept', label: 'Projects by Dept' },
    { key: 'costSavings', label: 'Cost Savings' },
    { key: 'completedByDept', label: 'Completed by Dept' },
    { key: 'completedVsPlan', label: 'Completed vs Plan' },
    { key: 'recentActivity', label: 'Recent Activity' },
    { key: 'recentProjects', label: 'Recent Projects' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h2 className="text-2xl font-bold text-brand-charcoal-dark">Good morning, {name}!</h2>
        <p className="text-brand-charcoal text-sm mt-1">Here's your portfolio snapshot for today.</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-status-red-bg border border-status-red rounded-lg">
          <AlertCircle size={18} className="text-status-red flex-shrink-0 mt-0.5" />
          <p className="text-sm text-status-red">{error}</p>
        </div>
      )}

      {/* Time Period Filter + Section Toggles */}
      <div className="card">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-brand-orange" />
            <label className="font-semibold text-brand-charcoal-dark">Time Period:</label>
            <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)} className="input max-w-xs">
              <option value="this-year">This Year</option>
              <option value="last-year">Last Year</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {timePeriod === 'custom' && (
            <div className="flex gap-4 pl-9">
              <div className="flex-1 max-w-xs">
                <label className="label">Start Date</label>
                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="input" />
              </div>
              <div className="flex-1 max-w-xs">
                <label className="label">End Date</label>
                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="input" />
              </div>
            </div>
          )}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-brand-charcoal mb-2">Show/Hide Sections:</p>
            <div className="flex flex-wrap gap-2">
              {sectionConfig.map(s => (
                <button key={s.key} onClick={() => toggleSection(s.key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${visibleSections[s.key] ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-brand-charcoal border-gray-200 hover:border-brand-orange'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, key, projects }) => (
          <div key={key} onClick={() => handleCardClick({ label, projects })}
            className={`card transition-all ${projects ? 'cursor-pointer hover:shadow-card-hover' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-brand-charcoal font-medium">{label}</p>
              <Icon size={18} className={color} />
            </div>
            <p className="text-3xl font-bold text-brand-charcoal-dark mb-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Value */}
      {activeCount > 0 && (
        <div className="card bg-gradient-to-r from-brand-orange/5 to-transparent border-l-4 border-l-brand-orange">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-brand-charcoal font-medium mb-1">Pipeline Value (Active Projects)</p>
              <p className="text-3xl font-bold text-brand-charcoal-dark">${pipelineValue.toLocaleString()}</p>
            </div>
            <DollarSign className="text-brand-orange" size={24} />
          </div>
        </div>
      )}

      {/* NEW: Improvement Metrics Overview */}
      {visibleSections.metrics && userProfile?.company_id && (
        <MetricsSummaryWidget companyId={userProfile.company_id} />
      )}

      {/* NEW: Benefits Breakdown */}
      {visibleSections.benefits && userProfile?.company_id && (
        <BenefitsSummaryWidget companyId={userProfile.company_id} />
      )}

      {/* NEW: Phase Health */}
      {visibleSections.phaseHealth && userProfile?.company_id && (
        <PhaseHealthWidget companyId={userProfile.company_id} />
      )}

      {/* Projects by Type */}
      {visibleSections.projectsByType && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-brand-orange" />
              <h3 className="font-semibold text-brand-charcoal-dark">Projects by Type</h3>
            </div>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="input max-w-xs py-1 text-sm">
              <option value="all">All Types</option>
              {Object.keys(projectsByType).map(type => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(projectsByType).filter(([type]) => selectedType === 'all' || type === selectedType).map(([type, count]) => (
              <button key={type} onClick={() => { setDrillDownData(filteredProjects.filter(p => (p.type || 'General') === type)); setDrillDownTitle(`Projects of Type: ${type}`) }}
                className="p-4 bg-surface-secondary rounded-lg hover:bg-gray-200 transition-colors text-center">
                <p className="text-2xl font-bold text-brand-charcoal-dark">{count}</p>
                <p className="text-xs text-brand-charcoal mt-1 line-clamp-2">{type}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Projects by Department */}
      {visibleSections.projectsByDept && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-brand-orange" />
              <h3 className="font-semibold text-brand-charcoal-dark">Projects by Department</h3>
            </div>
            <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="input max-w-xs py-1 text-sm">
              <option value="all">All Departments</option>
              {Object.keys(projectsByDept).map(dept => (<option key={dept} value={dept}>{dept}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(projectsByDept).filter(([dept]) => selectedDepartment === 'all' || dept === selectedDepartment).map(([dept, count]) => (
              <button key={dept} onClick={() => { setDrillDownData(filteredProjects.filter(p => p.department === dept)); setDrillDownTitle(`Projects in ${dept}`) }}
                className="p-4 bg-surface-secondary rounded-lg hover:bg-gray-200 transition-colors text-center">
                <p className="text-2xl font-bold text-brand-charcoal-dark">{count}</p>
                <p className="text-xs text-brand-charcoal mt-1 line-clamp-2">{dept}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cost Savings */}
      {visibleSections.costSavings && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-brand-orange" />
              <h3 className="font-semibold text-brand-charcoal-dark">Cost Savings vs Goal</h3>
            </div>
            <select value={selectedDepartmentCost} onChange={(e) => setSelectedDepartmentCost(e.target.value)} className="input max-w-xs py-1 text-sm">
              <option value="all">All Departments</option>
              {Object.keys(projectsByDept).map(dept => (<option key={dept} value={dept}>{dept}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-secondary p-4 rounded-lg">
              <p className="text-xs text-brand-charcoal mb-1 font-medium">Actual Savings</p>
              <p className="text-2xl font-bold text-status-green">
                ${(selectedDepartmentCost === 'all' ? actualSavings : filteredProjects.filter(p => p.department === selectedDepartmentCost).reduce((sum, p) => sum + (p.actual_savings || 0), 0)).toLocaleString()}
              </p>
            </div>
            <div className="bg-surface-secondary p-4 rounded-lg">
              <p className="text-xs text-brand-charcoal mb-1 font-medium">Estimated Savings</p>
              <p className="text-2xl font-bold text-brand-charcoal-dark">
                ${(selectedDepartmentCost === 'all' ? estimatedSavings : filteredProjects.filter(p => p.department === selectedDepartmentCost).reduce((sum, p) => sum + (p.estimated_savings || 0), 0)).toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={() => { setDrillDownData(selectedDepartmentCost === 'all' ? filteredProjects : filteredProjects.filter(p => p.department === selectedDepartmentCost)); setDrillDownTitle(`Cost Savings${selectedDepartmentCost !== 'all' ? ` - ${selectedDepartmentCost}` : ''}`) }}
            className="mt-4 btn-secondary w-full text-sm">
            View Project Details â
          </button>
        </div>
      )}

      {/* Completed by Department */}
      {visibleSections.completedByDept && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-brand-orange" />
              <h3 className="font-semibold text-brand-charcoal-dark">Completed Projects by Department</h3>
            </div>
            <select value={selectedDepartmentCompleted} onChange={(e) => setSelectedDepartmentCompleted(e.target.value)} className="input max-w-xs py-1 text-sm">
              <option value="all">All Departments</option>
              {Object.keys(completedByDept).map(dept => (<option key={dept} value={dept}>{dept}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(completedByDept).filter(([dept]) => selectedDepartmentCompleted === 'all' || dept === selectedDepartmentCompleted).map(([dept, count]) => (
              <button key={dept} onClick={() => { setDrillDownData(filteredProjects.filter(p => p.status === 'completed' && p.department === dept)); setDrillDownTitle(`Completed Projects - ${dept}`) }}
                className="p-4 bg-status-green-bg rounded-lg hover:bg-opacity-75 transition-colors text-center">
                <p className="text-2xl font-bold text-status-green">{count}</p>
                <p className="text-xs text-status-green mt-1 line-clamp-2">{dept}</p>
              </button>
            ))}
            {Object.entries(completedByDept).length === 0 && (
              <p className="text-sm text-brand-charcoal col-span-full text-center py-6">No completed projects yet</p>
            )}
          </div>
        </div>
      )}

      {/* Completed vs Plan */}
      {visibleSections.completedVsPlan && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-orange" />
              <h3 className="font-semibold text-brand-charcoal-dark">Projects Completed vs Target Date Plan</h3>
            </div>
            <select value={selectedDepartmentProjectCount} onChange={(e) => setSelectedDepartmentProjectCount(e.target.value)} className="input max-w-xs py-1 text-sm">
              <option value="all">All Departments</option>
              {Object.keys(projectsByDept).map(dept => (<option key={dept} value={dept}>{dept}</option>))}
            </select>
          </div>
          <div className="space-y-3">
            {Object.entries(projectsByDept).filter(([dept]) => selectedDepartmentProjectCount === 'all' || dept === selectedDepartmentProjectCount).map(([dept, total]) => {
              const completed = completedByDept[dept] || 0
              const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-brand-charcoal-dark">{dept}</p>
                    <span className="text-sm font-semibold text-brand-charcoal">{completed} of {total} completed</span>
                  </div>
                  <div className="w-full bg-surface-secondary rounded-full h-2">
                    <div className="bg-status-green rounded-full h-2 transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                  <p className="text-xs text-brand-charcoal mt-1">{percentage}% complete</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {visibleSections.recentActivity && activityLogs.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-brand-orange" />
            <h3 className="font-semibold text-brand-charcoal-dark">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-brand-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-brand-charcoal-dark font-medium truncate">{log.action} on {log.entity_type}</p>
                  <p className="text-xs text-brand-charcoal">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      {visibleSections.recentProjects && recentProjects.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-brand-charcoal-dark">Recent Projects</h3>
            <a href="/portfolio" className="text-sm text-brand-orange hover:underline font-medium">View all â</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-secondary text-xs font-medium text-brand-charcoal uppercase tracking-wide">
                  <th className="text-left px-6 py-3">Project</th>
                  <th className="text-left px-6 py-3">Phase</th>
                  <th className="text-left px-6 py-3">Health</th>
                  <th className="text-left px-6 py-3">Target Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentProjects.map((p) => (
                  <tr key={p.id} onClick={() => handleNavigateToProject(p.id)} className="hover:bg-surface-secondary/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 text-sm font-medium text-brand-orange hover:text-brand-orange-dark truncate">{p.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium bg-surface-secondary px-2.5 py-1 rounded-full text-brand-charcoal">{phaseLabel[p.phase] || p.phase}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={healthBadge[p.health] || 'badge-gray'}>{healthLabel[p.health] || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-charcoal">{p.target_date ? new Date(p.target_date).toLocaleDateString() : 'â'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredProjects.length === 0 && (
        <div className="card text-center py-8">
          <Users size={32} className="text-brand-charcoal/30 mx-auto mb-3" />
          <p className="text-brand-charcoal font-medium mb-1">No active projects yet</p>
          <p className="text-sm text-brand-charcoal/60">Create or convert intake requests to get started.</p>
        </div>
      )}

      {drillDownData && (
        <DrillDownModal title={drillDownTitle} projects={drillDownData} onClose={() => setDrillDownData(null)} onNavigateToProject={handleNavigateToProject} />
      )}
    </div>
  )
}
