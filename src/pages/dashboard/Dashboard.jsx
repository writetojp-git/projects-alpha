import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  BarChart3, Inbox, Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Loader2, AlertCircle, Users, DollarSign, X, ChevronDown, Calendar
} from 'lucide-react'

const healthBadge = { green: 'badge-green', yellow: 'badge-yellow', red: 'badge-red' }
const healthLabel = { green: 'On Track', yellow: 'At Risk', red: 'Off Track' }
const phaseLabel = { define: 'Define', measure: 'Measure', analyze: 'Analyze', improve: 'Improve', control: 'Control', closed: 'Closed' }

// ─── Drill-Down Modal ─────────────────────────────────────────────────────────
function DrillDownModal({ title, projects, onClose }) {
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projects.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-brand-charcoal-dark">{p.name}</td>
                      <td className="px-4 py-3 text-brand-charcoal capitalize">{p.type || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium bg-surface-secondary px-2.5 py-1 rounded-full text-brand-charcoal">
                          {phaseLabel[p.phase] || p.phase || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.health ? (
                          <span className={healthBadge[p.health] || 'badge-gray'}>{healthLabel[p.health]}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-charcoal">{p.department || '—'}</td>
                      <td className="px-4 py-3 text-right text-brand-charcoal">
                        ${(p.estimated_savings || 0).toLocaleString()}
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

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const [userProfile, setUserProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [intakeRequests, setIntakeRequests] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Time period filter state
  const [timePeriod, setTimePeriod] = useState('this-year')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Filter states for metrics
  const [selectedType, setSelectedType] = useState('all')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedDepartmentCost, setSelectedDepartmentCost] = useState('all')
  const [selectedDepartmentCompleted, setSelectedDepartmentCompleted] = useState('all')
  const [selectedDepartmentProjectCount, setSelectedDepartmentProjectCount] = useState('all')

  // Drill-down modal state
  const [drillDownData, setDrillDownData] = useState(null)
  const [drillDownTitle, setDrillDownTitle] = useState('')

  // Fetch user profile
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
          setLoading(false)
          return
        }
        setUserProfile(data)
      })
  }, [user])

  // Fetch projects and related data
  useEffect(() => {
    if (!userProfile?.company_id) return

    const fetchData = async () => {
      try {
        // Get date range based on time period filter
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

        // Fetch all projects with lead profile info for department
        const { data: projData, error: projErr } = await supabase
          .from('projects')
          .select('*, lead_profile:profiles!project_lead_id(department)')
          .eq('company_id', userProfile.company_id)
          .order('updated_at', { ascending: false })

        if (projErr) throw projErr

        // Enrich projects with department from lead profile
        const enrichedProjects = (projData || []).map(p => ({
          ...p,
          department: p.lead_profile?.department || 'Unassigned'
        }))

        setProjects(enrichedProjects)

        // Fetch intake requests
        const { data: intakeData, error: intakeErr } = await supabase
          .from('intake_requests')
          .select('*')
          .eq('company_id', userProfile.company_id)
          .eq('status', 'under_review')

        if (intakeErr) throw intakeErr
        setIntakeRequests(intakeData || [])

        // Fetch recent activity
        const { data: actData, error: actErr } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('company_id', userProfile.company_id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (actErr) throw actErr
        setActivityLogs(actData || [])

        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
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

  // Filter projects by time period
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

  // Calculate metrics
  const activeCount = filteredProjects.filter(p => p.status === 'active').length
  const pendingCount = intakeRequests.length
  const onTrackCount = filteredProjects.filter(p => p.health === 'green').length
  const atRiskCount = filteredProjects.filter(p => p.health === 'red' || p.health === 'yellow').length

  const pipelineValue = filteredProjects
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + (p.estimated_savings || 0), 0)

  // Projects by type
  const projectsByType = {}
  filteredProjects.forEach(p => {
    const type = p.type || 'General'
    projectsByType[type] = (projectsByType[type] || 0) + 1
  })

  // Projects by department
  const projectsByDept = {}
  filteredProjects.forEach(p => {
    const dept = p.department || 'Unassigned'
    projectsByDept[dept] = (projectsByDept[dept] || 0) + 1
  })

  // Cost savings
  const actualSavings = filteredProjects.reduce((sum, p) => sum + (p.actual_savings || 0), 0)
  const estimatedSavings = filteredProjects.reduce((sum, p) => sum + (p.estimated_savings || 0), 0)

  // Completed projects by department
  const completedByDept = {}
  filteredProjects.filter(p => p.status === 'completed').forEach(p => {
    const dept = p.department || 'Unassigned'
    completedByDept[dept] = (completedByDept[dept] || 0) + 1
  })

  // Stats cards for basic metrics
  const stats = [
    {
      label: 'Active Projects',
      value: activeCount.toString(),
      icon: BarChart3,
      color: 'text-brand-orange',
      key: 'active',
      projects: filteredProjects.filter(p => p.status === 'active')
    },
    {
      label: 'Pending Review',
      value: pendingCount.toString(),
      icon: Inbox,
      color: 'text-status-blue',
      key: 'pending',
      projects: null // Intake requests, not projects
    },
    {
      label: 'On Track',
      value: onTrackCount.toString(),
      icon: CheckCircle2,
      color: 'text-status-green',
      key: 'ontrack',
      projects: filteredProjects.filter(p => p.health === 'green')
    },
    {
      label: 'At Risk',
      value: atRiskCount.toString(),
      icon: AlertTriangle,
      color: 'text-status-red',
      key: 'atrisk',
      projects: filteredProjects.filter(p => p.health === 'red' || p.health === 'yellow')
    },
  ]

  // Handle drill-down
  const handleCardClick = (stat) => {
    if (stat.projects) {
      setDrillDownData(stat.projects)
      setDrillDownTitle(stat.label)
    }
  }

  // Sort projects by health for recent projects table
  const healthOrder = { red: 0, yellow: 1, green: 2 }
  const recentProjects = filteredProjects
    .sort((a, b) => (healthOrder[a.health] || 3) - (healthOrder[b.health] || 3))
    .slice(0, 5)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome */}
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

      {/* Time Period Filter */}
      <div className="card">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-brand-orange" />
            <label className="font-semibold text-brand-charcoal-dark">Time Period:</label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="input max-w-xs"
            >
              <option value="this-year">This Year</option>
              <option value="last-year">Last Year</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {timePeriod === 'custom' && (
            <div className="flex gap-4 pl-9">
              <div className="flex-1 max-w-xs">
                <label className="label">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex-1 max-w-xs">
                <label className="label">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - Clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, key, projects }) => (
          <div
            key={key}
            onClick={() => handleCardClick({ label, projects })}
            className={`card transition-all ${projects ? 'cursor-pointer hover:shadow-card-hover' : ''}`}
          >
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

      {/* Projects by Type */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-orange" />
            <h3 className="font-semibold text-brand-charcoal-dark">Projects by Type</h3>
          </div>
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input max-w-xs py-1 text-sm"
            >
              <option value="all">All Types</option>
              {Object.keys(projectsByType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(projectsByType)
            .filter(([type]) => selectedType === 'all' || type === selectedType)
            .map(([type, count]) => (
              <button
                key={type}
                onClick={() => {
                  const typeProjects = filteredProjects.filter(p => (p.type || 'General') === type)
                  setDrillDownData(typeProjects)
                  setDrillDownTitle(`Projects of Type: ${type}`)
                }}
                className="p-4 bg-surface-secondary rounded-lg hover:bg-gray-200 transition-colors text-center"
              >
                <p className="text-2xl font-bold text-brand-charcoal-dark">{count}</p>
                <p className="text-xs text-brand-charcoal mt-1 line-clamp-2">{type}</p>
              </button>
            ))}
        </div>
      </div>

      {/* Projects by Department */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-brand-orange" />
            <h3 className="font-semibold text-brand-charcoal-dark">Projects by Department</h3>
          </div>
          <div className="relative">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input max-w-xs py-1 text-sm"
            >
              <option value="all">All Departments</option>
              {Object.keys(projectsByDept).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(projectsByDept)
            .filter(([dept]) => selectedDepartment === 'all' || dept === selectedDepartment)
            .map(([dept, count]) => (
              <button
                key={dept}
                onClick={() => {
                  const deptProjects = filteredProjects.filter(p => p.department === dept)
                  setDrillDownData(deptProjects)
                  setDrillDownTitle(`Projects in ${dept}`)
                }}
                className="p-4 bg-surface-secondary rounded-lg hover:bg-gray-200 transition-colors text-center"
              >
                <p className="text-2xl font-bold text-brand-charcoal-dark">{count}</p>
                <p className="text-xs text-brand-charcoal mt-1 line-clamp-2">{dept}</p>
              </button>
            ))}
        </div>
      </div>

      {/* Cost Savings Metrics */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-brand-orange" />
            <h3 className="font-semibold text-brand-charcoal-dark">Cost Savings vs Goal</h3>
          </div>
          <div className="relative">
            <select
              value={selectedDepartmentCost}
              onChange={(e) => setSelectedDepartmentCost(e.target.value)}
              className="input max-w-xs py-1 text-sm"
            >
              <option value="all">All Departments</option>
              {Object.keys(projectsByDept).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-secondary p-4 rounded-lg">
            <p className="text-xs text-brand-charcoal mb-1 font-medium">Actual Savings</p>
            <p className="text-2xl font-bold text-status-green">
              ${(selectedDepartmentCost === 'all'
                ? actualSavings
                : filteredProjects
                  .filter(p => p.department === selectedDepartmentCost)
                  .reduce((sum, p) => sum + (p.actual_savings || 0), 0)
              ).toLocaleString()}
            </p>
          </div>
          <div className="bg-surface-secondary p-4 rounded-lg">
            <p className="text-xs text-brand-charcoal mb-1 font-medium">Estimated Savings</p>
            <p className="text-2xl font-bold text-brand-charcoal-dark">
              ${(selectedDepartmentCost === 'all'
                ? estimatedSavings
                : filteredProjects
                  .filter(p => p.department === selectedDepartmentCost)
                  .reduce((sum, p) => sum + (p.estimated_savings || 0), 0)
              ).toLocaleString()}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const costProjects = selectedDepartmentCost === 'all'
              ? filteredProjects
              : filteredProjects.filter(p => p.department === selectedDepartmentCost)
            setDrillDownData(costProjects)
            setDrillDownTitle(`Cost Savings${selectedDepartmentCost !== 'all' ? ` - ${selectedDepartmentCost}` : ''}`)
          }}
          className="mt-4 btn-secondary w-full text-sm"
        >
          View Project Details →
        </button>
      </div>

      {/* Completed Projects by Department */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-brand-orange" />
            <h3 className="font-semibold text-brand-charcoal-dark">Completed Projects by Department</h3>
          </div>
          <div className="relative">
            <select
              value={selectedDepartmentCompleted}
              onChange={(e) => setSelectedDepartmentCompleted(e.target.value)}
              className="input max-w-xs py-1 text-sm"
            >
              <option value="all">All Departments</option>
              {Object.keys(completedByDept).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(completedByDept)
            .filter(([dept]) => selectedDepartmentCompleted === 'all' || dept === selectedDepartmentCompleted)
            .map(([dept, count]) => (
              <button
                key={dept}
                onClick={() => {
                  const completedProjects = filteredProjects.filter(p => p.status === 'completed' && p.department === dept)
                  setDrillDownData(completedProjects)
                  setDrillDownTitle(`Completed Projects - ${dept}`)
                }}
                className="p-4 bg-status-green-bg rounded-lg hover:bg-opacity-75 transition-colors text-center"
              >
                <p className="text-2xl font-bold text-status-green">{count}</p>
                <p className="text-xs text-status-green mt-1 line-clamp-2">{dept}</p>
              </button>
            ))}
          {Object.entries(completedByDept).length === 0 && (
            <p className="text-sm text-brand-charcoal col-span-full text-center py-6">
              No completed projects yet
            </p>
          )}
        </div>
      </div>

      {/* Projects vs Plan by Department */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-orange" />
            <h3 className="font-semibold text-brand-charcoal-dark">Projects Completed vs Target Date Plan</h3>
          </div>
          <div className="relative">
            <select
              value={selectedDepartmentProjectCount}
              onChange={(e) => setSelectedDepartmentProjectCount(e.target.value)}
              className="input max-w-xs py-1 text-sm"
            >
              <option value="all">All Departments</option>
              {Object.keys(projectsByDept).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {Object.entries(projectsByDept)
            .filter(([dept]) => selectedDepartmentProjectCount === 'all' || dept === selectedDepartmentProjectCount)
            .map(([dept, total]) => {
              const completed = (completedByDept[dept] || 0)
              const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-brand-charcoal-dark">{dept}</p>
                    <span className="text-sm font-semibold text-brand-charcoal">
                      {completed} of {total} completed
                    </span>
                  </div>
                  <div className="w-full bg-surface-secondary rounded-full h-2">
                    <div
                      className="bg-status-green rounded-full h-2 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-brand-charcoal mt-1">{percentage}% complete</p>
                </div>
              )
            })}
        </div>
      </div>

      {/* Recent Activity */}
      {activityLogs.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-brand-orange" />
            <h3 className="font-semibold text-brand-charcoal-dark">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {activityLogs.map((log, idx) => (
              <div key={log.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-brand-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-brand-charcoal-dark font-medium truncate">
                    {log.action} on {log.entity_type}
                  </p>
                  <p className="text-xs text-brand-charcoal">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-brand-charcoal-dark">Recent Projects</h3>
            <a href="/portfolio" className="text-sm text-brand-orange hover:underline font-medium">View all →</a>
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
                  <tr key={p.id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-brand-charcoal-dark truncate">{p.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium bg-surface-secondary px-2.5 py-1 rounded-full text-brand-charcoal">
                        {phaseLabel[p.phase] || p.phase}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={healthBadge[p.health] || 'badge-gray'}>{healthLabel[p.health] || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-charcoal">
                      {p.target_date ? new Date(p.target_date).toLocaleDateString() : '—'}
                    </td>
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

      {/* Drill-Down Modal */}
      {drillDownData && (
        <DrillDownModal
          title={drillDownTitle}
          projects={drillDownData}
          onClose={() => setDrillDownData(null)}
        />
      )}
    </div>
  )
}
