// ============================================================================
// PROPERTY TYPES
// ============================================================================

export interface PropertyAddress {
  address: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  zipCode?: string;
  city?: string;
  state?: string;
}

export interface PropertyMeasurements {
  lotSizeSqft?: number;
  lawnSqft?: number;
  bedSqft?: number;
  drivewaySquft?: number;
  walkwayLinearFt?: number;
  rooflineFt?: number;
  slopeGrade?: 'flat' | 'moderate' | 'steep';
}

export interface PropertyCondition {
  conditionScore?: number; // 1-5
  grassHeight?: 'normal' | 'overgrown' | 'very_overgrown';
  bushCount?: number;
  treeCoverage?: 'light' | 'moderate' | 'heavy';
  debrisLevel?: 'minimal' | 'moderate' | 'heavy';
  leafVolume?: 'minimal' | 'moderate' | 'heavy';
  bedCondition?: 'good' | 'needs_work' | 'overgrown';
}

export interface Property extends PropertyAddress, PropertyMeasurements, PropertyCondition {
  id?: string;
  propertyType?: string;
  streetViewUrl?: string;
  satelliteImageUrl?: string;
  analysisData?: any;
  parcelData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// PRICING TYPES
// ============================================================================

export type ServiceType = 'mowing' | 'cleanup' | 'mulch' | 'softscape' | 'maintenance';
export type TierType = 'grass_roots' | 'premier' | 'total_landscape';

export interface RateCard {
  id?: string;
  serviceCode: string;
  serviceName: string;
  category?: string;
  unitMeasure: string;
  baseRate: number;
  factor: number;
  notes?: string;
  active?: boolean;
}

export interface RegionalAdjustment {
  zipCode: string;
  multiplier: number;
  areaName?: string;
}

export interface PricingCalculation {
  basePrice: number;
  complexityMultiplier: number;
  regionalMultiplier: number;
  distanceMiles?: number;
  finalAnnualPrice: number;
  finalMonthlyPrice: number;
}

export interface Upsell {
  serviceCode: string;
  serviceName: string;
  description: string;
  price: number;
  recommended: boolean;
}

export interface MaterialItem {
  item: string;
  quantity: number;
  unit: string;
}

export interface Quote extends PricingCalculation {
  id?: string;
  propertyId: string;
  customerId?: string;
  serviceType: ServiceType;
  tier: TierType;
  recommendedUpsells?: Upsell[];
  selectedUpsells?: Upsell[];
  totalUpsellsPrice?: number;
  materialsList?: MaterialItem[];
  estimatedLaborHours?: number;
  crewSize?: number;
  jobDescription?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil?: Date;
  jobberQuoteId?: string;
  jobberQuoteNumber?: string;
  jobberSentAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// CUSTOMER TYPES
// ============================================================================

export interface Customer {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobberClientId?: string;
  jobberSyncedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// JOBBER TYPES
// ============================================================================

export interface JobberClient {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
}

export interface JobberQuote {
  clientId: string;
  lineItems: JobberLineItem[];
  description?: string;
  validFor?: number; // days
}

export interface JobberLineItem {
  name: string;
  description?: string;
  unitCost: number;
  quantity: number;
  unit?: string;
}

export interface JobberSyncLog {
  id?: string;
  quoteId?: string;
  customerId?: string;
  action: 'create_client' | 'create_quote' | 'send_quote' | 'update_quote';
  status: 'success' | 'failed' | 'pending' | 'retry';
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
  jobberClientId?: string;
  jobberQuoteId?: string;
  createdAt?: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface PropertyLookupRequest {
  address: string;
  analyzeCondition?: boolean;
}

export interface PropertyLookupResponse {
  property: Property;
  success: boolean;
  message?: string;
}

export interface PricingRequest {
  propertyId: string;
  serviceType: ServiceType;
  tier?: TierType;
}

export interface PricingResponse {
  quote: Quote;
  tiers: Array<{
    tier: TierType;
    annualPrice: number;
    monthlyPrice: number;
  }>;
  success: boolean;
}

export interface JobberCreateClientRequest {
  customer: Customer;
  property: Property;
}

export interface JobberCreateQuoteRequest {
  quoteId: string;
  sendImmediately?: boolean;
}
