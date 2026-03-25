import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CreditCard, Check, Star, Zap, Building2, AlertCircle } from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    userLimit: 'Up to 10 users',
    badge: null,
    features: [
      'Core project execution',
      'Intake queue & templates',
      'Basic analytics dashboard',
      'Phase & task management',
      'Team & role management',
      'Email support',
    ],
    icon: Zap,
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149,
    userLimit: 'Up to 30 users',
    badge: 'Most Popular',
    features: [
      'Everything in Starter',
      'AI Project Coach',
      'AI Project Builder',
      'Advanced analytics',
      'Portfolio dashboard',
      'Priority email support',
    ],
    icon: Star,
    highlight: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 349,
    userLimit: 'Up to 100 users',
    badge: null,
    features: [
      'Everything in Growth',
      'Risk Radar (AI)',
      'Executive Insights Hub',
      'Stakeholder portal',
      'Custom project types',
      'Dedicated success manager',
    ],
    icon: Building2,
    highlight: false,
  },
]

export default function Billing() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [company, setCompany] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('growth')

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*, companies(*)').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setUserProfile(data)
          setCompany(data.companies)
        }
      })
  }, [user])

  const trialDaysLeft = () => {
    if (!company?.trial_ends_at) return 14
    const end = new Date(company.trial_ends_at)
    const now = new Date()
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const daysLeft = trialDaysLeft()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Stripe banner */}
      <div className="flex items-start gap-3 p-4 bg-brand-orange/10 border border-brand-orange/30 rounded-xl">
        <CreditCard size={18} className="text-brand-orange flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-brand-orange">Stripe billing coming soon</p>
          <p className="text-sm text-brand-charcoal mt-0.5">
            You're on a free trial — no credit card required. To enable paid subscriptions,
            add your Stripe keys in your Vercel environment variables.
          </p>
        </div>
      </div>

      {/* Current plan card */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-brand-charcoal-dark">Current Plan</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-bold text-brand-charcoal-dark">Free Trial</span>
              <span className="badge-yellow">Trial</span>
            </div>
            <p className="text-sm text-brand-charcoal mt-1">
              {daysLeft > 0
                ? `Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`
                : 'Your trial has ended.'}
              {' '}Select a plan below to continue.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-brand-charcoal">
              Company: <span className="font-semibold text-brand-charcoal-dark">{company?.name || '—'}</span>
            </div>
            <div className="text-sm text-brand-charcoal mt-1">
              Status: <span className="font-semibold capitalize">{company?.subscription_status || 'trial'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="card">
        <h3 className="text-sm font-semibold text-brand-charcoal-dark mb-3">Usage (Current Period)</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Users', value: '—' },
            { label: 'Active Projects', value: '—' },
            { label: 'Storage Used', value: '—' },
          ].map(item => (
            <div key={item.label} className="text-center p-3 bg-surface-secondary rounded-lg">
              <div className="text-2xl font-bold text-brand-charcoal-dark">{item.value}</div>
              <div className="text-xs text-brand-charcoal mt-1">{item.label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-brand-charcoal/50 mt-3 flex items-center gap-1">
          <AlertCircle size={11} />
          Usage tracking will be available once billing is configured.
        </p>
      </div>

      {/* Plan cards */}
      <div>
        <h3 className="text-sm font-semibold text-brand-charcoal-dark mb-4">Choose Your Plan</h3>
        <div className="grid grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const Icon = plan.icon
            const isSelected = selectedPlan === plan.id
            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-5 flex flex-col transition-all cursor-pointer ${
                  plan.highlight
                    ? 'border-brand-orange bg-brand-orange/5 shadow-md'
                    : isSelected
                    ? 'border-brand-orange/40 bg-white shadow-sm'
                    : 'border-surface-border bg-white hover:border-brand-orange/30'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-orange text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.highlight ? 'bg-brand-orange/20' : 'bg-surface-secondary'}`}>
                    <Icon size={16} className={plan.highlight ? 'text-brand-orange' : 'text-brand-charcoal'} />
                  </div>
                  <span className="font-bold text-brand-charcoal-dark">{plan.name}</span>
                </div>

                <div className="mb-1">
                  <span className="text-3xl font-bold text-brand-charcoal-dark">${plan.price}</span>
                  <span className="text-sm text-brand-charcoal">/month</span>
                </div>
                <p className="text-xs text-brand-charcoal mb-4">{plan.userLimit}</p>

                <ul className="space-y-1.5 flex-1 mb-5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-brand-charcoal">
                      <Check size={12} className="text-status-green flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-brand-orange text-white hover:bg-brand-orange/90'
                      : 'bg-surface-secondary text-brand-charcoal-dark hover:bg-surface-border'
                  }`}
                >
                  Select Plan
                </button>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-brand-charcoal/50 text-center mt-4">
          All plans include a 14-day free trial. No credit card required to start.
          Stripe billing activation required to process payments.
        </p>
      </div>

    </div>
  )
}
