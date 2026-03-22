import { Construction } from 'lucide-react'

export default function Templates() {
  return (
    <div className="flex items-center justify-center h-full min-h-96">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Construction size={28} className="text-brand-orange" />
        </div>
        <h2 className="text-xl font-bold text-brand-charcoal-dark mb-2">Templates</h2>
        <p className="text-brand-charcoal text-sm max-w-xs">This module is coming in Phase 1. Check back soon!</p>
      </div>
    </div>
  )
}
