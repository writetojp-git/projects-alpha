import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, FileText, Inbox,
  BarChart3, BookOpen, Activity, Settings, LogOut, ChevronLeft
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/portfolio', icon: BarChart3, label: 'Portfolio' },
  { to: '/intake', icon: Inbox, label: 'Intake Queue' },
  { to: '/workspace', icon: FolderOpen, label: 'Workspace' },
  { to: '/execution', icon: Activity, label: 'Execution' },
  { to: '/templates', icon: BookOpen, label: 'Templates' },
  { to: '/activity', icon: FileText, label: 'Activity Feed' },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className={`relative flex flex-col bg-brand-charcoal-dark h-screen transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-brand-orange rounded flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">PA</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm leading-tight">Projects</div>
            <div className="text-brand-orange font-bold text-sm leading-tight">Alpha</div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-brand-charcoal-dark border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-brand-orange transition-colors z-10"
      >
        <ChevronLeft size={12} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors duration-150 group ${
                isActive
                  ? 'bg-brand-orange text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Settings + User */}
      <div className="border-t border-white/10 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`
          }
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} />
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </NavLink>

        {!collapsed && user && (
          <div className="flex items-center gap-3 px-4 py-3 mx-2">
            <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{user.email}</div>
            </div>
            <button onClick={handleSignOut} className="text-white/50 hover:text-white transition-colors" title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        )}

        {collapsed && (
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-full py-3 text-white/50 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
