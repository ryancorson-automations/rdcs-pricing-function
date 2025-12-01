import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import propertyRoutes from './routes/property.routes';
import pricingRoutes from './routes/pricing.routes';
import jobberRoutes from './routes/jobber.routes';
import healthRoutes from './routes/health.routes';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    ip: req.ip,
  });
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

app.use('/api/health', healthRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/jobber', jobberRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: "RDC's Landscape Instant Pricing API",
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      property: '/api/property',
      pricing: '/api/pricing',
      jobber: '/api/jobber',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(errorHandler);

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  logger.info(`🚀 RDC's Pricing API server running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', { promise, reason: reason.message });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', { error: error.message });
  process.exit(1);
});

export default app;
