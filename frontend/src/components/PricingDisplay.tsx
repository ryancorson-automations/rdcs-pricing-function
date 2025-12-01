'use client'

import { Property, PricingTier } from '@/types'

interface PricingDisplayProps {
  property: Property
  tiers: PricingTier[]
  onSelectTier: (tier: string) => void
}

export default function PricingDisplay({ property, tiers, onSelectTier }: PricingDisplayProps) {
  const getTierIcon = (tier: string) => {
    if (tier === 'grass_roots') return '🌱'
    if (tier === 'premier') return '⭐'
    if (tier === 'total_landscape') return '👑'
    return '✓'
  }

  const getTierDescription = (tier: string) => {
    if (tier === 'grass_roots') {
      return 'Essential lawn care with weekly mowing and basic fall cleanup'
    }
    if (tier === 'premier') {
      return 'Complete lawn care with mowing, full cleanup, aeration & fertilization'
    }
    if (tier === 'total_landscape') {
      return 'Premium package with everything + holiday lights installation'
    }
    return ''
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Package</h2>
        <p className="text-gray-600">
          Pricing calculated for {property.formattedAddress}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {tiers.map((tierData, index) => (
          <PricingTierCard
            key={tierData.tier}
            tier={tierData}
            icon={getTierIcon(tierData.tier)}
            description={getTierDescription(tierData.tier)}
            isPopular={index === 1}
            onSelect={() => onSelectTier(tierData.tier)}
          />
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Pricing Transparency</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Prices adjusted for your ZIP code region ({property.zipCode})</li>
          <li>✓ Property condition complexity factor applied (Score: {property.conditionScore}/5)</li>
          <li>✓ Distance from service center calculated</li>
          <li>✓ All prices are annual rates with monthly payment options</li>
        </ul>
      </div>
    </div>
  )
}

function PricingTierCard({
  tier,
  icon,
  description,
  isPopular,
  onSelect,
}: {
  tier: PricingTier
  icon: string
  description: string
  isPopular: boolean
  onSelect: () => void
}) {
  return (
    <div
      className={`bg-white rounded-lg shadow-lg overflow-hidden border-2 ${
        isPopular ? 'border-primary scale-105' : 'border-gray-200'
      } transition-all hover:shadow-xl`}
    >
      {isPopular && (
        <div className="bg-primary text-white text-center py-2 text-sm font-semibold">
          🔥 MOST POPULAR
        </div>
      )}

      <div className="p-6">
        <div className="text-4xl mb-3">{icon}</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.tierName}</h3>
        <p className="text-sm text-gray-600 mb-6 h-12">{description}</p>

        <div className="mb-6">
          <div className="text-4xl font-bold text-gray-900 mb-1">
            ${tier.annualPrice.toLocaleString()}
            <span className="text-lg font-normal text-gray-500">/year</span>
          </div>
          <div className="text-sm text-gray-600">
            or ${tier.monthlyPrice.toLocaleString()}/month
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="mb-6 space-y-2">
          {Object.entries(tier.breakdown).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className="font-semibold text-gray-900">${(value as number).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onSelect}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
            isPopular
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
        >
          Select {tier.tierName} →
        </button>
      </div>
    </div>
  )
}
