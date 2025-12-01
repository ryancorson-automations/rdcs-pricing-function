import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { jobberClient } from '../services/jobberClient';
import { Customer, Quote, Property } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/jobber/create-client
 * Create a client in Jobber
 */
router.post(
  '/create-client',
  [
    body('firstName').notEmpty().withMessage('First name required'),
    body('lastName').notEmpty().withMessage('Last name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').optional().isString(),
    body('propertyId').isUUID().withMessage('Valid property ID required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { firstName, lastName, email, phone, propertyId } = req.body;

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
      formattedAddress: propertyData.formatted_address,
      city: propertyData.city,
      state: propertyData.state,
      zipCode: propertyData.zip_code,
    };

    // Create or get customer
    let customer: Customer;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (existingCustomer) {
      customer = {
        id: existingCustomer.id,
        firstName: existingCustomer.first_name,
        lastName: existingCustomer.last_name,
        email: existingCustomer.email,
        phone: existingCustomer.phone,
        jobberClientId: existingCustomer.jobber_client_id,
      };
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
        })
        .select()
        .single();

      if (customerError) {
        throw new AppError('Failed to create customer', 500);
      }

      customer = {
        id: newCustomer.id,
        firstName: newCustomer.first_name,
        lastName: newCustomer.last_name,
        email: newCustomer.email,
        phone: newCustomer.phone,
      };
    }

    // Create in Jobber
    const jobberClientId = await jobberClient.createClient(customer, property);

    // Update customer with Jobber ID
    await supabase
      .from('customers')
      .update({
        jobber_client_id: jobberClientId,
        jobber_synced_at: new Date().toISOString(),
      })
      .eq('id', customer.id);

    logger.info('Jobber client created via API:', {
      customerId: customer.id,
      jobberClientId,
    });

    res.json({
      success: true,
      customer: { ...customer, jobberClientId },
    });
  })
);

/**
 * POST /api/jobber/create-quote
 * Create and send quote in Jobber
 */
router.post(
  '/create-quote',
  [
    body('quoteId').isUUID().withMessage('Valid quote ID required'),
    body('sendMethod')
      .optional()
      .isIn(['email', 'sms'])
      .withMessage('Send method must be email or sms'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { quoteId, sendMethod = 'email' } = req.body;

    // Get complete quote details
    const { data: quoteData, error: quoteError } = await supabase
      .from('quote_details')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quoteData) {
      throw new AppError('Quote not found', 404);
    }

    // Verify customer exists
    if (!quoteData.customer_id) {
      throw new AppError('Quote must have a customer associated', 400);
    }

    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', quoteData.customer_id)
      .single();

    if (customerError || !customerData) {
      throw new AppError('Customer not found', 404);
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
      finalAnnualPrice: parseFloat(quoteData.final_annual_price),
      finalMonthlyPrice: parseFloat(quoteData.final_monthly_price),
      recommendedUpsells: quoteData.recommended_upsells,
      selectedUpsells: quoteData.selected_upsells,
      jobDescription: quoteData.job_description,
    };

    const customer: Customer = {
      id: customerData.id,
      firstName: customerData.first_name,
      lastName: customerData.last_name,
      email: customerData.email,
      phone: customerData.phone,
      jobberClientId: customerData.jobber_client_id,
    };

    const property: Property = {
      id: quoteData.property_id,
      formattedAddress: quoteData.formatted_address,
      city: quoteData.city,
      state: quoteData.state,
      zipCode: quoteData.zip_code,
    };

    // Create and send quote in Jobber
    const result = await jobberClient.createAndSendQuote(
      quote,
      property,
      customer,
      sendMethod as 'email' | 'sms'
    );

    logger.info('Jobber quote created and sent:', result);

    res.json({
      success: true,
      jobber: result,
      message: `Quote sent via ${sendMethod}`,
    });
  })
);

/**
 * GET /api/jobber/sync-status/:quoteId
 * Get Jobber sync status for a quote
 */
router.get(
  '/sync-status/:quoteId',
  asyncHandler(async (req: Request, res: Response) => {
    const { quoteId } = req.params;

    const { data, error } = await supabase
      .from('jobber_sync_log')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch sync status', 500);
    }

    res.json({
      success: true,
      syncLogs: data,
    });
  })
);

export default router;
