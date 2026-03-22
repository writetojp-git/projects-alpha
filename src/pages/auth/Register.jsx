import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signUp(form.email, form.password, {
      full_name: form.name,
      company: form.company
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-status-green-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-status-green" />
          </div>
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-sm text-brand-charcoal mb-4">
            We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your account.
          </p>
          <Link to="/login" className="btn-primary inline-block">Back to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-brand-orange rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-base">PA</span>
          </div>
          <div>
            <div className="text-brand-charcoal-dark font-bold text-lg leading-tight">Projects</div>
            <div className="text-brand-orange font-bold text-lg leading-tight">Alpha</div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-brand-charcoal-dark mb-1">Create your account</h2>
          <p className="text-sm text-brand-charcoal mb-6">Start your free trial — no credit card required</p>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-status-red-bg text-status-red rounded-lg mb-4 text-sm">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input name="name" type="text" value={form.name} onChange={handleChange} className="input" placeholder="JP Gnanam" required />
            </div>
            <div>
              <label className="label">Company</label>
              <input name="company" type="text" value={form.company} onChange={handleChange} className="input" placeholder="Lean Six Sigma Experts" required />
            </div>
            <div>
              <label className="label">Work email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input" placeholder="you@company.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} className="input" placeholder="Min. 8 characters" minLength={8} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-brand-charcoal mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-orange font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
