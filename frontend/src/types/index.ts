export interface Property {
  id?: string
  address: string
  formattedAddress?: string
  lat?: number
  lng?: number
  zipCode?: string
  city?: string
  state?: string
  lotSizeSqft?: number
  lawnSqft?: number
  bedSqft?: number
  drivewaySquft?: number
  walkwayLinearFt?: number
  rooflineFt?: number
  slopeGrade?: string
  conditionScore?: number
  grassHeight?: string
  bushCount?: number
  treeCoverage?: string
  debrisLevel?: string
  leafVolume?: string
  bedCondition?: string
  streetViewUrl?: string
  satelliteImageUrl?: string
}

export interface PricingTier {
  tier: string
  tierName: string
  annualPrice: number
  monthlyPrice: number
  breakdown: any
}

export interface Upsell {
  serviceCode: string
  serviceName: string
  description: string
  price: number
  recommended: boolean
}

export interface Quote {
  id?: string
  propertyId: string
  customerId?: string
  serviceType: string
  tier: string
  finalAnnualPrice: number
  finalMonthlyPrice: number
  recommendedUpsells?: Upsell[]
  selectedUpsells?: Upsell[]
  jobDescription?: string
  status?: string
}

export interface Customer {
  id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
}
