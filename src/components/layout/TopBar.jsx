import { Bell, Search, Plus } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/portfolio': 'Portfolio',
  '/intake': 'Intake Queue',
  '/workspace': 'Workspace',
  '/execution': 'Execution',
  '/templates': 'Templates',
  '/activity': 'Activity Feed',
  '/settings': 'Settings',
}

export default function TopBar() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Projects Alpha'

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-lg font-semibold text-brand-charcoal-dark">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            className="pl-9 pr-4 py-1.5 text-sm bg-surface-secondary border border-gray-100 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange/40 transition-colors"
          />
        </div>

        {/* New Project */}
        <button className="btn-primary flex items-center gap-2 text-sm py-1.5">
          <Plus size={15} />
          New Project
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors text-brand-charcoal">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-orange rounded-full"></span>
        </button>
      </div>
    </header>
  )
}
