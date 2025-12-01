import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import {
  Property,
  RateCard,
  RegionalAdjustment,
  ServiceType,
  TierType,
  PricingCalculation,
} from '../types';
import { AppError } from '../middleware/errorHandler';
import { conditionScoreToMultiplier } from './aiVision';
import { calculateDistanceFromServiceCenter } from './propertyLookup';

/**
 * Pricing Engine Service
 *
 * Calculates accurate pricing based on:
 * - Property measurements (lawn sqft, bed sqft, etc.)
 * - Service type and tier
 * - Complexity multiplier (from AI analysis)
 * - Regional ZIP code adjustments
 * - Distance from service area center
 */

/**
 * Load rate cards from database
 */
async function loadRateCards(): Promise<RateCard[]> {
  const { data, error } = await supabase
    .from('rate_cards')
    .select('*')
    .eq('active', true);

  if (error) {
    logger.error('Failed to load rate cards:', error);
    throw new AppError('Failed to load pricing data', 500);
  }

  return data.map((row) => ({
    id: row.id,
    serviceCode: row.service_code,
    serviceName: row.service_name,
    category: row.category,
    unitMeasure: row.unit_measure,
    baseRate: parseFloat(row.base_rate),
    factor: row.factor,
    notes: row.notes,
    active: row.active,
  }));
}

/**
 * Get regional adjustment multiplier for ZIP code
 */
async function getRegionalMultiplier(zipCode?: string): Promise<number> {
  if (!zipCode) {
    return parseFloat(process.env.DEFAULT_REGIONAL_MULTIPLIER || '1.0');
  }

  const { data, error } = await supabase
    .from('regional_adjustments')
    .select('*')
    .eq('zip_code', zipCode)
    .eq('active', true)
    .single();

  if (error || !data) {
    logger.warn(`No regional adjustment found for ZIP ${zipCode}, using default`);
    return parseFloat(process.env.DEFAULT_REGIONAL_MULTIPLIER || '1.0');
  }

  return parseFloat(data.multiplier);
}

/**
 * Calculate distance-based pricing adjustment
 * Properties farther from service center may have higher costs
 */
function calculateDistanceMultiplier(distanceMiles: number): number {
  const maxDistance = parseFloat(process.env.SERVICE_AREA_RADIUS_MILES || '25');

  if (distanceMiles <= 10) {
    return 1.0; // No adjustment for close properties
  } else if (distanceMiles <= 20) {
    return 1.05; // 5% increase for medium distance
  } else if (distanceMiles <= maxDistance) {
    return 1.1; // 10% increase for edge of service area
  } else {
    return 1.2; // 20% increase for outside normal service area
  }
}

/**
 * Calculate annual mowing cost
 */
function calculateMowingCost(
  lawnSqft: number,
  rateCard: RateCard,
  multiplier: number
): number {
  // MOWING_BASE: $4.50 per 1000 sqft * 30 visits * multiplier
  const baseRate = rateCard.baseRate;
  const visits = rateCard.factor; // 30 weekly visits
  const cost = (lawnSqft / 1000) * baseRate * visits * multiplier;
  return Math.round(cost * 100) / 100;
}

/**
 * Calculate leaf cleanup cost
 */
function calculateLeafCleanupCost(
  lawnSqft: number,
  rateCard: RateCard,
  multiplier: number,
  fullCleanup: boolean = false
): number {
  // LEAF_CLEANUP: $6.00 per 1000 sqft * 2 cleanups * multiplier
  const baseRate = rateCard.baseRate;
  const cleanups = fullCleanup ? rateCard.factor : 1; // Full = 2, Basic = 1
  const cost = (lawnSqft / 1000) * baseRate * cleanups * multiplier;
  return Math.round(cost * 100) / 100;
}

/**
 * Calculate seasonal package cost (flat rate)
 */
function calculateSeasonalPackageCost(rateCard: RateCard, multiplier: number): number {
  // SEASONAL_PACKAGE: $650 flat rate * multiplier
  const cost = rateCard.baseRate * multiplier;
  return Math.round(cost * 100) / 100;
}

/**
 * Calculate Christmas lights installation cost
 */
function calculateLightsCost(
  rooflineFt: number,
  rateCard: RateCard,
  multiplier: number
): number {
  // LIGHTS_INSTALL: $3.00 per linear foot * multiplier
  const baseRate = rateCard.baseRate;
  const cost = rooflineFt * baseRate * multiplier;
  return Math.round(cost * 100) / 100;
}

/**
 * Calculate mulch installation cost
 */
function calculateMulchCost(
  bedSqft: number,
  rateCard: RateCard,
  multiplier: number
): number {
  // MULCH_INSTALL: $95 per cubic yard
  // 1 cubic yard covers ~100 sqft at 3" depth
  const cubicYards = bedSqft / 100;
  const cost = cubicYards * rateCard.baseRate * multiplier;
  return Math.round(cost * 100) / 100;
}

/**
 * Calculate pricing for all three tiers
 */
export async function calculateAllTiers(
  property: Property
): Promise<
  Array<{
    tier: TierType;
    tierName: string;
    annualPrice: number;
    monthlyPrice: number;
    breakdown: any;
  }>
> {
  const rateCards = await loadRateCards();
  const rateCardMap = new Map(rateCards.map((rc) => [rc.serviceCode, rc]));

  // Get multipliers
  const regionalMultiplier = await getRegionalMultiplier(property.zipCode);
  const complexityMultiplier = conditionScoreToMultiplier(
    property.conditionScore || 3
  );
  const distanceMiles = calculateDistanceFromServiceCenter(
    property.lat!,
    property.lng!
  );
  const distanceMultiplier = calculateDistanceMultiplier(distanceMiles);

  // Combined multiplier
  const totalMultiplier = regionalMultiplier * complexityMultiplier * distanceMultiplier;

  const lawnSqft = property.lawnSqft || 0;
  const rooflineFt = property.rooflineFt || 0;

  // Get rate cards
  const mowingCard = rateCardMap.get('MOWING_BASE')!;
  const leafCard = rateCardMap.get('LEAF_CLEANUP')!;
  const seasonalCard = rateCardMap.get('SEASONAL_PACKAGE')!;
  const lightsCard = rateCardMap.get('LIGHTS_INSTALL')!;

  // ========================================================================
  // TIER 1: Grass Roots
  // Mowing + 25% of Full Leaf Cleanup (basic fall cleanup)
  // ========================================================================
  const mowingCost = calculateMowingCost(lawnSqft, mowingCard, totalMultiplier);
  const fullLeafCost = calculateLeafCleanupCost(lawnSqft, leafCard, totalMultiplier, true);
  const basicLeafCost = fullLeafCost * 0.25;

  const tier1Annual = mowingCost + basicLeafCost;

  // ========================================================================
  // TIER 2: Premier Lawn
  // Mowing + Full Leaf Cleanup + Seasonal Package
  // ========================================================================
  const seasonalCost = calculateSeasonalPackageCost(seasonalCard, totalMultiplier);
  const tier2Annual = mowingCost + fullLeafCost + seasonalCost;

  // ========================================================================
  // TIER 3: Total Landscape
  // Tier 2 + Lights, then apply 15% markup
  // ========================================================================
  const lightsCost = calculateLightsCost(rooflineFt, lightsCard, totalMultiplier);
  const tier3Base = tier2Annual + lightsCost;
  const tier3Annual = tier3Base * 1.15; // 15% premium package markup

  logger.info('Calculated pricing for all tiers:', {
    propertyId: property.id,
    lawnSqft,
    multipliers: {
      regional: regionalMultiplier,
      complexity: complexityMultiplier,
      distance: distanceMultiplier,
      total: totalMultiplier,
    },
    tier1Annual,
    tier2Annual,
    tier3Annual,
  });

  return [
    {
      tier: 'grass_roots',
      tierName: 'Grass Roots',
      annualPrice: Math.round(tier1Annual),
      monthlyPrice: Math.round(tier1Annual / 12),
      breakdown: {
        mowing: Math.round(mowingCost),
        leafCleanup: Math.round(basicLeafCost),
      },
    },
    {
      tier: 'premier',
      tierName: 'Premier Lawn',
      annualPrice: Math.round(tier2Annual),
      monthlyPrice: Math.round(tier2Annual / 12),
      breakdown: {
        mowing: Math.round(mowingCost),
        leafCleanup: Math.round(fullLeafCost),
        seasonal: Math.round(seasonalCost),
      },
    },
    {
      tier: 'total_landscape',
      tierName: 'Total Landscape',
      annualPrice: Math.round(tier3Annual),
      monthlyPrice: Math.round(tier3Annual / 12),
      breakdown: {
        mowing: Math.round(mowingCost),
        leafCleanup: Math.round(fullLeafCost),
        seasonal: Math.round(seasonalCost),
        lights: Math.round(lightsCost),
        premiumMarkup: Math.round(tier3Base * 0.15),
      },
    },
  ];
}

/**
 * Calculate pricing for specific service and tier
 */
export async function calculatePricing(
  property: Property,
  serviceType: ServiceType,
  tier?: TierType
): Promise<PricingCalculation> {
  const allTiers = await calculateAllTiers(property);

  // If tier specified, return that tier
  if (tier) {
    const selectedTier = allTiers.find((t) => t.tier === tier);
    if (!selectedTier) {
      throw new AppError('Invalid tier specified', 400);
    }

    const distanceMiles = calculateDistanceFromServiceCenter(
      property.lat!,
      property.lng!
    );

    return {
      basePrice: selectedTier.annualPrice,
      complexityMultiplier: conditionScoreToMultiplier(property.conditionScore || 3),
      regionalMultiplier: await getRegionalMultiplier(property.zipCode),
      distanceMiles,
      finalAnnualPrice: selectedTier.annualPrice,
      finalMonthlyPrice: selectedTier.monthlyPrice,
    };
  }

  // Default to Tier 2 (Premier Lawn)
  const premierTier = allTiers.find((t) => t.tier === 'premier')!;
  const distanceMiles = calculateDistanceFromServiceCenter(property.lat!, property.lng!);

  return {
    basePrice: premierTier.annualPrice,
    complexityMultiplier: conditionScoreToMultiplier(property.conditionScore || 3),
    regionalMultiplier: await getRegionalMultiplier(property.zipCode),
    distanceMiles,
    finalAnnualPrice: premierTier.annualPrice,
    finalMonthlyPrice: premierTier.monthlyPrice,
  };
}

/**
 * Calculate mulch yardage needed
 */
export function calculateMulchYardage(bedSqft: number, depthInches: number = 3): number {
  // Formula: (sqft * depth in inches) / 324 = cubic yards
  const cubicYards = (bedSqft * depthInches) / 324;
  return Math.ceil(cubicYards * 2) / 2; // Round to nearest 0.5 yards
}

/**
 * Estimate labor hours for a service
 */
export function estimateLaborHours(
  serviceType: ServiceType,
  lawnSqft: number,
  complexityScore: number
): number {
  const baseHours: { [key in ServiceType]: number } = {
    mowing: lawnSqft / 5000, // 1 hour per 5000 sqft base
    cleanup: lawnSqft / 2000, // 1 hour per 2000 sqft
    mulch: lawnSqft / 1000, // 1 hour per 1000 sqft (bed areas)
    softscape: lawnSqft / 500, // 1 hour per 500 sqft
    maintenance: lawnSqft / 3000, // 1 hour per 3000 sqft
  };

  const base = baseHours[serviceType] || 2;
  const complexityFactor = complexityScore / 3; // Score 3 = 1.0x
  const hours = base * complexityFactor;

  return Math.ceil(hours * 2) / 2; // Round to nearest 0.5 hours
}

/**
 * Determine crew size based on service and property size
 */
export function determineCrewSize(serviceType: ServiceType, lawnSqft: number): number {
  if (lawnSqft < 5000) {
    return 2; // Small property, 2-person crew
  } else if (lawnSqft < 15000) {
    return 3; // Medium property, 3-person crew
  } else {
    return 4; // Large property, 4-person crew
  }
}
