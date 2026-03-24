import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  BarChart3, Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Loader2, AlertCircle, Users, DollarSign, X, Calendar, ExternalLink,
  Target, Settings2, ChevronRight, Inbox, Eye, EyeOff, GripVertical
} from 'lucide-react'

// ── Brand colors ──────────────────────────────────────────────
const ORANGE = '#F27F0C'
const CHARCOAL = '#60605F'
const COLORS = {
  green:  '#10b981',
  yellow: '#f59e0b',
  red:    '#ef4444',
  blue:   '#3b82f6',
  purple: '#8b5cf6',
  cyan:   '#06b6d4',
  orange: ORANGE,
  pink:   '#ec4899',
  teal:   '#14b8a6',
  indigo: '#6366f1',
}
const CHART_PALETTE = Object.values(COLORS)

const TYPE_COLORS = {
  dmaic: COLORS.orange, dmadv: COLORS.purple, kaizen: COLORS.cyan,
  lean: COLORS.green, general: COLORS.blue,
}

// ── Default widget config ─────────────────────────────────────
const DEFAULT_WIDGETS = {
  healthDonut:       { label: 'Project Health',            visible: true,  size: 'half' },
  projectsByType:    { label: 'Projects by Type',          visible: true,  size: 'half' },
  costSavings:       { label: 'Cost Savings vs Goal',      visible: true,  size: 'half' },
  phaseDistribution: { label: 'Phase Distribution',        visible: true,  size: 'half' },
  projectsByDept:    { label: 'Projects by Department',    visible: true,  size: 'full' },
  benefitsBreakdown: { label: 'Benefits Breakdown',        visible: true,  size: 'half' },
  completedVsPlan:   { label: 'Completion Rate by Dept',   visible: true,  size: 'half' },
  metricsStatus:     { label: 'Improvement Metrics',       visible: true,  size: 'half' },
  recentProjects:    { label: 'Projects at Risk / Recent', visible: true,  size: 'full' },
  recentActivity:    { label: 'Recent Activity',           visible: true,  size: 'half' },
}

const STORAGE_KEY = 'dashboard_widgets_v2'

function loadWidgetConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Merge with defaults to handle new widgets added later
      const merged = { ...DEFAULT_WIDGETS }
      Object.keys(merged).forEach(k => {
        if (parsed[k] !== undefined) merged[k] = { ...merged[k], ...parsed[k] }
      })
      return merged
    }
  } catch {}
  return { ...DEFAULT_WIDGETS }
}

// ── Helpers ───────────────────────────────────────────────────
const fmtCurrency = (n) => {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

const healthLabel = { green: 'On Track', yellow: 'At Risk', red: 'Off Track' }
const healthBadge = { green: 'badge-green', yellow: 'badge-yellow', red: 'badge-red' }
const phaseLabel  = {
  define: 'Define', measure: 'Measure', analyze: 'Analyze',
  improve: 'Improve', control: 'Control', closed: 'Closed',
  plan: 'Plan', do: 'Do', check: 'Check', act: 'Act',
  identify: 'Identify', sustain: 'Sustain',
  initiate: 'Initiate', execute: 'Execute', monitor: 'Monitor', close: 'Close',
  design: 'Design', verify: 'Verify',
}

// ── Custom tooltip ────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      {label && <p className="font-semibold text-brand-charcoal-dark mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-bold">{formatter ? formatter(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Custom donut label ────────────────────────────────────────
function DonutCenterLabel({ cx, cy, total, label }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" style={{ fontSize: 28, fontWeight: 700, fill: '#2d2d2d' }}>{total}</tspan>
      <tspan x={cx} dy="1.4em" style={{ fontSize: 11, fill: CHARCOAL }}>{label}</tspan>
    </text>
  )
}

// ── Drill-Down Modal ──────────────────────────────────────────
function DrillDownModal({ title, projects, onClose, onNavigate }) {
  if (!projects) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-brand-charcoal-dark">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {projects.length === 0 ? (
            <div className="text-center py-16">
              <Users size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-brand-charcoal">No projects found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-xs font-semibold text-brand-charcoal uppercase tracking-wide">
                  <th className="text-left px-6 py-3">Project</th>
                  <th className="text-left px-6 py-3">Type</th>
                  <th className="text-left px-6 py-3">Phase</th>
                  <th className="text-left px-6 py-3">Health</th>
                  <th className="text-left px-6 py-3">Dept</th>
                  <th className="text-right px-6 py-3">Est. Savings</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-brand-charcoal-dark">{p.name}</td>
                    <td className="px-6 py-3 text-brand-charcoal capitalize">{p.type || '—'}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{phaseLabel[p.phase] || p.phase || '—'}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={healthBadge[p.health] || 'badge-gray'}>{healthLabel[p.health] || '—'}</span>
                    </td>
                    <td className="px-6 py-3 text-brand-charcoal">{p.department || '—'}</td>
                    <td className="px-6 py-3 text-right font-medium text-brand-charcoal-dark">{fmtCurrency(p.estimated_savings)}</td>
                    <td className="px-6 py-3 text-center">
                      <button onClick={() => { onNavigate(p.id); onClose() }}
                        className="inline-flex items-center gap-1 text-xs text-brand-orange hover:underline font-medium">
                        <ExternalLink size={12} /> Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Configure Dashboard Panel ─────────────────────────────────
function ConfigurePanel({ widgets, onChange, onClose }) {
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-brand-charcoal-dark">Configure Dashboard</h3>
            <p className="text-xs text-brand-charcoal mt-0.5">Show or hide widgets</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {Object.entries(widgets).map(([key, cfg]) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-center gap-3">
                <GripVertical size={16} className="text-gray-300" />
                <span className="text-sm font-medium text-brand-charcoal-dark">{cfg.label}</span>
              </div>
              <button onClick={() => onChange(key, !cfg.visible)}
                className={`w-11 h-6 rounded-full transition-colors relative ${cfg.visible ? 'bg-brand-orange' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${cfg.visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={() => { onChange('__reset__'); onClose() }}
            className="w-full text-sm text-brand-charcoal hover:text-brand-charcoal-dark py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Widget wrapper ────────────────────────────────────────────
function Widget({ title, subtitle, icon: Icon, action, children, className = '' }) {
  return (
    <div className={`card flex flex-col ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} className="text-brand-orange" />}
            <h3 className="font-semibold text-brand-charcoal-dark">{title}</h3>
          </div>
          {subtitle && <p className="text-xs text-brand-charcoal mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, color, bgColor, onClick, clickable }) {
  return (
    <div onClick={clickable ? onClick : undefined}
      className={`rounded-2xl p-5 flex flex-col gap-3 border border-transparent transition-all ${clickable ? 'cursor-pointer hover:border-gray-200 hover:shadow-md' : ''}`}
      style={{ background: bgColor }}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-brand-charcoal">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-brand-charcoal-dark">{value}</p>
        {sub && <p className="text-xs text-brand-charcoal mt-1">{sub}</p>}
      </div>
      {clickable && (
        <div className="flex items-center gap-1 text-xs font-medium" style={{ color }}>
          View details <ChevronRight size={12} />
        </div>
      )}
    </div>
  )
}

// ── Health Donut Widget ───────────────────────────────────────
function HealthDonutWidget({ projects, onDrillDown }) {
  const healthData = [
    { name: 'On Track',  value: projects.filter(p => p.health === 'green').length,  color: COLORS.green,  key: 'green'  },
    { name: 'At Risk',   value: projects.filter(p => p.health === 'yellow').length, color: COLORS.yellow, key: 'yellow' },
    { name: 'Off Track', value: projects.filter(p => p.health === 'red').length,    color: COLORS.red,    key: 'red'    },
  ].filter(d => d.value > 0)

  const total = healthData.reduce((s, d) => s + d.value, 0)

  if (total === 0) return (
    <Widget title="Project Health" icon={CheckCircle2}>
      <div className="flex-1 flex items-center justify-center py-8 text-brand-charcoal text-sm">No project data yet</div>
    </Widget>
  )

  return (
    <Widget title="Project Health" subtitle={`${total} total projects`} icon={CheckCircle2}>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="60%" height={180}>
          <PieChart>
            <Pie data={healthData} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
              paddingAngle={3} dataKey="value"
              onClick={(d) => onDrillDown(`Health: ${d.name}`, projects.filter(p => p.health === d.key))}>
              {healthData.map((d, i) => <Cell key={i} fill={d.color} cursor="pointer" />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2.5">
          {healthData.map(d => (
            <button key={d.key} onClick={() => onDrillDown(`Health: ${d.name}`, projects.filter(p => p.health === d.key))}
              className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-sm text-brand-charcoal-dark">{d.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: d.color }}>{d.value}</span>
                <span className="text-xs text-brand-charcoal">({Math.round(d.value / total * 100)}%)</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Widget>
  )
}

// ── Projects by Type Widget ───────────────────────────────────
function ProjectsByTypeWidget({ projects, onDrillDown }) {
  const data = Object.entries(
    projects.reduce((acc, p) => {
      const t = (p.type || 'general').toLowerCase()
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
  ).map(([type, count]) => ({ type: type.toUpperCase(), count, fill: TYPE_COLORS[type] || COLORS.blue }))
   .sort((a, b) => b.count - a.count)

  if (!data.length) return null

  return (
    <Widget title="Projects by Type" icon={BarChart3} subtitle="Click bar to drill down">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={60} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Projects" radius={[0, 6, 6, 0]} maxBarSize={28}
            onClick={(d) => onDrillDown(`Type: ${d.type}`, projects.filter(p => (p.type || 'general').toUpperCase() === d.type))}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} cursor="pointer" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Widget>
  )
}

// ── Projects by Department Widget ────────────────────────────
function ProjectsByDeptWidget({ projects, onDrillDown }) {
  const data = Object.entries(
    projects.reduce((acc, p) => {
      const d = p.department || 'Unassigned'
      acc[d] = (acc[d] || 0) + 1
      return acc
    }, {})
  ).map(([dept, count], i) => ({ dept, count, fill: CHART_PALETTE[i % CHART_PALETTE.length] }))
   .sort((a, b) => b.count - a.count)

  if (!data.length) return null

  return (
    <Widget title="Projects by Department" icon={Users} subtitle="Click to see projects per department" className="col-span-2">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 8, right: 24, top: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="dept" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]} maxBarSize={52}
            onClick={(d) => onDrillDown(`Dept: ${d.dept}`, projects.filter(p => (p.department || 'Unassigned') === d.dept))}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} cursor="pointer" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Widget>
  )
}

// ── Cost Savings Widget ───────────────────────────────────────
function CostSavingsWidget({ projects, onDrillDown }) {
  const actual = projects.reduce((s, p) => s + (p.actual_savings || 0), 0)
  const estimated = projects.reduce((s, p) => s + (p.estimated_savings || 0), 0)
  const pct = estimated > 0 ? Math.min(100, Math.round((actual / estimated) * 100)) : 0

  // Per-dept bars
  const depts = [...new Set(projects.map(p => p.department || 'Unassigned'))]
  const deptData = depts.map(dept => {
    const dProjects = projects.filter(p => (p.department || 'Unassigned') === dept)
    return {
      dept: dept.length > 12 ? dept.slice(0, 12) + '…' : dept,
      fullDept: dept,
      actual: dProjects.reduce((s, p) => s + (p.actual_savings || 0), 0),
      estimated: dProjects.reduce((s, p) => s + (p.estimated_savings || 0), 0),
    }
  }).filter(d => d.estimated > 0 || d.actual > 0)

  return (
    <Widget title="Cost Savings vs Goal" icon={DollarSign}
      subtitle={`${pct}% of estimated realized`}>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-green-50 border border-green-100">
          <p className="text-xs text-green-700 font-medium mb-1">Actual Savings</p>
          <p className="text-2xl font-bold text-green-700">{fmtCurrency(actual)}</p>
        </div>
        <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
          <p className="text-xs text-brand-orange font-medium mb-1">Estimated Pipeline</p>
          <p className="text-2xl font-bold text-brand-orange">{fmtCurrency(estimated)}</p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-brand-charcoal mb-1">
          <span>Realization rate</span><span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.cyan})` }} />
        </div>
      </div>
      {/* Per dept */}
      {deptData.length > 0 && (
        <div className="space-y-2">
          {deptData.slice(0, 4).map(d => {
            const p = d.estimated > 0 ? Math.min(100, Math.round((d.actual / d.estimated) * 100)) : 0
            return (
              <button key={d.fullDept} onClick={() => onDrillDown(`Savings: ${d.fullDept}`, projects.filter(p => (p.department || 'Unassigned') === d.fullDept))}
                className="w-full text-left hover:bg-gray-50 rounded-lg p-1.5 transition-colors group">
                <div className="flex justify-between text-xs text-brand-charcoal mb-1">
                  <span className="font-medium text-brand-charcoal-dark">{d.dept}</span>
                  <span>{fmtCurrency(d.actual)} / {fmtCurrency(d.estimated)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p}%`, background: COLORS.green }} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Widget>
  )
}

// ── Phase Distribution Widget ─────────────────────────────────
function PhaseDistributionWidget({ projects, onDrillDown }) {
  const phaseOrder = ['define','measure','analyze','improve','control',
                      'plan','do','check','act','identify','sustain',
                      'initiate','execute','monitor','close']

  const counts = projects.reduce((acc, p) => {
    const ph = p.phase || 'define'
    acc[ph] = (acc[ph] || 0) + 1
    return acc
  }, {})

  const data = Object.entries(counts)
    .map(([phase, count], i) => ({
      phase: phaseLabel[phase] || phase,
      rawPhase: phase,
      count,
      fill: CHART_PALETTE[phaseOrder.indexOf(phase) >= 0 ? phaseOrder.indexOf(phase) : i] || COLORS.blue,
    }))
    .sort((a, b) => (phaseOrder.indexOf(a.rawPhase) >= 0 ? phaseOrder.indexOf(a.rawPhase) : 99)
                  - (phaseOrder.indexOf(b.rawPhase) >= 0 ? phaseOrder.indexOf(b.rawPhase) : 99))

  if (!data.length) return null

  return (
    <Widget title="Phase Distribution" icon={Activity} subtitle="Where projects stand right now">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="phase" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]} maxBarSize={40}
            onClick={(d) => onDrillDown(`Phase: ${d.phase}`, projects.filter(p => (p.phase || 'define') === d.rawPhase))}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} cursor="pointer" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Widget>
  )
}

// ── Benefits Breakdown Widget ─────────────────────────────────
function BenefitsBreakdownWidget({ companyId, projects }) {
  const [benefits, setBenefits] = useState([])

  useEffect(() => {
    if (!companyId || !projects.length) return
    const load = async () => {
      const intakeIds = projects.map(p => p.intake_id).filter(Boolean)
      const projectIds = projects.map(p => p.id)
      let all = []
      if (intakeIds.length) {
        const { data } = await supabase.from('project_benefits').select('*').in('intake_id', intakeIds)
        if (data) all = [...all, ...data]
      }
      if (projectIds.length) {
        const { data } = await supabase.from('project_benefits').select('*').in('project_id', projectIds)
        if (data) {
          const ids = new Set(all.map(b => b.id))
          all = [...all, ...data.filter(b => !ids.has(b.id))]
        }
      }
      setBenefits(all)
    }
    load()
  }, [companyId, projects.length])

  const data = Object.entries(
    benefits.reduce((acc, b) => {
      const cat = b.category_name || 'Other'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
  ).map(([name, value], i) => ({ name, value, fill: CHART_PALETTE[i % CHART_PALETTE.length] }))
   .sort((a, b) => b.value - a.value)

  if (!data.length) return null

  return (
    <Widget title="Benefits Breakdown" icon={Target} subtitle={`${benefits.length} benefit entries`}>
      <div className="flex items-center gap-2">
        <ResponsiveContainer width="55%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={75}
              paddingAngle={3} dataKey="value">
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2 overflow-y-auto max-h-[180px]">
          {data.map(d => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                <span className="text-xs text-brand-charcoal-dark">{d.name}</span>
              </div>
              <span className="text-xs font-bold ml-2" style={{ color: d.fill }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Widget>
  )
}

// ── Completion Rate Widget ────────────────────────────────────
function CompletionRateWidget({ projects }) {
  const depts = [...new Set(projects.map(p => p.department || 'Unassigned'))]
  const data = depts.map(dept => {
    const all = projects.filter(p => (p.department || 'Unassigned') === dept)
    const done = all.filter(p => p.status === 'completed').length
    return { dept: dept.length > 14 ? dept.slice(0, 14) + '…' : dept, total: all.length, done, pct: all.length ? Math.round(done / all.length * 100) : 0 }
  }).sort((a, b) => b.pct - a.pct)

  if (!data.length) return null

  return (
    <Widget title="Completion Rate by Department" icon={TrendingUp}>
      <div className="space-y-3 mt-1">
        {data.map(d => (
          <div key={d.dept}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-brand-charcoal-dark">{d.dept}</span>
              <span className="text-brand-charcoal">{d.done}/{d.total} <span className="font-semibold" style={{ color: d.pct > 66 ? COLORS.green : d.pct > 33 ? COLORS.yellow : COLORS.red }}>{d.pct}%</span></span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${d.pct}%`, background: d.pct > 66 ? COLORS.green : d.pct > 33 ? COLORS.yellow : COLORS.red }} />
            </div>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ── Improvement Metrics Widget ────────────────────────────────
function MetricsStatusWidget({ companyId, projects }) {
  const [metrics, setMetrics] = useState([])

  useEffect(() => {
    if (!companyId || !projects.length) return
    const ids = projects.map(p => p.id)
    supabase.from('improvement_metrics').select('*').in('project_id', ids)
      .then(({ data }) => setMetrics(data || []))
  }, [companyId, projects.length])

  if (!metrics.length) return null

  const statusConfig = {
    tracking:  { label: 'Tracking',   fill: COLORS.blue },
    on_target: { label: 'On Target',  fill: COLORS.green },
    at_risk:   { label: 'At Risk',    fill: COLORS.yellow },
    achieved:  { label: 'Achieved',   fill: COLORS.teal },
    missed:    { label: 'Missed',     fill: COLORS.red },
  }

  const data = Object.entries(statusConfig).map(([key, cfg]) => ({
    name: cfg.label,
    value: metrics.filter(m => (m.status || 'tracking') === key).length,
    fill: cfg.fill,
  })).filter(d => d.value > 0)

  const byCategory = metrics.reduce((acc, m) => {
    const cat = m.category || 'Other'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})

  return (
    <Widget title="Improvement Metrics" icon={Target} subtitle={`${metrics.length} metrics tracked`}>
      <div className="flex items-center gap-2 mb-4">
        <ResponsiveContainer width="60%" height={160}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={44} outerRadius={68}
              paddingAngle={3} dataKey="value">
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.map(d => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                <span className="text-xs text-brand-charcoal-dark">{d.name}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: d.fill }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-brand-charcoal mb-2">By Category</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(byCategory).map(([cat, count]) => (
            <span key={cat} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-brand-charcoal-dark">
              {cat} <span className="font-bold text-brand-orange">{count}</span>
            </span>
          ))}
        </div>
      </div>
    </Widget>
  )
}

// ── Projects At Risk Table ────────────────────────────────────
function ProjectsAtRiskWidget({ projects, onNavigate }) {
  const sorted = [...projects]
    .sort((a, b) => {
      const o = { red: 0, yellow: 1, green: 2 }
      return (o[a.health] ?? 3) - (o[b.health] ?? 3)
    })
    .slice(0, 8)

  if (!sorted.length) return null

  return (
    <Widget title="Projects Overview" icon={AlertTriangle}
      subtitle="Sorted by health status — click any row to open in Workspace"
      className="col-span-2">
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-brand-charcoal uppercase tracking-wide">
              <th className="text-left pb-3">Project</th>
              <th className="text-left pb-3">Type</th>
              <th className="text-left pb-3">Phase</th>
              <th className="text-left pb-3">Health</th>
              <th className="text-left pb-3">Dept</th>
              <th className="text-right pb-3">Est. Savings</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map(p => (
              <tr key={p.id} onClick={() => onNavigate(p.id)}
                className="hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="py-3 font-medium text-brand-charcoal-dark pr-4">{p.name}</td>
                <td className="py-3 text-brand-charcoal capitalize pr-4">{p.type || '—'}</td>
                <td className="py-3 pr-4">
                  <span className="text-xs bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                    {phaseLabel[p.phase] || p.phase || '—'}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {p.health
                    ? <span className={healthBadge[p.health]}>{healthLabel[p.health]}</span>
                    : <span className="text-brand-charcoal">—</span>}
                </td>
                <td className="py-3 text-brand-charcoal pr-4">{p.department || '—'}</td>
                <td className="py-3 text-right font-medium text-brand-charcoal-dark">{fmtCurrency(p.estimated_savings)}</td>
                <td className="py-3 pl-4">
                  <span className="text-brand-orange opacity-0 group-hover:opacity-100">
                    <ExternalLink size={14} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Widget>
  )
}

// ── Recent Activity Widget ────────────────────────────────────
function RecentActivityWidget({ logs }) {
  if (!logs.length) return null
  return (
    <Widget title="Recent Activity" icon={Activity}>
      <div className="space-y-3">
        {logs.map(log => (
          <div key={log.id} className="flex gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
            <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock size={13} className="text-brand-orange" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-charcoal-dark capitalize">{log.action?.replace(/_/g, ' ')} — {log.entity_type}</p>
              <p className="text-xs text-brand-charcoal mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const [userProfile, setUserProfile] = useState(null)
  const [projects, setProjects]       = useState([])
  const [intakeRequests, setIntakeRequests] = useState([])
  const [activityLogs, setActivityLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const [timePeriod, setTimePeriod]       = useState('this-year')
  const [customStart, setCustomStart]     = useState('')
  const [customEnd, setCustomEnd]         = useState('')
  const [drillDownData, setDrillDownData] = useState(null)
  const [drillTitle, setDrillTitle]       = useState('')
  const [showConfig, setShowConfig]       = useState(false)
  const [widgets, setWidgets]             = useState(loadWidgetConfig)

  const saveWidgets = (next) => {
    setWidgets(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const toggleWidget = (key, visible) => {
    if (key === '__reset__') { saveWidgets({ ...DEFAULT_WIDGETS }); return }
    saveWidgets({ ...widgets, [key]: { ...widgets[key], visible } })
  }

  const drillDown = useCallback((title, projects) => {
    setDrillTitle(title)
    setDrillDownData(projects)
  }, [])

  const goToProject = useCallback((id) => {
    navigate(`/workspace?project=${id}`)
  }, [navigate])

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  useEffect(() => {
    if (!userProfile?.company_id) return
    const load = async () => {
      try {
        const [{ data: projData }, { data: intakeData }, { data: actData }] = await Promise.all([
          supabase.from('projects')
            .select('*, lead_profile:profiles!project_lead_id(department)')
            .eq('company_id', userProfile.company_id)
            .order('updated_at', { ascending: false }),
          supabase.from('intake_requests').select('*')
            .eq('company_id', userProfile.company_id).eq('status', 'under_review'),
          supabase.from('activity_logs').select('*')
            .eq('company_id', userProfile.company_id)
            .order('created_at', { ascending: false }).limit(8),
        ])
        setProjects((projData || []).map(p => ({ ...p, department: p.lead_profile?.department || 'Unassigned' })))
        setIntakeRequests(intakeData || [])
        setActivityLogs(actData || [])
        setLoading(false)
      } catch (e) { setError(e.message); setLoading(false) }
    }
    load()
  }, [userProfile?.company_id])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-brand-orange animate-spin mx-auto mb-2" />
        <p className="text-brand-charcoal text-sm">Loading dashboard…</p>
      </div>
    </div>
  )

  // ── Filtered projects ──
  const filtered = projects.filter(p => {
    if (!p.target_date) return true
    const d = new Date(p.target_date)
    const now = new Date()
    if (timePeriod === 'this-year')  return d.getFullYear() === now.getFullYear()
    if (timePeriod === 'last-year')  return d.getFullYear() === now.getFullYear() - 1
    if (timePeriod === 'custom') {
      const s = customStart ? new Date(customStart) : new Date(now.getFullYear(), 0, 1)
      const e = customEnd   ? new Date(customEnd)   : now
      return d >= s && d <= e
    }
    return true
  })

  const activeProjects   = filtered.filter(p => p.status === 'active')
  const completedProjects = filtered.filter(p => p.status === 'completed')
  const pipelineValue    = activeProjects.reduce((s, p) => s + (p.estimated_savings || 0), 0)
  const actualSavings    = filtered.reduce((s, p) => s + (p.actual_savings || 0), 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const show = (key) => widgets[key]?.visible

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-charcoal-dark">{greeting}, {name}!</h2>
          <p className="text-brand-charcoal text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time period */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <Calendar size={15} className="text-brand-orange" />
            <select value={timePeriod} onChange={e => setTimePeriod(e.target.value)} className="bg-transparent outline-none text-brand-charcoal-dark font-medium cursor-pointer">
              <option value="this-year">This Year</option>
              <option value="last-year">Last Year</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {timePeriod === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="outline-none text-sm text-brand-charcoal-dark" />
              <span className="text-gray-300">→</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="outline-none text-sm text-brand-charcoal-dark" />
            </div>
          )}
          {/* Configure */}
          <button onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-brand-charcoal-dark hover:border-brand-orange hover:text-brand-orange transition-colors">
            <Settings2 size={15} /> Configure
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Active Projects" value={activeProjects.length}
          sub="in progress" icon={BarChart3} color={COLORS.orange} bgColor="#FFF7ED"
          clickable onClick={() => drillDown('Active Projects', activeProjects)} />
        <KPICard label="Pending Review" value={intakeRequests.length}
          sub="awaiting approval" icon={Inbox} color={COLORS.blue} bgColor="#EFF6FF"
          clickable={false} />
        <KPICard label="On Track" value={filtered.filter(p => p.health === 'green').length}
          sub="projects healthy" icon={CheckCircle2} color={COLORS.green} bgColor="#F0FDF4"
          clickable onClick={() => drillDown('On Track', filtered.filter(p => p.health === 'green'))} />
        <KPICard label="At Risk / Off Track" value={filtered.filter(p => ['yellow','red'].includes(p.health)).length}
          sub="need attention" icon={AlertTriangle} color={COLORS.red} bgColor="#FFF1F2"
          clickable onClick={() => drillDown('At Risk / Off Track', filtered.filter(p => ['yellow','red'].includes(p.health)))} />
        <KPICard label="Completed" value={completedProjects.length}
          sub="this period" icon={TrendingUp} color={COLORS.purple} bgColor="#F5F3FF"
          clickable onClick={() => drillDown('Completed Projects', completedProjects)} />
      </div>

      {/* ── Pipeline value banner ── */}
      {pipelineValue > 0 && (
        <div className="rounded-2xl p-5 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${ORANGE}18, ${COLORS.purple}12)`, border: `1px solid ${ORANGE}30` }}>
          <div>
            <p className="text-sm font-medium text-brand-charcoal mb-1">Total Pipeline Value (Active Projects)</p>
            <p className="text-4xl font-bold text-brand-charcoal-dark">{fmtCurrency(pipelineValue)}</p>
            {actualSavings > 0 && (
              <p className="text-sm text-brand-charcoal mt-1">
                <span className="font-semibold text-green-600">{fmtCurrency(actualSavings)}</span> already realized
              </p>
            )}
          </div>
          <DollarSign size={48} className="text-brand-orange opacity-20" />
        </div>
      )}

      {/* ── Chart Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {show('healthDonut') && (
          <HealthDonutWidget projects={filtered} onDrillDown={drillDown} />
        )}

        {show('projectsByType') && (
          <ProjectsByTypeWidget projects={filtered} onDrillDown={drillDown} />
        )}

        {show('costSavings') && (
          <CostSavingsWidget projects={filtered} onDrillDown={drillDown} />
        )}

        {show('phaseDistribution') && (
          <PhaseDistributionWidget projects={filtered} onDrillDown={drillDown} />
        )}

        {show('benefitsBreakdown') && userProfile?.company_id && (
          <BenefitsBreakdownWidget companyId={userProfile.company_id} projects={filtered} />
        )}

        {show('metricsStatus') && userProfile?.company_id && (
          <MetricsStatusWidget companyId={userProfile.company_id} projects={filtered} />
        )}

        {show('completedVsPlan') && (
          <CompletionRateWidget projects={filtered} />
        )}

        {show('recentActivity') && (
          <RecentActivityWidget logs={activityLogs} />
        )}

      </div>

      {/* ── Full-width widgets ── */}
      <div className="space-y-5">
        {show('projectsByDept') && (
          <ProjectsByDeptWidget projects={filtered} onDrillDown={drillDown} />
        )}

        {show('recentProjects') && (
          <ProjectsAtRiskWidget projects={filtered} onNavigate={goToProject} />
        )}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-12">
          <Users size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-brand-charcoal-dark mb-1">No projects in this time period</p>
          <p className="text-sm text-brand-charcoal">Adjust the time period filter above or create your first project.</p>
        </div>
      )}

      {/* ── Modals ── */}
      {drillDownData && (
        <DrillDownModal title={drillTitle} projects={drillDownData}
          onClose={() => setDrillDownData(null)} onNavigate={goToProject} />
      )}

      {showConfig && (
        <ConfigurePanel widgets={widgets} onChange={toggleWidget} onClose={() => setShowConfig(false)} />
      )}

    </div>
  )
}
