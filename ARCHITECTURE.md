# RDC's Landscape Instant Pricing Platform - Architecture

## System Overview

A full-stack instant pricing platform that generates accurate landscaping service quotes using only a property address. The system leverages AI for property analysis, automated measurements, and intelligent upsell recommendations.

---

## Core Features

### 1. AI-Powered Property Analysis
- **Address Input → Automated Measurements**
  - Lot size (from property data APIs)
  - Turf/lawn square footage (satellite imagery + polygon analysis)
  - Bed square footage
  - Driveway/walkway measurements
  - Slope/grading indicators
  - APIs: Google Maps, Mapbox, Regrid/Loveland

### 2. Google Street View AI Vision Analysis
- **Computer Vision for Property Conditions**
  - Grass height/overgrowth detection
  - Bush count estimation
  - Bed condition assessment
  - Leaf volume estimation
  - Debris detection
  - Tree coverage analysis
  - **Output**: Complexity score (1-5) → pricing multiplier

### 3. Real-Time Pricing Engine
- **Service Types**
  - Weekly lawn mowing
  - Seasonal cleanup
  - Mulch installation
  - Softscape installation
  - Monthly maintenance
- **Pricing Factors**
  - Square footage (auto-detected)
  - Bed size
  - Debris estimates
  - Mulch yardage calculations
  - Distance from service area center
  - Job difficulty multipliers (from AI analysis)
  - Regional ZIP code adjustments

### 4. Smart Upsell Engine
- **Context-Aware Recommendations**
  - Based on property layout + selected service
  - Suggests: Edging, bed maintenance, bush trimming, mulch, leaf cleanup
  - Auto-generates materials list, labor time, crew size

### 5. One-Click Jobber Integration
- **Automated Quote Delivery**
  - Create client profile in Jobber
  - Generate quote with all line items
  - Attach property photos
  - AI-generated job description
  - Send via SMS + email
  - Trigger follow-up automations

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + SWR for data fetching
- **UI Components**: Shadcn/ui
- **Maps**: Google Maps JavaScript API

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **API Design**: RESTful with OpenAPI documentation

### Database
- **Primary DB**: Supabase (PostgreSQL)
- **Tables**:
  - `properties` - Property data + measurements
  - `quotes` - Generated quotes + pricing breakdowns
  - `rate_cards` - Service rates + regional adjustments
  - `customers` - Customer information
  - `jobber_sync_log` - Integration tracking

### External APIs
1. **Google Maps APIs**
   - Geocoding API (address → coordinates)
   - Static Maps API (satellite imagery)
   - Street View Static API (property photos)
   - Distance Matrix API (travel distance calculations)

2. **AI/ML Services**
   - **Google Cloud Vision API** OR **OpenAI GPT-4 Vision**
   - For property condition analysis

3. **Property Data**
   - **Regrid API** OR **Loveland API** (parcel data, lot size)
   - Fallback: Google Maps Place Details

4. **Jobber API**
   - Client creation
   - Quote generation
   - Job scheduling

### Infrastructure
- **Hosting**: Vercel (Frontend + API Routes)
- **Functions**: Vercel Serverless Functions
- **Environment**: Production, Staging, Development

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Address Input → Property Preview → Pricing → Quote     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼────────────────────────────────────┐
│                    BACKEND API (Express/Node)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Property    │  │  AI Vision   │  │   Pricing Engine     │  │
│  │  Lookup      │  │  Analysis    │  │                      │  │
│  │  Service     │  │  Service     │  │  - Rate Calculator   │  │
│  │              │  │              │  │  - Upsell Engine     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
┌─────────▼─────────────────▼──────────────────────▼──────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Google Maps  │  │  GPT-4 Vision│  │   Jobber API         │  │
│  │ - Geocoding  │  │  OR          │  │   - Create Client    │  │
│  │ - Street View│  │  GCP Vision  │  │   - Generate Quote   │  │
│  │ - Satellite  │  │              │  │   - Send to Customer │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    DATABASE (Supabase/PostgreSQL)                │
│    Properties | Quotes | Rate Cards | Customers | Sync Logs     │
└──────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Property Analysis
- `POST /api/property/lookup` - Get property measurements from address
- `POST /api/property/analyze-condition` - AI vision analysis of property
- `GET /api/property/:id` - Get saved property data

### Pricing
- `POST /api/pricing/calculate` - Calculate pricing for selected services
- `GET /api/pricing/rate-cards` - Get current rate card data
- `POST /api/pricing/quote` - Generate complete quote with upsells

### Jobber Integration
- `POST /api/jobber/create-client` - Create client in Jobber
- `POST /api/jobber/create-quote` - Create and send quote
- `GET /api/jobber/sync-status/:quoteId` - Check sync status

### Utility
- `GET /api/health` - Health check
- `POST /api/webhooks/jobber` - Jobber webhook handler

---

## Database Schema

### properties
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  formatted_address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  zip_code VARCHAR(10),

  -- Measurements
  lot_size_sqft INTEGER,
  lawn_sqft INTEGER,
  bed_sqft INTEGER,
  driveway_sqft INTEGER,
  walkway_linear_ft INTEGER,
  roofline_ft INTEGER,
  slope_grade VARCHAR(20), -- 'flat', 'moderate', 'steep'

  -- AI Analysis Results
  condition_score INTEGER, -- 1-5
  grass_height VARCHAR(20), -- 'normal', 'overgrown', 'very_overgrown'
  bush_count INTEGER,
  tree_coverage VARCHAR(20), -- 'light', 'moderate', 'heavy'
  debris_level VARCHAR(20), -- 'minimal', 'moderate', 'heavy'

  -- Metadata
  street_view_url TEXT,
  satellite_image_url TEXT,
  analysis_data JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### quotes
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  customer_id UUID REFERENCES customers(id),

  -- Service Selection
  service_type VARCHAR(50), -- 'mowing', 'cleanup', 'mulch', etc.
  tier VARCHAR(20), -- 'grass_roots', 'premier', 'total_landscape'

  -- Pricing Breakdown
  base_price DECIMAL(10, 2),
  complexity_multiplier DECIMAL(4, 2),
  regional_multiplier DECIMAL(4, 2),
  final_annual_price DECIMAL(10, 2),
  final_monthly_price DECIMAL(10, 2),

  -- Upsells
  recommended_upsells JSONB, -- Array of upsell objects
  selected_upsells JSONB,

  -- Materials & Labor
  materials_list JSONB,
  estimated_labor_hours DECIMAL(5, 2),
  crew_size INTEGER,

  -- Status
  status VARCHAR(20), -- 'draft', 'sent', 'accepted', 'rejected'
  jobber_quote_id VARCHAR(100),
  jobber_client_id VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### rate_cards
```sql
CREATE TABLE rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code VARCHAR(50) NOT NULL, -- 'MOWING_BASE', 'LEAF_CLEANUP', etc.
  service_name TEXT,
  unit_measure VARCHAR(50), -- 'Per 1000 Sq Ft', 'Per Linear Foot', etc.
  base_rate DECIMAL(10, 2),
  factor INTEGER DEFAULT 1,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  jobber_client_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### jobber_sync_log
```sql
CREATE TABLE jobber_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id),
  action VARCHAR(50), -- 'create_client', 'create_quote', 'send_quote'
  status VARCHAR(20), -- 'success', 'failed', 'pending'
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Key Modules

### 1. Property Lookup Service (`/backend/services/propertyLookup.ts`)
- Geocode address
- Fetch parcel data (lot size)
- Estimate lawn area using satellite imagery + polygon tools
- Calculate bed/driveway measurements

### 2. AI Vision Service (`/backend/services/aiVision.ts`)
- Fetch Google Street View image
- Analyze with GPT-4 Vision or Google Cloud Vision
- Extract property conditions
- Return complexity score (1-5)

### 3. Pricing Engine (`/backend/services/pricingEngine.ts`)
- Load rate cards from database
- Apply square footage calculations
- Factor in complexity multipliers
- Apply regional adjustments
- Calculate tier pricing (Grass Roots, Premier, Total Landscape)

### 4. Upsell Engine (`/backend/services/upsellEngine.ts`)
- Analyze property data + selected service
- Generate contextual upsell recommendations
- Calculate materials needed
- Estimate labor time

### 5. Jobber Integration (`/backend/services/jobberClient.ts`)
- Create client profile
- Generate quote with line items
- Attach photos
- Send quote via SMS/email
- Handle webhooks

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# Google APIs
GOOGLE_MAPS_API_KEY=...
GOOGLE_GEOCODING_API_KEY=...
GOOGLE_STREET_VIEW_API_KEY=...
GOOGLE_STATIC_MAPS_API_KEY=...

# AI Vision (choose one)
OPENAI_API_KEY=... # For GPT-4 Vision
# OR
GOOGLE_CLOUD_PROJECT_ID=... # For Google Cloud Vision
GOOGLE_APPLICATION_CREDENTIALS=...

# Property Data
REGRID_API_KEY=... # OR LOVELAND_API_KEY

# Jobber
JOBBER_API_KEY=...
JOBBER_API_SECRET=...
JOBBER_ACCOUNT_ID=...

# App Config
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

---

## Deployment Strategy

### Development
- Frontend: `npm run dev` (localhost:3000)
- Backend: `npm run dev` (localhost:3001)
- Database: Local Supabase or Docker Postgres

### Production
- Frontend: Vercel (auto-deploy from `main` branch)
- Backend API: Vercel Serverless Functions (co-located with frontend)
- Database: Supabase Cloud (Production tier)
- Secrets: Vercel Environment Variables

---

## Future Enhancements
1. Mobile app (React Native)
2. Calendar scheduling integration
3. Customer portal for quote approval
4. Analytics dashboard for sales team
5. Route optimization for crew dispatch
6. Before/after photo upload
7. Seasonal pricing adjustments automation
8. Multi-language support
