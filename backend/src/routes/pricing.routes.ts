import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { calculateAllTiers, calculatePricing } from '../services/pricingEngine';
import {
  generateUpsells,
  generateMaterialsList,
  generateJobDescription,
} from '../services/upsellEngine';
import { Property, ServiceType, TierType, Quote } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/pricing/calculate
 * Calculate pricing for all tiers
 */
router.post(
  '/calculate',
  [body('propertyId').isUUID().withMessage('Valid property ID required')],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { propertyId } = req.body;

    // Get property
    const { data: propertyData, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (error || !propertyData) {
      throw new AppError('Property not found', 404);
    }

    // Convert to Property type
    const property: Property = {
      id: propertyData.id,
      address: propertyData.address,
      formattedAddress: propertyData.formatted_address,
      lat: propertyData.lat,
      lng: propertyData.lng,
      zipCode: propertyData.zip_code,
      city: propertyData.city,
      state: propertyData.state,
      lotSizeSqft: propertyData.lot_size_sqft,
      lawnSqft: propertyData.lawn_sqft,
      bedSqft: propertyData.bed_sqft,
      drivewaySquft: propertyData.driveway_sqft,
      walkwayLinearFt: propertyData.walkway_linear_ft,
      rooflineFt: propertyData.roofline_ft,
      slopeGrade: propertyData.slope_grade,
      conditionScore: propertyData.condition_score,
      grassHeight: propertyData.grass_height,
      bushCount: propertyData.bush_count,
      treeCoverage: propertyData.tree_coverage,
      debrisLevel: propertyData.debris_level,
      leafVolume: propertyData.leaf_volume,
      bedCondition: propertyData.bed_condition,
    };

    // Calculate all tiers
    const tiers = await calculateAllTiers(property);

    logger.info('Pricing calculated:', {
      propertyId,
      tiersCount: tiers.length,
    });

    res.json({
      success: true,
      property,
      tiers,
    });
  })
);

/**
 * POST /api/pricing/quote
 * Generate complete quote with upsells and job description
 */
router.post(
  '/quote',
  [
    body('propertyId').isUUID().withMessage('Valid property ID required'),
    body('serviceType')
      .isIn(['mowing', 'cleanup', 'mulch', 'softscape', 'maintenance'])
      .withMessage('Valid service type required'),
    body('tier')
      .isIn(['grass_roots', 'premier', 'total_landscape'])
      .withMessage('Valid tier required'),
    body('customerId').optional().isUUID().withMessage('Valid customer ID required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const {
      propertyId,
      serviceType,
      tier,
      customerId,
    }: {
      propertyId: string;
      serviceType: ServiceType;
      tier: TierType;
      customerId?: string;
    } = req.body;

    // Get property
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propertyError || !propertyData) {
      throw new AppError('Property not found', 404);
    }

    const property: Property = {
      id: propertyData.id,
      address: propertyData.address,
      formattedAddress: propertyData.formatted_address,
      lat: propertyData.lat,
      lng: propertyData.lng,
      zipCode: propertyData.zip_code,
      city: propertyData.city,
      state: propertyData.state,
      lotSizeSqft: propertyData.lot_size_sqft,
      lawnSqft: propertyData.lawn_sqft,
      bedSqft: propertyData.bed_sqft,
      drivewaySquft: propertyData.driveway_sqft,
      walkwayLinearFt: propertyData.walkway_linear_ft,
      rooflineFt: propertyData.roofline_ft,
      slopeGrade: propertyData.slope_grade,
      conditionScore: propertyData.condition_score,
      grassHeight: propertyData.grass_height,
      bushCount: propertyData.bush_count,
      treeCoverage: propertyData.tree_coverage,
      debrisLevel: propertyData.debris_level,
      leafVolume: propertyData.leaf_volume,
      bedCondition: propertyData.bed_condition,
    };

    // Calculate pricing
    const pricing = await calculatePricing(property, serviceType, tier);

    // Generate upsells
    const upsells = await generateUpsells(property, serviceType, tier);

    // Generate materials list
    const materials = await generateMaterialsList(property, serviceType);

    // Generate job description
    const jobDescription = await generateJobDescription(
      property,
      serviceType,
      tier,
      upsells.filter((u) => u.recommended)
    );

    // Create quote in database
    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        property_id: propertyId,
        customer_id: customerId || null,
        service_type: serviceType,
        tier: tier,
        base_price: pricing.basePrice,
        complexity_multiplier: pricing.complexityMultiplier,
        regional_multiplier: pricing.regionalMultiplier,
        distance_miles: pricing.distanceMiles,
        final_annual_price: pricing.finalAnnualPrice,
        final_monthly_price: pricing.finalMonthlyPrice,
        recommended_upsells: upsells,
        materials_list: materials,
        job_description: jobDescription,
        status: 'draft',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .select()
      .single();

    if (quoteError) {
      logger.error('Failed to create quote:', quoteError);
      throw new AppError('Failed to create quote', 500);
    }

    const quote: Quote = {
      id: quoteData.id,
      propertyId: quoteData.property_id,
      customerId: quoteData.customer_id,
      serviceType: quoteData.service_type,
      tier: quoteData.tier,
      basePrice: parseFloat(quoteData.base_price),
      complexityMultiplier: parseFloat(quoteData.complexity_multiplier),
      regionalMultiplier: parseFloat(quoteData.regional_multiplier),
      distanceMiles: parseFloat(quoteData.distance_miles),
      finalAnnualPrice: parseFloat(quoteData.final_annual_price),
      finalMonthlyPrice: parseFloat(quoteData.final_monthly_price),
      recommendedUpsells: quoteData.recommended_upsells,
      selectedUpsells: quoteData.selected_upsells,
      materialsList: quoteData.materials_list,
      jobDescription: quoteData.job_description,
      status: quoteData.status,
    };

    logger.info('Quote created:', {
      quoteId: quote.id,
      propertyId,
      tier,
      annualPrice: quote.finalAnnualPrice,
    });

    res.json({
      success: true,
      quote,
      property,
      upsells,
    });
  })
);

/**
 * GET /api/pricing/rate-cards
 * Get all active rate cards
 */
router.get(
  '/rate-cards',
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('rate_cards')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true });

    if (error) {
      throw new AppError('Failed to fetch rate cards', 500);
    }

    res.json({
      success: true,
      rateCards: data,
    });
  })
);

/**
 * GET /api/pricing/quote/:id
 * Get quote by ID
 */
router.get(
  '/quote/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('quote_details')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new AppError('Quote not found', 404);
    }

    res.json({
      success: true,
      quote: data,
    });
  })
);

export default router;
