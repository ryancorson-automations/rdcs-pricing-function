import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { supabase } from '../config/database';
import {
  Customer,
  Quote,
  Property,
  JobberClient,
  JobberQuote,
  JobberLineItem,
  JobberSyncLog,
} from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Jobber API Integration Client
 *
 * Handles all interactions with Jobber API:
 * - Create client profiles
 * - Generate quotes with line items
 * - Send quotes via SMS/email
 * - Track sync status
 *
 * API Documentation: https://developer.getjobber.com/
 */

class JobberAPIClient {
  private client: AxiosInstance;
  private accountId: string;

  constructor() {
    const apiKey = process.env.JOBBER_API_KEY;
    const apiSecret = process.env.JOBBER_API_SECRET;
    this.accountId = process.env.JOBBER_ACCOUNT_ID || '';

    if (!apiKey || !apiSecret) {
      throw new Error('Jobber API credentials not configured');
    }

    // Jobber uses GraphQL API
    this.client = axios.create({
      baseURL: process.env.JOBBER_API_URL || 'https://api.getjobber.com/api/graphql',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-JOBBER-GRAPHQL-VERSION': '2023-03-09',
      },
      timeout: 30000,
    });

    logger.info('Jobber API client initialized');
  }

  /**
   * Execute GraphQL query
   */
  private async executeQuery(query: string, variables: any = {}): Promise<any> {
    try {
      const response = await this.client.post('', {
        query,
        variables,
      });

      if (response.data.errors) {
        logger.error('Jobber GraphQL errors:', response.data.errors);
        throw new AppError(
          response.data.errors[0]?.message || 'Jobber API error',
          400
        );
      }

      return response.data.data;
    } catch (error: any) {
      logger.error('Jobber API request failed:', {
        error: error.message,
        response: error.response?.data,
      });
      throw new AppError('Failed to communicate with Jobber', 500);
    }
  }

  /**
   * Create a client in Jobber
   */
  async createClient(customer: Customer, property: Property): Promise<string> {
    const mutation = `
      mutation CreateClient($input: CreateClientInput!) {
        createClient(input: $input) {
          client {
            id
            name
            emails {
              address
            }
            phones {
              number
            }
          }
          userErrors {
            message
            path
          }
        }
      }
    `;

    const input = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      emails: customer.email ? [{ address: customer.email, primary: true }] : [],
      phones: customer.phone
        ? [{ number: customer.phone, primary: true, type: 'MOBILE' }]
        : [],
      billingAddress: {
        street1: property.formattedAddress,
        city: property.city,
        province: property.state,
        postalCode: property.zipCode,
      },
      propertyAddress: {
        street1: property.formattedAddress,
        city: property.city,
        province: property.state,
        postalCode: property.zipCode,
      },
    };

    const result = await this.executeQuery(mutation, { input });

    if (result.createClient.userErrors?.length > 0) {
      throw new AppError(
        result.createClient.userErrors[0].message,
        400
      );
    }

    const clientId = result.createClient.client.id;

    logger.info('Jobber client created:', {
      clientId,
      name: `${customer.firstName} ${customer.lastName}`,
    });

    // Log sync
    await this.logSync({
      customerId: customer.id,
      action: 'create_client',
      status: 'success',
      jobberClientId: clientId,
      requestPayload: input,
      responsePayload: result.createClient.client,
    });

    return clientId;
  }

  /**
   * Create a quote in Jobber
   */
  async createQuote(
    quote: Quote,
    property: Property,
    customer: Customer,
    jobberClientId: string
  ): Promise<{ quoteId: string; quoteNumber: string }> {
    const mutation = `
      mutation CreateQuote($input: CreateQuoteInput!) {
        createQuote(input: $input) {
          quote {
            id
            quoteNumber
            total
            subject
          }
          userErrors {
            message
            path
          }
        }
      }
    `;

    // Build line items
    const lineItems: any[] = [];

    // Main service line item
    lineItems.push({
      name: `${quote.tier.toUpperCase().replace('_', ' ')} Package`,
      description: quote.jobDescription || 'Annual landscape maintenance package',
      unitCost: quote.finalAnnualPrice,
      quantity: 1,
    });

    // Add upsell line items
    if (quote.selectedUpsells && quote.selectedUpsells.length > 0) {
      quote.selectedUpsells.forEach((upsell) => {
        lineItems.push({
          name: upsell.serviceName,
          description: upsell.description,
          unitCost: upsell.price,
          quantity: 1,
        });
      });
    }

    const input = {
      clientId: jobberClientId,
      subject: `${quote.tier.toUpperCase().replace('_', ' ')} Package - ${
        property.formattedAddress
      }`,
      message: quote.jobDescription,
      lineItems: lineItems.map((item) => ({
        name: item.name,
        description: item.description,
        unitCost: item.unitCost.toString(),
        quantity: item.quantity,
      })),
      validFor: 30, // Valid for 30 days
    };

    const result = await this.executeQuery(mutation, { input });

    if (result.createQuote.userErrors?.length > 0) {
      throw new AppError(
        result.createQuote.userErrors[0].message,
        400
      );
    }

    const quoteId = result.createQuote.quote.id;
    const quoteNumber = result.createQuote.quote.quoteNumber;

    logger.info('Jobber quote created:', {
      quoteId,
      quoteNumber,
      total: result.createQuote.quote.total,
    });

    // Log sync
    await this.logSync({
      quoteId: quote.id,
      customerId: customer.id,
      action: 'create_quote',
      status: 'success',
      jobberClientId,
      jobberQuoteId: quoteId,
      requestPayload: input,
      responsePayload: result.createQuote.quote,
    });

    return { quoteId, quoteNumber };
  }

  /**
   * Send quote to customer via email/SMS
   */
  async sendQuote(jobberQuoteId: string, method: 'email' | 'sms' = 'email'): Promise<void> {
    const mutation = `
      mutation SendQuote($input: SendQuoteInput!) {
        sendQuote(input: $input) {
          quote {
            id
            sentAt
          }
          userErrors {
            message
            path
          }
        }
      }
    `;

    const input = {
      quoteId: jobberQuoteId,
      sendMethod: method.toUpperCase(),
    };

    const result = await this.executeQuery(mutation, { input });

    if (result.sendQuote.userErrors?.length > 0) {
      throw new AppError(
        result.sendQuote.userErrors[0].message,
        400
      );
    }

    logger.info('Jobber quote sent:', {
      jobberQuoteId,
      method,
      sentAt: result.sendQuote.quote.sentAt,
    });

    // Log sync
    await this.logSync({
      action: 'send_quote',
      status: 'success',
      jobberQuoteId,
      requestPayload: input,
      responsePayload: result.sendQuote.quote,
    });
  }

  /**
   * Get client by email (search existing)
   */
  async searchClientByEmail(email: string): Promise<string | null> {
    const query = `
      query SearchClients($email: String!) {
        clients(filter: { email: $email }) {
          nodes {
            id
            name
            emails {
              address
            }
          }
        }
      }
    `;

    try {
      const result = await this.executeQuery(query, { email });

      if (result.clients?.nodes?.length > 0) {
        const clientId = result.clients.nodes[0].id;
        logger.info('Found existing Jobber client:', { clientId, email });
        return clientId;
      }

      return null;
    } catch (error) {
      logger.warn('Client search failed:', error);
      return null;
    }
  }

  /**
   * Log sync activity to database
   */
  private async logSync(log: Partial<JobberSyncLog>): Promise<void> {
    try {
      await supabase.from('jobber_sync_log').insert({
        quote_id: log.quoteId,
        customer_id: log.customerId,
        action: log.action,
        status: log.status,
        request_payload: log.requestPayload,
        response_payload: log.responsePayload,
        error_message: log.errorMessage,
        jobber_client_id: log.jobberClientId,
        jobber_quote_id: log.jobberQuoteId,
      });
    } catch (error) {
      logger.error('Failed to log Jobber sync:', error);
    }
  }

  /**
   * Complete flow: Create client + quote + send
   */
  async createAndSendQuote(
    quote: Quote,
    property: Property,
    customer: Customer,
    sendMethod: 'email' | 'sms' = 'email'
  ): Promise<{ clientId: string; quoteId: string; quoteNumber: string }> {
    try {
      // Step 1: Check if client exists
      let jobberClientId: string | null = null;

      if (customer.email) {
        jobberClientId = await this.searchClientByEmail(customer.email);
      }

      // Step 2: Create client if doesn't exist
      if (!jobberClientId) {
        jobberClientId = await this.createClient(customer, property);

        // Update customer record with Jobber ID
        await supabase
          .from('customers')
          .update({
            jobber_client_id: jobberClientId,
            jobber_synced_at: new Date().toISOString(),
          })
          .eq('id', customer.id);
      }

      // Step 3: Create quote
      const { quoteId, quoteNumber } = await this.createQuote(
        quote,
        property,
        customer,
        jobberClientId
      );

      // Update quote record
      await supabase
        .from('quotes')
        .update({
          jobber_quote_id: quoteId,
          jobber_quote_number: quoteNumber,
          status: 'sent',
          jobber_sent_at: new Date().toISOString(),
        })
        .eq('id', quote.id);

      // Step 4: Send quote
      await this.sendQuote(quoteId, sendMethod);

      logger.info('Complete Jobber workflow successful:', {
        clientId: jobberClientId,
        quoteId,
        quoteNumber,
      });

      return {
        clientId: jobberClientId,
        quoteId,
        quoteNumber,
      };
    } catch (error: any) {
      logger.error('Jobber workflow failed:', error);

      // Log failure
      await this.logSync({
        quoteId: quote.id,
        customerId: customer.id,
        action: 'create_quote',
        status: 'failed',
        errorMessage: error.message,
      });

      throw error;
    }
  }
}

// Export singleton instance
export const jobberClient = new JobberAPIClient();
