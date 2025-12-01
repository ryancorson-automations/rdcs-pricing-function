'use client'

import { useState } from 'react'
import Image from 'next/image'
import { pricingApi } from '@/lib/api'
import { Property, PricingTier } from '@/types'

interface PropertyPreviewProps {
  property: Property
  onContinue: (tiers: PricingTier[]) => void
}

export default function PropertyPreview({ property, onContinue }: PropertyPreviewProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculatePricing = async () => {
    if (!property.id) return

    setLoading(true)
    setError(null)

    try {
      const tiers = await pricingApi.calculate(property.id)
      onContinue(tiers)
    } catch (err: any) {
      setError('Failed to calculate pricing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getConditionBadge = (score?: number) => {
    if (!score) return { color: 'bg-gray-500', text: 'Unknown' }
    if (score === 1) return { color: 'bg-green-500', text: 'Excellent' }
    if (score === 2) return { color: 'bg-blue-500', text: 'Good' }
    if (score === 3) return { color: 'bg-yellow-500', text: 'Average' }
    if (score === 4) return { color: 'bg-orange-500', text: 'Needs Work' }
    return { color: 'bg-red-500', text: 'Poor' }
  }

  const conditionBadge = getConditionBadge(property.conditionScore)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <h2 className="text-2xl font-bold mb-1">Property Analysis Complete</h2>
          <p className="text-green-100">{property.formattedAddress}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Images */}
          <div className="space-y-4">
            {property.streetViewUrl && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Street View</p>
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={property.streetViewUrl}
                    alt="Street view"
                    width={640}
                    height={480}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {property.satelliteImageUrl && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Satellite View</p>
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={property.satelliteImageUrl}
                    alt="Satellite view"
                    width={640}
                    height={480}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="space-y-6">
            {/* Measurements */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Property Measurements</h3>
              <div className="space-y-2">
                <PropertyStat label="Lot Size" value={`${property.lotSizeSqft?.toLocaleString()} sq ft`} />
                <PropertyStat label="Lawn Area" value={`${property.lawnSqft?.toLocaleString()} sq ft`} />
                <PropertyStat label="Landscape Beds" value={`${property.bedSqft?.toLocaleString()} sq ft`} />
                <PropertyStat label="Roofline" value={`${property.rooflineFt?.toLocaleString()} ft`} />
              </div>
            </div>

            {/* AI Analysis */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Condition Analysis</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall Condition</span>
                  <span className={`${conditionBadge.color} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
                    {conditionBadge.text} ({property.conditionScore}/5)
                  </span>
                </div>

                <PropertyStat label="Grass Height" value={property.grassHeight || 'Normal'} />
                <PropertyStat label="Bushes/Shrubs" value={`${property.bushCount || 0} visible`} />
                <PropertyStat label="Tree Coverage" value={property.treeCoverage || 'Moderate'} />
                <PropertyStat label="Debris Level" value={property.debrisLevel || 'Minimal'} />
                <PropertyStat label="Bed Condition" value={property.bedCondition || 'Good'} />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleCalculatePricing}
              disabled={loading}
              className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Calculating Pricing...' : 'Continue to Pricing →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PropertyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900 capitalize">{value}</span>
    </div>
  )
}
