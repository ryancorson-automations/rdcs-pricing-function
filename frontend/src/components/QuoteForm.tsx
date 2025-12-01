'use client'

import { useState, useEffect } from 'react'
import { pricingApi, jobberApi } from '@/lib/api'
import { Property, Quote, Upsell, Customer } from '@/types'

interface QuoteFormProps {
  property: Property
  selectedTier: string
  onComplete: () => void
}

export default function QuoteForm({ property, selectedTier, onComplete }: QuoteFormProps) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [upsells, setUpsells] = useState<Upsell[]>([])
  const [selectedUpsells, setSelectedUpsells] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [customer, setCustomer] = useState<Customer>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    loadQuote()
  }, [])

  const loadQuote = async () => {
    if (!property.id) return

    try {
      const data = await pricingApi.createQuote(
        property.id,
        'mowing', // Default service type
        selectedTier
      )
      setQuote(data.quote)
      setUpsells(data.upsells)

      // Pre-select recommended upsells
      const recommended = data.upsells
        .filter((u) => u.recommended)
        .map((u) => u.serviceCode)
      setSelectedUpsells(recommended)
    } catch (err) {
      setError('Failed to generate quote')
    } finally {
      setLoading(false)
    }
  }

  const toggleUpsell = (serviceCode: string) => {
    setSelectedUpsells((prev) =>
      prev.includes(serviceCode)
        ? prev.filter((code) => code !== serviceCode)
        : [...prev, serviceCode]
    )
  }

  const calculateTotal = () => {
    if (!quote) return 0
    const basePrice = quote.finalAnnualPrice
    const upsellsTotal = upsells
      .filter((u) => selectedUpsells.includes(u.serviceCode))
      .reduce((sum, u) => sum + u.price, 0)
    return basePrice + upsellsTotal
  }

  const handleSendQuote = async () => {
    if (!quote || !property.id) return

    // Validation
    if (!customer.firstName || !customer.lastName || !customer.email) {
      setError('Please fill in all required customer fields')
      return
    }

    setSending(true)
    setError(null)

    try {
      // Step 1: Create customer and link to property
      const createdCustomer = await jobberApi.createClient(customer, property.id)

      // Step 2: Update quote with customer and selected upsells
      // (In production, you'd want an update quote endpoint)

      // Step 3: Send quote via Jobber
      await jobberApi.createAndSendQuote(quote.id!, 'email')

      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send quote')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Generating quote...</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Quote Sent Successfully!</h2>
          <p className="text-gray-600 mb-6">
            The quote has been sent to <strong>{customer.email}</strong> and created in Jobber.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            The customer will receive an email with the full quote details and can accept it directly through Jobber.
          </p>
          <button
            onClick={onComplete}
            className="bg-primary text-white py-3 px-8 rounded-lg font-semibold hover:bg-primary/90"
          >
            Create Another Quote
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <h2 className="text-2xl font-bold mb-1">Finalize Quote</h2>
          <p className="text-green-100">{property.formattedAddress}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={customer.firstName}
                  onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={customer.lastName}
                  onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Quote Summary & Upsells */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Summary</h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Base Package</span>
                <span className="text-sm font-semibold">
                  ${quote?.finalAnnualPrice.toLocaleString()}/year
                </span>
              </div>
              <div className="text-xs text-gray-500 capitalize">{selectedTier.replace('_', ' ')} Tier</div>
            </div>

            {upsells.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Recommended Add-ons
                </h4>
                <div className="space-y-2">
                  {upsells.map((upsell) => (
                    <label
                      key={upsell.serviceCode}
                      className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUpsells.includes(upsell.serviceCode)}
                        onChange={() => toggleUpsell(upsell.serviceCode)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {upsell.serviceName}
                              {upsell.recommended && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                  Recommended
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{upsell.description}</p>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 ml-2">
                            +${upsell.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-primary/10 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total Annual</span>
                <span className="text-2xl font-bold text-primary">
                  ${calculateTotal().toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-gray-600 text-right mt-1">
                or ${Math.round(calculateTotal() / 12).toLocaleString()}/month
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSendQuote}
              disabled={sending}
              className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending Quote...' : 'Send Quote to Customer →'}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Quote will be sent via email and created in Jobber
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
