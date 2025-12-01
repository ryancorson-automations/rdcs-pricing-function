import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { Property, ServiceType, TierType, Upsell, MaterialItem } from '../types';
import { calculateMulchYardage } from './pricingEngine';

/**
 * Upsell Recommendation Engine
 *
 * Generates smart, contextual upsell recommendations based on:
 * - Property characteristics (bed size, bush count, lawn condition)
 * - Selected service type and tier
 * - Seasonal considerations
 * - Property condition from AI analysis
 */

/**
 * Generate upsell recommendations
 */
export async function generateUpsells(
  property: Property,
  serviceType: ServiceType,
  tier: TierType
): Promise<Upsell[]> {
  const upsells: Upsell[] = [];

  // Load all rate cards for upsell pricing
  const { data: rateCards } = await supabase
    .from('rate_cards')
    .select('*')
    .eq('active', true);

  if (!rateCards) {
    logger.warn('Failed to load rate cards for upsells');
    return [];
  }

  const rateCardMap = new Map(rateCards.map((rc) => [rc.service_code, rc]));

  // ========================================================================
  // RULE-BASED UPSELL RECOMMENDATIONS
  // ========================================================================

  // 1. EDGING - Recommend if beds exist and bed condition is not "good"
  if (
    property.bedSqft &&
    property.bedSqft > 0 &&
    property.bedCondition !== 'good'
  ) {
    const edgingCard = rateCardMap.get('EDGING');
    if (edgingCard) {
      // Estimate bed perimeter (assume beds are ~20% of total perimeter)
      const bedPerimeter = Math.sqrt(property.bedSqft!) * 4;
      const price = bedPerimeter * parseFloat(edgingCard.base_rate);

      upsells.push({
        serviceCode: 'EDGING',
        serviceName: 'Professional Bed Edging',
        description:
          'Create crisp, clean borders around landscape beds for a polished look',
        price: Math.round(price),
        recommended: true,
      });
    }
  }

  // 2. BUSH TRIMMING - Recommend if bush count > 5
  if (property.bushCount && property.bushCount > 5) {
    const bushCard = rateCardMap.get('BUSH_TRIMMING');
    if (bushCard) {
      const price = property.bushCount * parseFloat(bushCard.base_rate);

      upsells.push({
        serviceCode: 'BUSH_TRIMMING',
        serviceName: 'Seasonal Bush Trimming',
        description: `Professional shaping and trimming for ${property.bushCount} bushes/shrubs`,
        price: Math.round(price),
        recommended: property.bedCondition === 'overgrown',
      });
    }
  }

  // 3. MULCH INSTALLATION - Recommend if bed sqft > 200 and condition is not "good"
  if (
    property.bedSqft &&
    property.bedSqft > 200 &&
    property.bedCondition !== 'good'
  ) {
    const mulchCard = rateCardMap.get('MULCH_INSTALL');
    if (mulchCard) {
      const cubicYards = calculateMulchYardage(property.bedSqft);
      const price = cubicYards * parseFloat(mulchCard.base_rate);

      upsells.push({
        serviceCode: 'MULCH_INSTALL',
        serviceName: 'Fresh Mulch Installation',
        description: `${cubicYards} cubic yards of premium mulch to refresh landscape beds`,
        price: Math.round(price),
        recommended: property.bedCondition === 'overgrown',
      });
    }
  }

  // 4. BED MAINTENANCE - Recommend for Premier/Total Landscape tiers
  if (tier === 'premier' || tier === 'total_landscape') {
    const bedMaintenanceCard = rateCardMap.get('BED_MAINTENANCE');
    if (bedMaintenanceCard && property.bedSqft) {
      const bedUnits = property.bedSqft / 100; // Per 100 sqft
      const monthlyPrice =
        bedUnits * parseFloat(bedMaintenanceCard.base_rate);
      const annualPrice = monthlyPrice * 12;

      upsells.push({
        serviceCode: 'BED_MAINTENANCE',
        serviceName: 'Monthly Bed Maintenance',
        description:
          'Year-round weeding, mulch touch-ups, and bed care (12 visits/year)',
        price: Math.round(annualPrice),
        recommended: property.bedSqft > 500,
      });
    }
  }

  // 5. LEAF CLEANUP UPGRADE - Only for Grass Roots tier
  if (tier === 'grass_roots' && property.treeCoverage === 'heavy') {
    const leafCard = rateCardMap.get('LEAF_CLEANUP');
    if (leafCard && property.lawnSqft) {
      const upgradePrice =
        (property.lawnSqft / 1000) *
        parseFloat(leafCard.base_rate) *
        1.5; // 1.5x for heavy tree coverage

      upsells.push({
        serviceCode: 'LEAF_CLEANUP_UPGRADE',
        serviceName: 'Full Fall Cleanup Package',
        description:
          'Upgrade to 2 complete fall cleanups (recommended for heavy tree coverage)',
        price: Math.round(upgradePrice),
        recommended: true,
      });
    }
  }

  // 6. SEASONAL PACKAGE - Only for Grass Roots tier
  if (tier === 'grass_roots') {
    const seasonalCard = rateCardMap.get('SEASONAL_PACKAGE');
    if (seasonalCard) {
      upsells.push({
        serviceCode: 'SEASONAL_PACKAGE',
        serviceName: 'Seasonal Care Package',
        description:
          'Add lawn aeration (1x) and fertilization (4x) for a healthier lawn',
        price: Math.round(parseFloat(seasonalCard.base_rate)),
        recommended: property.grassHeight === 'overgrown',
      });
    }
  }

  // 7. CHRISTMAS LIGHTS - For Grass Roots and Premier tiers
  if (tier !== 'total_landscape' && property.rooflineFt) {
    const lightsCard = rateCardMap.get('LIGHTS_INSTALL');
    if (lightsCard) {
      const price =
        property.rooflineFt * parseFloat(lightsCard.base_rate);

      upsells.push({
        serviceCode: 'LIGHTS_INSTALL',
        serviceName: 'Holiday Lights Installation',
        description: `Professional installation and removal of Christmas lights (${property.rooflineFt}ft roofline)`,
        price: Math.round(price),
        recommended: false,
      });
    }
  }

  logger.info('Generated upsell recommendations:', {
    propertyId: property.id,
    serviceType,
    tier,
    upsellCount: upsells.length,
    recommendedCount: upsells.filter((u) => u.recommended).length,
  });

  return upsells;
}

/**
 * Generate materials list for a service
 */
export async function generateMaterialsList(
  property: Property,
  serviceType: ServiceType,
  selectedUpsells: string[] = []
): Promise<MaterialItem[]> {
  const materials: MaterialItem[] = [];

  // Base materials for mowing service
  if (serviceType === 'mowing') {
    materials.push(
      { item: 'Premium Gasoline', quantity: 5, unit: 'gallons' },
      { item: 'Trimmer Line', quantity: 1, unit: 'spool' },
      { item: 'Mower Blades (replacement)', quantity: 2, unit: 'blades' }
    );
  }

  // Cleanup service materials
  if (serviceType === 'cleanup') {
    const leafBags = Math.ceil((property.lawnSqft || 5000) / 1000);
    materials.push(
      { item: 'Heavy-duty Leaf Bags', quantity: leafBags * 10, unit: 'bags' },
      { item: 'Debris Tarps', quantity: 2, unit: 'tarps' }
    );
  }

  // Mulch materials
  if (
    serviceType === 'mulch' ||
    selectedUpsells.includes('MULCH_INSTALL')
  ) {
    const cubicYards = calculateMulchYardage(property.bedSqft || 500);
    materials.push(
      {
        item: 'Premium Hardwood Mulch',
        quantity: cubicYards,
        unit: 'cubic yards',
      },
      { item: 'Landscape Fabric (optional)', quantity: 1, unit: 'roll' },
      { item: 'Bed Edging Material', quantity: 50, unit: 'linear feet' }
    );
  }

  // Bush trimming materials
  if (selectedUpsells.includes('BUSH_TRIMMING')) {
    materials.push({ item: 'Hedge Trimmer Fuel Mix', quantity: 2, unit: 'quarts' });
  }

  // Seasonal package materials
  if (selectedUpsells.includes('SEASONAL_PACKAGE')) {
    materials.push(
      { item: 'Lawn Fertilizer (22-0-10)', quantity: 4, unit: 'bags' },
      { item: 'Core Aeration (equipment rental)', quantity: 1, unit: 'day' }
    );
  }

  // Christmas lights materials
  if (selectedUpsells.includes('LIGHTS_INSTALL')) {
    const rooflineFt = property.rooflineFt || 100;
    materials.push(
      {
        item: 'LED Christmas Lights',
        quantity: Math.ceil(rooflineFt / 25),
        unit: 'strands (25ft)',
      },
      { item: 'Light Clips', quantity: rooflineFt, unit: 'clips' },
      { item: 'Extension Cords', quantity: 3, unit: 'cords' },
      { item: 'Outdoor Timers', quantity: 2, unit: 'timers' }
    );
  }

  logger.info('Generated materials list:', {
    propertyId: property.id,
    serviceType,
    materialsCount: materials.length,
  });

  return materials;
}

/**
 * Generate AI-powered job description
 */
export async function generateJobDescription(
  property: Property,
  serviceType: ServiceType,
  tier: TierType,
  selectedUpsells: Upsell[] = []
): Promise<string> {
  const tierNames = {
    grass_roots: 'Grass Roots',
    premier: 'Premier Lawn',
    total_landscape: 'Total Landscape',
  };

  const serviceDescriptions = {
    mowing: 'Weekly lawn mowing and trimming',
    cleanup: 'Seasonal property cleanup',
    mulch: 'Fresh mulch installation',
    softscape: 'Softscape installation and planting',
    maintenance: 'Ongoing landscape maintenance',
  };

  let description = `${tierNames[tier]} Package - ${serviceDescriptions[serviceType]}\n\n`;

  description += `Property Details:\n`;
  description += `- Address: ${property.formattedAddress}\n`;
  description += `- Lawn Area: ${property.lawnSqft?.toLocaleString()} sq ft\n`;
  if (property.bedSqft) {
    description += `- Landscape Beds: ${property.bedSqft.toLocaleString()} sq ft\n`;
  }
  if (property.bushCount) {
    description += `- Bushes/Shrubs: ${property.bushCount}\n`;
  }

  description += `\nServices Included:\n`;

  // Add tier-specific services
  if (tier === 'grass_roots') {
    description += `- 30 weekly mowing visits (April - October)\n`;
    description += `- Basic fall leaf cleanup (1 visit)\n`;
  } else if (tier === 'premier') {
    description += `- 30 weekly mowing visits (April - October)\n`;
    description += `- Full fall leaf cleanup (2 visits)\n`;
    description += `- Seasonal care package (aeration + fertilization)\n`;
  } else if (tier === 'total_landscape') {
    description += `- 30 weekly mowing visits (April - October)\n`;
    description += `- Full fall leaf cleanup (2 visits)\n`;
    description += `- Seasonal care package (aeration + fertilization)\n`;
    description += `- Holiday lights installation and removal\n`;
  }

  // Add selected upsells
  if (selectedUpsells.length > 0) {
    description += `\nAdditional Services:\n`;
    selectedUpsells.forEach((upsell) => {
      description += `- ${upsell.serviceName}\n`;
    });
  }

  // Add property condition notes
  if (property.conditionScore && property.conditionScore >= 4) {
    description += `\nNote: Property requires additional care due to current condition. Pricing reflects extra effort needed.\n`;
  }

  return description;
}
