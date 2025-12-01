import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { lookupProperty } from '../services/propertyLookup';
import { analyzePropertyCondition } from '../services/aiVision';
import { Property } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/property/lookup
 * Lookup property by address, get measurements and optional AI analysis
 */
router.post(
  '/lookup',
  [
    body('address').isString().notEmpty().withMessage('Address is required'),
    body('analyzeCondition')
      .optional()
      .isBoolean()
      .withMessage('analyzeCondition must be boolean'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { address, analyzeCondition = true } = req.body;

    logger.info('Property lookup requested:', { address, analyzeCondition });

    // Step 1: Lookup property (geocode + measurements)
    const property = await lookupProperty(address);

    // Step 2: AI condition analysis (if requested)
    if (analyzeCondition && property.streetViewUrl) {
      try {
        const condition = await analyzePropertyCondition(property.streetViewUrl);
        Object.assign(property, condition);
      } catch (error) {
        logger.warn('AI analysis failed, using defaults:', error);
      }
    }

    // Step 3: Save to database
    const { data, error } = await supabase
      .from('properties')
      .insert({
        address: property.address,
        formatted_address: property.formattedAddress,
        lat: property.lat,
        lng: property.lng,
        zip_code: property.zipCode,
        city: property.city,
        state: property.state,
        lot_size_sqft: property.lotSizeSqft,
        lawn_sqft: property.lawnSqft,
        bed_sqft: property.bedSqft,
        driveway_sqft: property.drivewaySquft,
        walkway_linear_ft: property.walkwayLinearFt,
        roofline_ft: property.rooflineFt,
        slope_grade: property.slopeGrade,
        property_type: property.propertyType,
        condition_score: property.conditionScore,
        grass_height: property.grassHeight,
        bush_count: property.bushCount,
        tree_coverage: property.treeCoverage,
        debris_level: property.debrisLevel,
        leaf_volume: property.leafVolume,
        bed_condition: property.bedCondition,
        street_view_url: property.streetViewUrl,
        satellite_image_url: property.satelliteImageUrl,
        parcel_data: property.parcelData,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to save property:', error);
      throw new AppError('Failed to save property data', 500);
    }

    property.id = data.id;

    logger.info('Property lookup completed:', {
      propertyId: property.id,
      address: property.formattedAddress,
    });

    res.json({
      success: true,
      property,
    });
  })
);

/**
 * GET /api/property/:id
 * Get property by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new AppError('Property not found', 404);
    }

    // Convert snake_case to camelCase
    const property: Property = {
      id: data.id,
      address: data.address,
      formattedAddress: data.formatted_address,
      lat: data.lat,
      lng: data.lng,
      zipCode: data.zip_code,
      city: data.city,
      state: data.state,
      lotSizeSqft: data.lot_size_sqft,
      lawnSqft: data.lawn_sqft,
      bedSqft: data.bed_sqft,
      drivewaySquft: data.driveway_sqft,
      walkwayLinearFt: data.walkway_linear_ft,
      rooflineFt: data.roofline_ft,
      slopeGrade: data.slope_grade,
      propertyType: data.property_type,
      conditionScore: data.condition_score,
      grassHeight: data.grass_height,
      bushCount: data.bush_count,
      treeCoverage: data.tree_coverage,
      debrisLevel: data.debris_level,
      leafVolume: data.leaf_volume,
      bedCondition: data.bed_condition,
      streetViewUrl: data.street_view_url,
      satelliteImageUrl: data.satellite_image_url,
      parcelData: data.parcel_data,
    };

    res.json({
      success: true,
      property,
    });
  })
);

/**
 * POST /api/property/:id/analyze
 * Run AI analysis on existing property
 */
router.post(
  '/:id/analyze',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get property
    const { data: propertyData, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !propertyData) {
      throw new AppError('Property not found', 404);
    }

    if (!propertyData.street_view_url) {
      throw new AppError('No street view image available for analysis', 400);
    }

    // Run AI analysis
    const condition = await analyzePropertyCondition(propertyData.street_view_url);

    // Update property
    const { data, error } = await supabase
      .from('properties')
      .update({
        condition_score: condition.conditionScore,
        grass_height: condition.grassHeight,
        bush_count: condition.bushCount,
        tree_coverage: condition.treeCoverage,
        debris_level: condition.debrisLevel,
        leaf_volume: condition.leafVolume,
        bed_condition: condition.bedCondition,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update property', 500);
    }

    res.json({
      success: true,
      condition,
    });
  })
);

export default router;
