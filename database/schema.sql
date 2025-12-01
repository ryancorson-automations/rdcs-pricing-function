-- RDC's Landscape Pricing Platform - Database Schema
-- PostgreSQL / Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROPERTIES TABLE
-- Stores property information and AI-analyzed measurements
-- ============================================================================
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Address Information
  address TEXT NOT NULL,
  formatted_address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  zip_code VARCHAR(10),
  city VARCHAR(100),
  state VARCHAR(50),

  -- Property Measurements (Auto-detected)
  lot_size_sqft INTEGER,
  lawn_sqft INTEGER,
  bed_sqft INTEGER,
  driveway_sqft INTEGER,
  walkway_linear_ft INTEGER,
  roofline_ft INTEGER,

  -- Terrain & Layout
  slope_grade VARCHAR(20), -- 'flat', 'moderate', 'steep'
  property_type VARCHAR(50), -- 'residential', 'commercial', 'hoa'

  -- AI Vision Analysis Results
  condition_score INTEGER CHECK (condition_score BETWEEN 1 AND 5),
  grass_height VARCHAR(20), -- 'normal', 'overgrown', 'very_overgrown'
  bush_count INTEGER,
  tree_coverage VARCHAR(20), -- 'light', 'moderate', 'heavy'
  debris_level VARCHAR(20), -- 'minimal', 'moderate', 'heavy'
  leaf_volume VARCHAR(20), -- 'minimal', 'moderate', 'heavy'
  bed_condition VARCHAR(20), -- 'good', 'needs_work', 'overgrown'

  -- Images & Raw Data
  street_view_url TEXT,
  satellite_image_url TEXT,
  analysis_data JSONB, -- Full AI response
  parcel_data JSONB, -- Full parcel API response

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_properties_zip ON properties(zip_code);
CREATE INDEX idx_properties_address ON properties(address);
CREATE INDEX idx_properties_created ON properties(created_at DESC);

-- ============================================================================
-- CUSTOMERS TABLE
-- Customer information and Jobber sync status
-- ============================================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact Information
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),

  -- Jobber Integration
  jobber_client_id VARCHAR(100) UNIQUE,
  jobber_synced_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_jobber ON customers(jobber_client_id);

-- ============================================================================
-- QUOTES TABLE
-- Generated quotes with pricing breakdowns and upsells
-- ============================================================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Service Selection
  service_type VARCHAR(50) NOT NULL, -- 'mowing', 'cleanup', 'mulch', 'softscape', 'maintenance'
  tier VARCHAR(20) NOT NULL, -- 'grass_roots', 'premier', 'total_landscape'

  -- Base Pricing Calculations
  base_price DECIMAL(10, 2) NOT NULL,
  complexity_multiplier DECIMAL(4, 2) DEFAULT 1.0,
  regional_multiplier DECIMAL(4, 2) DEFAULT 1.0,
  distance_miles DECIMAL(6, 2),

  -- Final Pricing
  final_annual_price DECIMAL(10, 2) NOT NULL,
  final_monthly_price DECIMAL(10, 2) NOT NULL,

  -- Upsells & Add-ons
  recommended_upsells JSONB, -- Array of {service, price, description}
  selected_upsells JSONB, -- Array of selected upsells
  total_upsells_price DECIMAL(10, 2) DEFAULT 0,

  -- Materials & Labor Estimates
  materials_list JSONB, -- Array of {item, quantity, unit}
  estimated_labor_hours DECIMAL(5, 2),
  crew_size INTEGER,

  -- Job Description (AI-generated)
  job_description TEXT,

  -- Quote Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'accepted', 'rejected', 'expired'
  valid_until DATE,

  -- Jobber Integration
  jobber_quote_id VARCHAR(100),
  jobber_quote_number VARCHAR(50),
  jobber_sent_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quotes_property ON quotes(property_id);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);

-- ============================================================================
-- RATE_CARDS TABLE
-- Service rates and pricing rules (synced from Google Sheets)
-- ============================================================================
CREATE TABLE rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Service Identification
  service_code VARCHAR(50) NOT NULL UNIQUE, -- 'MOWING_BASE', 'LEAF_CLEANUP', etc.
  service_name TEXT NOT NULL,
  category VARCHAR(50), -- 'mowing', 'cleanup', 'installation', 'maintenance'

  -- Pricing
  unit_measure VARCHAR(50) NOT NULL, -- 'Per 1000 Sq Ft', 'Per Linear Foot', 'Flat Rate'
  base_rate DECIMAL(10, 2) NOT NULL,
  factor INTEGER DEFAULT 1, -- Frequency multiplier (e.g., 30 for weekly mowing)

  -- Additional Info
  notes TEXT,

  -- Status
  active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rate_cards_code ON rate_cards(service_code);
CREATE INDEX idx_rate_cards_category ON rate_cards(category);

-- ============================================================================
-- REGIONAL_ADJUSTMENTS TABLE
-- ZIP code based pricing multipliers
-- ============================================================================
CREATE TABLE regional_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  zip_code VARCHAR(10) NOT NULL UNIQUE,
  multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
  area_name VARCHAR(100),
  notes TEXT,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_regional_zip ON regional_adjustments(zip_code);

-- ============================================================================
-- JOBBER_SYNC_LOG TABLE
-- Track all Jobber API interactions for debugging and auditing
-- ============================================================================
CREATE TABLE jobber_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Action Details
  action VARCHAR(50) NOT NULL, -- 'create_client', 'create_quote', 'send_quote', 'update_quote'
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending', 'retry'

  -- Request/Response Data
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,

  -- Jobber IDs
  jobber_client_id VARCHAR(100),
  jobber_quote_id VARCHAR(100),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_log_quote ON jobber_sync_log(quote_id);
CREATE INDEX idx_sync_log_action ON jobber_sync_log(action);
CREATE INDEX idx_sync_log_status ON jobber_sync_log(status);
CREATE INDEX idx_sync_log_created ON jobber_sync_log(created_at DESC);

-- ============================================================================
-- SEED DATA - Initial Rate Cards (from Google Sheet)
-- ============================================================================
INSERT INTO rate_cards (service_code, service_name, category, unit_measure, base_rate, factor, notes) VALUES
  ('MOWING_BASE', 'Weekly Lawn Mowing', 'mowing', 'Per 1000 Sq Ft', 4.50, 30, 'Annual visits assumed for weekly mowing in season'),
  ('LEAF_CLEANUP', 'Fall Leaf Cleanup', 'cleanup', 'Per 1000 Sq Ft', 6.00, 2, 'Assumes 2 major fall cleanups for Premier tier'),
  ('LIGHTS_INSTALL', 'Christmas Lights Installation', 'installation', 'Per Linear Foot', 3.00, 1, 'Includes labor, consumables, and removal cost'),
  ('SEASONAL_PACKAGE', 'Seasonal Care Package', 'maintenance', 'Flat Rate', 650.00, 1, 'Covers Aeration (1x) & Fertilization (4x)'),
  ('MULCH_INSTALL', 'Mulch Installation', 'installation', 'Per Cubic Yard', 95.00, 1, 'Includes materials and labor'),
  ('EDGING', 'Bed Edging', 'maintenance', 'Per Linear Foot', 2.50, 1, 'Creates clean bed borders'),
  ('BUSH_TRIMMING', 'Bush Trimming', 'maintenance', 'Per Bush', 15.00, 1, 'Seasonal bush shaping'),
  ('BED_MAINTENANCE', 'Monthly Bed Maintenance', 'maintenance', 'Per 100 Sq Ft', 25.00, 12, 'Weeding and upkeep');

-- ============================================================================
-- SEED DATA - Regional Adjustments (from Google Sheet)
-- ============================================================================
INSERT INTO regional_adjustments (zip_code, multiplier, area_name, notes) VALUES
  ('45247', 1.05, 'High Cost Area', 'Multiplies all base rates by +5%'),
  ('45242', 0.95, 'Low Cost Area', 'Multiplies all base rates by -5%'),
  ('45243', 1.00, 'Standard Area', 'No adjustment'),
  ('45244', 1.00, 'Standard Area', 'No adjustment');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_cards_updated_at BEFORE UPDATE ON rate_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for complete quote details with property and customer info
CREATE VIEW quote_details AS
SELECT
  q.*,
  p.address,
  p.formatted_address,
  p.zip_code,
  p.lawn_sqft,
  p.lot_size_sqft,
  p.condition_score,
  c.first_name,
  c.last_name,
  c.email,
  c.phone
FROM quotes q
LEFT JOIN properties p ON q.property_id = p.id
LEFT JOIN customers c ON q.customer_id = c.id;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE properties IS 'Property data with AI-analyzed measurements and conditions';
COMMENT ON TABLE quotes IS 'Generated pricing quotes with breakdowns and Jobber integration';
COMMENT ON TABLE rate_cards IS 'Service pricing rates and calculation rules';
COMMENT ON TABLE regional_adjustments IS 'ZIP code based pricing multipliers';
COMMENT ON TABLE jobber_sync_log IS 'Audit log of all Jobber API interactions';
