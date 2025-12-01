'use client'

import { useState } from 'react'
import AddressInput from '@/components/AddressInput'
import PropertyPreview from '@/components/PropertyPreview'
import PricingDisplay from '@/components/PricingDisplay'
import QuoteForm from '@/components/QuoteForm'
import { Property, PricingTier } from '@/types'

export default function Home() {
  const [step, setStep] = useState<'address' | 'property' | 'pricing' | 'quote'>('address')
  const [property, setProperty] = useState<Property | null>(null)
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const handlePropertyLookup = (propertyData: Property) => {
    setProperty(propertyData)
    setStep('property')
  }

  const handleContinueToPricing = (pricingData: PricingTier[]) => {
    setTiers(pricingData)
    setStep('pricing')
  }

  const handleSelectTier = (tier: string) => {
    setSelectedTier(tier)
    setStep('quote')
  }

  const handleReset = () => {
    setStep('address')
    setProperty(null)
    setTiers([])
    setSelectedTier(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                RDC&apos;s Landscape & Lawn
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Instant AI-Powered Pricing Platform
              </p>
            </div>
            {step !== 'address' && (
              <button
                onClick={handleReset}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                ← Start New Quote
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center space-x-4">
          <StepIndicator active={step === 'address'} completed={step !== 'address'} label="1. Address" />
          <div className="h-px w-12 bg-gray-300" />
          <StepIndicator active={step === 'property'} completed={['pricing', 'quote'].includes(step)} label="2. Property" />
          <div className="h-px w-12 bg-gray-300" />
          <StepIndicator active={step === 'pricing'} completed={step === 'quote'} label="3. Pricing" />
          <div className="h-px w-12 bg-gray-300" />
          <StepIndicator active={step === 'quote'} completed={false} label="4. Quote" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'address' && (
          <AddressInput onPropertyLookup={handlePropertyLookup} />
        )}

        {step === 'property' && property && (
          <PropertyPreview
            property={property}
            onContinue={handleContinueToPricing}
          />
        )}

        {step === 'pricing' && property && tiers.length > 0 && (
          <PricingDisplay
            property={property}
            tiers={tiers}
            onSelectTier={handleSelectTier}
          />
        )}

        {step === 'quote' && property && selectedTier && (
          <QuoteForm
            property={property}
            selectedTier={selectedTier}
            onComplete={handleReset}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-gray-600">
            © 2024 RDC&apos;s Landscape and Lawn. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}

function StepIndicator({ active, completed, label }: { active: boolean; completed: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
          completed
            ? 'bg-green-500 text-white'
            : active
            ? 'bg-primary text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {completed ? '✓' : label.split('.')[0]}
      </div>
      <span className={`text-xs mt-2 ${active ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
        {label.split('.')[1]}
      </span>
    </div>
  )
}
