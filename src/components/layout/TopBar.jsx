import { Bell, Search, Plus, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

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

const projectTypes = [
  { value: 'dmaic', label: 'DMAIC' },
  { value: 'dmadv', label: 'DMADV' },
  { value: 'kaizen', label: 'Kaizen' },
  { value: 'lean', label: 'Lean' },
  { value: 'general', label: 'General' },
]

export default function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const title = pageTitles[location.pathname] || 'Projects Alpha'

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    projectType: 'general',
    startDate: '',
    targetDate: '',
    estimatedSavings: '',
    priority: '3',
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      projectName: '',
      description: '',
      projectType: 'general',
      startDate: '',
      targetDate: '',
      estimatedSavings: '',
      priority: '3',
    })
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validate required field
    if (!formData.projectName.trim()) {
      setError('Project name is required')
      return
    }

    setLoading(true)

    try {
      // Fetch user profile to get company_id
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile) {
        setError('Unable to fetch your profile. Please try again.')
        setLoading(false)
        return
      }

      // Insert new project
      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert([
          {
            name: formData.projectName,
            description: formData.description || null,
            type: formData.projectType,
            start_date: formData.startDate || null,
            target_date: formData.targetDate || null,
            estimated_savings: formData.estimatedSavings ? parseFloat(formData.estimatedSavings) : null,
            priority: parseInt(formData.priority),
            status: 'active',
            phase: 'define',
            health: 'green',
            company_id: userProfile.company_id,
            created_by: user.id,
            project_lead_id: user.id,
          }
        ])
        .select()

      if (insertError) {
        setError(insertError.message || 'Failed to create project')
        setLoading(false)
        return
      }

      setSuccess(true)
      resetForm()

      // Navigate to workspace after a brief delay
      setTimeout(() => {
        setIsModalOpen(false)
        navigate('/workspace')
      }, 1000)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
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

        {/* New Project */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 text-sm py-1.5"
        >
          <Plus size={15} />
          New Project
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors text-brand-charcoal">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-orange rounded-full"></span>
        </button>
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card w-full max-w-md rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-brand-charcoal-dark">Create New Project</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Project created successfully! Redirecting...
                </div>
              )}

              {/* Project Name */}
              <div>
                <label className="label block mb-1">Project Name *</label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  placeholder="Enter project name"
                  className="input w-full"
                  disabled={loading}
                />
              </div>

              {/* Description */}
              <div>
                <label className="label block mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter project description"
                  className="input w-full h-24 resize-none"
                  disabled={loading}
                />
              </div>

              {/* Project Type */}
              <div>
                <label className="label block mb-1">Project Type</label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleInputChange}
                  className="input w-full"
                  disabled={loading}
                >
                  {projectTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="label block mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="input w-full"
                  disabled={loading}
                />
              </div>

              {/* Target Date */}
              <div>
                <label className="label block mb-1">Target Date</label>
                <input
                  type="date"
                  name="targetDate"
                  value={formData.targetDate}
                  onChange={handleInputChange}
                  className="input w-full"
                  disabled={loading}
                />
              </div>

              {/* Estimated Savings */}
              <div>
                <label className="label block mb-1">Estimated Savings ($)</label>
                <input
                  type="number"
                  name="estimatedSavings"
                  value={formData.estimatedSavings}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="input w-full"
                  disabled={loading}
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="label block mb-1">Priority (1-5)</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="input w-full"
                  disabled={loading}
                >
                  <option value="1">1 - Lowest</option>
                  <option value="2">2</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4</option>
                  <option value="5">5 - Highest</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
