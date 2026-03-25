import { Search, Plus, Sparkles } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import SubmitRequestModal from '../ui/SubmitRequestModal'
import AIProjectPlanner from '../ai/AIProjectPlanner'
import NotificationsPanel from '../ui/NotificationsPanel'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/portfolio': 'Portfolio',
  '/intake': 'Intake Queue',
  '/workspace': 'Workspace',
  '/charter': 'Project Charter',
  '/execution': 'Execution',
  '/templates': 'Templates',
  '/activity': 'Activity Feed',
  '/billing': 'Billing & Plan',
  '/settings': 'Settings',
}

export default function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const title = pageTitles[location.pathname] || 'Projects Alpha'

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showAIPlanner, setShowAIPlanner] = useState(false)
  const [userProfile, setUserProfile] = useState(null)

  // Load user profile for the modal
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  const handleRequestSuccess = () => {
    setShowRequestModal(false)
    navigate('/intake')
  }

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

        {/* AI Project Planner */}
        <button
          onClick={() => setShowAIPlanner(true)}
          className="flex items-center gap-1.5 text-sm py-1.5 px-3 rounded border border-brand-orange/30 text-brand-orange bg-brand-orange/5 hover:bg-brand-orange/10 transition-colors font-semibold"
        >
          <Sparkles size={14} />
          AI Planner
        </button>

        {/* New Request — available on every page */}
        <button
          onClick={() => setShowRequestModal(true)}
          className="btn-primary flex items-center gap-2 text-sm py-1.5"
        >
          <Plus size={15} />
          + New Request
        </button>

        {/* Notifications */}
        <NotificationsPanel userId={user?.id} companyId={userProfile?.company_id} />
      </div>

      {/* Shared Submit Request Modal — same one used in Intake Queue */}
      {showRequestModal && userProfile && (
        <SubmitRequestModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={handleRequestSuccess}
          userProfile={userProfile}
        />
      )}
      {showAIPlanner && userProfile && (
        <AIProjectPlanner
          onClose={() => setShowAIPlanner(false)}
          userProfile={userProfile}
        />
      )}
    </header>
  )
}

