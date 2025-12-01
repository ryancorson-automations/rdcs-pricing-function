import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

// Supabase client (for easier database operations)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// PostgreSQL connection pool (for direct SQL queries if needed)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('Database pool connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
  process.exit(-1);
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('rate_cards').select('count');
    if (error) throw error;
    logger.info('✅ Database connection successful');
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    return false;
  }
};
