import { Router, Request, Response } from 'express';
import { testConnection } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const dbConnected = await testConnection();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: "RDC's Landscape Pricing API",
      version: '1.0.0',
      database: dbConnected ? 'connected' : 'disconnected',
    });
  })
);

export default router;
