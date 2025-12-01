import axios from 'axios'
import { Property, PricingTier, Quote, Customer, Upsell } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const propertyApi = {
  lookup: async (address: string, analyzeCondition = true): Promise<Property> => {
    const { data } = await api.post('/property/lookup', {
      address,
      analyzeCondition,
    })
    return data.property
  },

  get: async (id: string): Promise<Property> => {
    const { data } = await api.get(`/property/${id}`)
    return data.property
  },

  analyze: async (id: string) => {
    const { data } = await api.post(`/property/${id}/analyze`)
    return data.condition
  },
}

export const pricingApi = {
  calculate: async (propertyId: string): Promise<PricingTier[]> => {
    const { data } = await api.post('/pricing/calculate', { propertyId })
    return data.tiers
  },

  createQuote: async (
    propertyId: string,
    serviceType: string,
    tier: string,
    customerId?: string
  ): Promise<{ quote: Quote; upsells: Upsell[] }> => {
    const { data } = await api.post('/pricing/quote', {
      propertyId,
      serviceType,
      tier,
      customerId,
    })
    return { quote: data.quote, upsells: data.upsells }
  },

  getQuote: async (id: string): Promise<Quote> => {
    const { data } = await api.get(`/pricing/quote/${id}`)
    return data.quote
  },
}

export const jobberApi = {
  createClient: async (
    customer: Customer,
    propertyId: string
  ): Promise<Customer> => {
    const { data } = await api.post('/jobber/create-client', {
      ...customer,
      propertyId,
    })
    return data.customer
  },

  createAndSendQuote: async (
    quoteId: string,
    sendMethod: 'email' | 'sms' = 'email'
  ): Promise<any> => {
    const { data } = await api.post('/jobber/create-quote', {
      quoteId,
      sendMethod,
    })
    return data
  },

  getSyncStatus: async (quoteId: string): Promise<any[]> => {
    const { data } = await api.get(`/jobber/sync-status/${quoteId}`)
    return data.syncLogs
  },
}

export default api
