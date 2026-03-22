import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Mail, AlertCircle, CheckCircle } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await resetPassword(email)
    if (error) { setError(error.message); setLoading(false) }
    else setSent(true)
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
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-status-green-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} className="text-status-green" />
              </div>
              <h2 className="text-xl font-bold mb-2">Email sent</h2>
              <p className="text-sm text-brand-charcoal mb-4">Check your inbox for a password reset link.</p>
              <Link to="/login" className="btn-primary inline-block">Back to Login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-brand-charcoal-dark mb-1">Reset password</h2>
              <p className="text-sm text-brand-charcoal mb-6">Enter your email and we'll send you a reset link.</p>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-status-red-bg text-status-red rounded-lg mb-4 text-sm">
                  <AlertCircle size={15} />{error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@company.com" required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>
                    <Mail size={15} /> Send reset link
                  </>}
                </button>
              </form>
              <p className="text-center text-sm text-brand-charcoal mt-4">
                <Link to="/login" className="text-brand-orange font-medium hover:underline">Back to login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
