import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { AlertCircle, CheckCircle, ChevronLeft, Star, Zap, Building2, Check } from 'lucide-react'

const INDUSTRIES = [
  'Manufacturing',
  'Services',
  'Consulting',
  'Healthcare',
  'IT/Technology',
  'Other',
]

const TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern (ET)' },
  { value: 'America/Chicago',     label: 'Central (CT)' },
  { value: 'America/Denver',      label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Phoenix',     label: 'Arizona (MST, no DST)' },
  { value: 'America/Anchorage',   label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii (HT)' },
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    userLimit: 'Up to 10 users',
    features: ['Core execution', 'Templates', 'Basic dashboard'],
    icon: Zap,
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149,
    userLimit: 'Up to 30 users',
    badge: 'Most Popular',
    features: ['All modules', 'AI Coach', 'AI Builder'],
    icon: Star,
    highlight: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 349,
    userLimit: 'Up to 100 users',
    features: ['Risk Radar', 'Insights Hub', 'Stakeholder portal'],
    icon: Building2,
    highlight: false,
  },
]

function generateSlug(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Math.random().toString(36).substring(2, 6)
  )
}

// Progress dots
function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i + 1 === current
              ? 'w-6 h-2.5 bg-brand-orange'
              : i + 1 < current
              ? 'w-2.5 h-2.5 bg-brand-orange/40'
              : 'w-2.5 h-2.5 bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function Register() {
  const { signUp } = useAuth()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')

  // Step 1 — company
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [timezone, setTimezone] = useState('America/Denver')

  // Step 2 — user
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 3 — plan
  const [selectedPlan, setSelectedPlan] = useState('growth')

  const validateStep1 = () => {
    if (!companyName.trim()) { setError('Company name is required'); return false }
    setError('')
    return true
  }

  const validateStep2 = () => {
    if (!fullName.trim()) { setError('Full name is required'); return false }
    if (!email.trim()) { setError('Work email is required'); return false }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return false }
    setError('')
    return true
  }

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setError('')
    setStep(s => s + 1)
  }

  const handleBack = () => {
    setError('')
    setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return
    setLoading(true)
    setError('')

    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await signUp(email, password, {
        full_name: fullName,
      })
      if (signUpError) throw signUpError

      const newUserId = authData?.user?.id
      if (!newUserId) {
        // Email confirmation required — still show success
        setSuccessEmail(email)
        setSuccess(true)
        setLoading(false)
        return
      }

      // 2. Create company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName.trim(),
          slug: generateSlug(companyName.trim()),
          industry: industry || null,
          timezone: timezone,
        })
        .select()
        .single()

      if (companyError) throw companyError

      // 3. Update profile with company_id and full_name
      await supabase
        .from('profiles')
        .update({
          company_id: companyData.id,
          full_name: fullName.trim(),
        })
        .eq('id', newUserId)

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setSuccessEmail(email)
    setSuccess(true)
    setLoading(false)
  }

  // ── Success screen ──────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-status-green-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-status-green" />
          </div>
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-sm text-brand-charcoal mb-4">
            We sent a confirmation link to <strong>{successEmail}</strong>. Click it to activate your account.
          </p>
          <Link to="/login" className="btn-primary inline-block">Back to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-brand-orange rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-base">PA</span>
          </div>
          <div>
            <div className="text-brand-charcoal-dark font-bold text-lg leading-tight">Projects</div>
            <div className="text-brand-orange font-bold text-lg leading-tight">Alpha</div>
          </div>
        </div>

        {/* Progress */}
        <ProgressDots current={step} total={3} />

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-status-red-bg text-status-red rounded-lg mb-4 text-sm">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* ── Step 1: Company Info ── */}
        {step === 1 && (
          <div className="card">
            <h2 className="text-xl font-bold text-brand-charcoal-dark mb-1">Set up your company</h2>
            <p className="text-sm text-brand-charcoal mb-6">Tell us about your organization</p>

            <div className="space-y-4">
              <div>
                <label className="label">Company Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="input"
                  placeholder="Lean Six Sigma Experts"
                  required
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                />
              </div>
              <div>
                <label className="label">Industry</label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="input"
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Timezone</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="input"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleNext} className="btn-primary w-full py-2.5">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Your Info ── */}
        {step === 2 && (
          <div className="card">
            <h2 className="text-xl font-bold text-brand-charcoal-dark mb-1">Create your account</h2>
            <p className="text-sm text-brand-charcoal mb-6">You'll be the account owner</p>

            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="input"
                  placeholder="JP Gnanam"
                  required
                />
              </div>
              <div>
                <label className="label">Work Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label className="label">Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input"
                  placeholder="Min. 8 characters"
                  minLength={8}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleBack} className="btn-secondary flex items-center gap-1 py-2.5">
                  <ChevronLeft size={15} /> Back
                </button>
                <button onClick={handleNext} className="btn-primary flex-1 py-2.5">
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Plan ── */}
        {step === 3 && (
          <div>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-brand-charcoal-dark">Choose a plan</h2>
              <p className="text-sm text-brand-charcoal mt-1">Start free — no credit card required</p>
            </div>

            <div className="space-y-3 mb-4">
              {PLANS.map(plan => {
                const Icon = plan.icon
                const isSelected = selectedPlan === plan.id
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-brand-orange bg-brand-orange/5'
                        : 'border-surface-border bg-white hover:border-brand-orange/30'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute top-2 right-3 bg-brand-orange text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {plan.badge}
                      </span>
                    )}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.highlight ? 'bg-brand-orange/20' : 'bg-surface-secondary'}`}>
                      <Icon size={16} className={plan.highlight ? 'text-brand-orange' : 'text-brand-charcoal'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-brand-charcoal-dark">{plan.name}</span>
                        <span className="text-sm text-brand-charcoal">${plan.price}/mo</span>
                        <span className="text-xs text-brand-charcoal/60">{plan.userLimit}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 mt-1">
                        {plan.features.map((f, i) => (
                          <span key={i} className="text-xs text-brand-charcoal flex items-center gap-0.5">
                            <Check size={10} className="text-status-green" /> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-brand-orange flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2">
              <button onClick={handleBack} className="btn-secondary flex items-center gap-1 py-2.5">
                <ChevronLeft size={15} /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Start Free Trial'}
              </button>
            </div>
            <p className="text-center text-xs text-brand-charcoal/50 mt-3">
              14-day free trial · No credit card required
            </p>
          </div>
        )}

        <p className="text-center text-sm text-brand-charcoal mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-orange font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
