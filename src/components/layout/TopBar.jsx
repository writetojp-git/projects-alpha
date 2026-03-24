import { Bell, Search, Plus, X, Send } from 'lucide-react'
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
    title: '',
    problemStatement: '',
    department: '',
    projectType: 'dmaic',
    estimatedSavings: '',
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
      title: '',
      problemStatement: '',
      department: '',
      projectType: 'dmaic',
      estimatedSavings: '',
    })
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!formData.title.trim()) {
      setError('Project name is required')
      return
    }
    if (!formData.problemStatement.trim()) {
      setError('Problem statement is required')
      return
    }

    setLoading(true)

    try {
      // Fetch user profile to get company_id
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, id')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile) {
        setError('Unable to fetch your profile. Please try again.')
        setLoading(false)
        return
      }

      // Insert into intake_requests (NOT projects — must go through prioritization)
      const { error: insertError } = await supabase
        .from('intake_requests')
        .insert([
          {
            title: formData.title.trim(),
            problem_statement: formData.problemStatement.trim(),
            department: formData.department.trim() || null,
            project_type: formData.projectType,
            estimated_savings: formData.estimatedSavings ? parseFloat(formData.estimatedSavings) : null,
            company_id: userProfile.company_id,
            requested_by: userProfile.id,
            status: 'submitted',
          }
        ])

      if (insertError) {
        setError(insertError.message || 'Failed to submit request')
        setLoading(false)
        return
      }

      setSuccess(true)
      resetForm()

      // Navigate to intake queue after a brief delay
      setTimeout(() => {
        setIsModalOpen(false)
        setSuccess(false)
        navigate('/intake')
      }, 1200)
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

        {/* New Request — available on every page */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 text-sm py-1.5"
        >
          <Plus size={15} />
          + New Request
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors text-brand-charcoal">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-orange rounded-full"></span>
        </button>
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card w-full max-w-md rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-brand-charcoal-dark">Submit New Request</h2>
                <p className="text-sm text-brand-charcoal mt-0.5">Your request will go through the prioritization process</p>
              </div>
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
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <Send size={14} />
                  Request submitted! Redirecting to Intake Queue...
                </div>
              )}

              {/* Project Name */}
              <div>
                <label className="label block mb-1">Project Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Reduce Order Processing Time"
                  className="input w-full"
                  disabled={loading}
                />
              </div>

              {/* Problem Statement */}
              <div>
                <label className="label block mb-1">Problem Statement <span className="text-red-500">*</span></label>
                <textarea
                  name="problemStatement"
                  value={formData.problemStatement}
                  onChange={handleInputChange}
                  placeholder="Describe the problem you're trying to solve"
                  className="input w-full h-20 resize-none"
                  disabled={loading}
                />
              </div>

              {/* Project Type + Department */}
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="label block mb-1">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="e.g. Operations"
                    className="input w-full"
                    disabled={loading}
                  />
                </div>
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
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  <Send size={14} />
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
