import { BarChart3, Inbox, Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const stats = [
  { label: 'Active Projects', value: '12', change: '+2 this month', icon: BarChart3, color: 'text-brand-orange' },
  { label: 'Pending Intake', value: '5', change: '3 need review', icon: Inbox, color: 'text-status-blue' },
  { label: 'On Track', value: '8', change: '67% of portfolio', icon: CheckCircle2, color: 'text-status-green' },
  { label: 'At Risk', value: '3', change: 'Needs attention', icon: AlertTriangle, color: 'text-status-red' },
]

const recentProjects = [
  { name: 'Supply Chain Optimization', phase: 'Measure', health: 'green', lead: 'JP', updated: '2h ago' },
  { name: 'Customer Onboarding Redesign', phase: 'Analyze', health: 'yellow', lead: 'Sarah', updated: '5h ago' },
  { name: 'Defect Reduction — Line 4', phase: 'Improve', health: 'green', lead: 'Mike', updated: '1d ago' },
  { name: 'ERP Implementation', phase: 'Define', health: 'red', lead: 'Anna', updated: '2d ago' },
  { name: 'Quality System Upgrade', phase: 'Control', health: 'green', lead: 'JP', updated: '3d ago' },
]

const healthBadge = { green: 'badge-green', yellow: 'badge-yellow', red: 'badge-red' }
const healthLabel = { green: 'On Track', yellow: 'At Risk', red: 'Off Track' }

export default function Dashboard() {
  const { user } = useAuth()
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-brand-charcoal-dark">Good morning, {name} 👋</h2>
        <p className="text-brand-charcoal text-sm mt-1">Here's your portfolio snapshot for today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-brand-charcoal font-medium">{label}</p>
              <Icon size={18} className={color} />
            </div>
            <p className="text-3xl font-bold text-brand-charcoal-dark mb-1">{value}</p>
            <p className="text-xs text-brand-charcoal">{change}</p>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-brand-charcoal-dark">Recent Projects</h3>
          <button className="text-sm text-brand-orange hover:underline font-medium">View portfolio →</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-surface-secondary text-xs font-medium text-brand-charcoal uppercase tracking-wide">
              <th className="text-left px-6 py-3">Project</th>
              <th className="text-left px-6 py-3">Phase</th>
              <th className="text-left px-6 py-3">Health</th>
              <th className="text-left px-6 py-3">Lead</th>
              <th className="text-left px-6 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recentProjects.map((p) => (
              <tr key={p.name} className="hover:bg-surface-secondary/50 transition-colors cursor-pointer">
                <td className="px-6 py-4 text-sm font-medium text-brand-charcoal-dark">{p.name}</td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium bg-surface-secondary px-2.5 py-1 rounded-full text-brand-charcoal">{p.phase}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={healthBadge[p.health]}>{healthLabel[p.health]}</span>
                </td>
                <td className="px-6 py-4 text-sm text-brand-charcoal">{p.lead}</td>
                <td className="px-6 py-4 text-sm text-brand-charcoal flex items-center gap-1.5">
                  <Clock size={12} className="text-gray-400" />{p.updated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Insight Banner */}
      <div className="rounded-lg bg-gradient-to-r from-brand-orange to-brand-orange-light p-5 text-white">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">AI Insight — Portfolio Health</p>
            <p className="text-sm text-white/85">3 projects are showing schedule deviation patterns. ERP Implementation has missed 2 milestone check-ins — recommend a project health review this week.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
