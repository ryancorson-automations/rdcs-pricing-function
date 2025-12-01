# RDC's Landscape Instant Pricing Platform

> AI-powered instant pricing for landscaping services using property address only

A complete full-stack platform that generates accurate service pricing, analyzes property conditions using AI, and delivers quotes directly to customers via Jobber integration.

---

## 🎯 Features

### Core Capabilities

✅ **AI-Powered Property Analysis**
- Automatic lot size detection from parcel data
- Lawn and bed square footage estimation
- Satellite imagery analysis
- Distance calculations from service area

✅ **Computer Vision Condition Assessment**
- Google Street View image analysis using GPT-4 Vision
- Grass height detection
- Bush/shrub counting
- Tree coverage estimation
- Debris and leaf volume assessment
- Complexity scoring (1-5) for pricing adjustments

✅ **Real-Time Pricing Engine**
- Three-tier packages (Grass Roots, Premier, Total Landscape)
- Dynamic rate card system
- Regional ZIP code adjustments
- Complexity multipliers
- Distance-based pricing

✅ **Smart Upsell Recommendations**
- Context-aware service suggestions
- Mulch calculations
- Bush trimming estimates
- Seasonal package recommendations
- Materials list generation

✅ **One-Click Jobber Integration**
- Automatic client creation
- Quote generation with line items
- Email/SMS delivery
- Follow-up automation ready

---

## 🛠 Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **SWR** for data fetching
- **Radix UI** components

### Backend
- **Node.js 20+**
- **Express.js**
- **TypeScript**
- **Supabase** (PostgreSQL)

### External APIs
- Google Maps (Geocoding, Street View, Static Maps)
- OpenAI GPT-4 Vision
- Regrid/Loveland (Property data)
- Jobber API (GraphQL)

---

## 📁 Project Structure

```
rdcs-pricing-function/
├── ARCHITECTURE.md          # System architecture documentation
├── README.md                # This file
│
├── database/
│   └── schema.sql           # PostgreSQL database schema
│
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── server.ts        # Express server entry point
│   │   ├── config/
│   │   │   └── database.ts  # Supabase configuration
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   ├── routes/          # API routes
│   │   │   ├── property.routes.ts
│   │   │   ├── pricing.routes.ts
│   │   │   ├── jobber.routes.ts
│   │   │   └── health.routes.ts
│   │   ├── services/        # Business logic
│   │   │   ├── propertyLookup.ts    # Address → measurements
│   │   │   ├── aiVision.ts          # GPT-4 Vision analysis
│   │   │   ├── pricingEngine.ts     # Rate calculations
│   │   │   ├── upsellEngine.ts      # Smart recommendations
│   │   │   └── jobberClient.ts      # Jobber API wrapper
│   │   ├── types/
│   │   │   └── index.ts     # TypeScript types
│   │   └── utils/
│   │       └── logger.ts    # Winston logger
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── frontend/                # Next.js application
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx   # Root layout
    │   │   ├── page.tsx     # Main app page
    │   │   └── globals.css  # Tailwind styles
    │   ├── components/
    │   │   ├── AddressInput.tsx       # Step 1: Address entry
    │   │   ├── PropertyPreview.tsx    # Step 2: Property review
    │   │   ├── PricingDisplay.tsx     # Step 3: Tier selection
    │   │   └── QuoteForm.tsx          # Step 4: Customer & send
    │   ├── lib/
    │   │   └── api.ts       # API client functions
    │   └── types/
    │       └── index.ts     # TypeScript types
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    └── .env.local.example
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (or Supabase account)
- API Keys:
  - Google Maps API (Geocoding, Street View, Static Maps)
  - OpenAI API (GPT-4 Vision)
  - Regrid API (Property data)
  - Jobber API (Account required)

### 1. Database Setup

```bash
# Create Supabase project or local PostgreSQL database
# Run schema
psql -U postgres -d your_database < database/schema.sql

# Or use Supabase Dashboard SQL Editor
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys and database URL

# Run development server
npm run dev

# Backend runs on http://localhost:3001
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Run development server
npm run dev

# Frontend runs on http://localhost:3000
```

### 4. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Google APIs
GOOGLE_MAPS_API_KEY=xxx
GOOGLE_GEOCODING_API_KEY=xxx
GOOGLE_STREET_VIEW_API_KEY=xxx
GOOGLE_STATIC_MAPS_API_KEY=xxx

# AI Vision
OPENAI_API_KEY=sk-xxx

# Property Data
REGRID_API_KEY=xxx

# Jobber
JOBBER_API_KEY=xxx
JOBBER_API_SECRET=xxx
JOBBER_ACCOUNT_ID=xxx
JOBBER_API_URL=https://api.getjobber.com/api/graphql

# Service Area
SERVICE_AREA_CENTER_LAT=39.1031
SERVICE_AREA_CENTER_LNG=-84.5120
SERVICE_AREA_RADIUS_MILES=25
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 🔌 API Endpoints

### Property

- `POST /api/property/lookup` - Lookup property by address
- `GET /api/property/:id` - Get property details
- `POST /api/property/:id/analyze` - Run AI analysis

### Pricing

- `POST /api/pricing/calculate` - Calculate all tier pricing
- `POST /api/pricing/quote` - Generate complete quote
- `GET /api/pricing/quote/:id` - Get quote details
- `GET /api/pricing/rate-cards` - Get active rate cards

### Jobber

- `POST /api/jobber/create-client` - Create Jobber client
- `POST /api/jobber/create-quote` - Create & send Jobber quote
- `GET /api/jobber/sync-status/:quoteId` - Get sync logs

### Health

- `GET /api/health` - Health check

---

## 🎨 User Flow

1. **Address Input**
   - Salesperson enters property address
   - System geocodes and validates address

2. **Property Analysis**
   - Automatically fetches lot size from parcel data
   - Estimates lawn, bed, and hardscape areas
   - Retrieves Google Street View image
   - AI analyzes property condition
   - Displays satellite + street view images

3. **Pricing Selection**
   - Shows three pricing tiers
   - Displays breakdown for each tier
   - Applies complexity and regional multipliers
   - Shows annual and monthly pricing

4. **Quote Generation**
   - Shows smart upsell recommendations
   - Customer information form
   - Total calculation with selected add-ons
   - One-click send to customer via Jobber

---

## 🧠 AI Analysis Details

### GPT-4 Vision Assessment

The system analyzes Street View images for:
- **Grass Height**: Normal, Overgrown, Very Overgrown
- **Bush Count**: Estimated number of bushes/shrubs
- **Tree Coverage**: Light, Moderate, Heavy
- **Debris Level**: Minimal, Moderate, Heavy
- **Leaf Volume**: Seasonal leaf cleanup difficulty
- **Bed Condition**: Good, Needs Work, Overgrown
- **Complexity Score**: 1-5 overall difficulty rating

### Pricing Multipliers

- Score 1: 0.9x (easier than average)
- Score 2: 1.0x (standard)
- Score 3: 1.1x (average complexity)
- Score 4: 1.25x (needs extra work)
- Score 5: 1.5x (severely overgrown)

---

## 💰 Pricing Tiers

### Grass Roots 🌱
- 30 weekly mowing visits
- Basic fall leaf cleanup (1 visit)
- **Price**: ~$1,350-2,000/year

### Premier Lawn ⭐ (Most Popular)
- 30 weekly mowing visits
- Full fall leaf cleanup (2 visits)
- Seasonal care package (aeration + fertilization)
- **Price**: ~$2,000-3,500/year

### Total Landscape 👑
- Everything in Premier
- Holiday lights installation & removal
- 15% premium package markup
- **Price**: ~$3,000-5,000/year

---

## 🔧 Customization

### Update Rate Cards

Edit `database/schema.sql` seed data or use Supabase dashboard:

```sql
INSERT INTO rate_cards (service_code, service_name, unit_measure, base_rate, factor)
VALUES ('NEW_SERVICE', 'New Service Name', 'Per Unit', 50.00, 1);
```

### Adjust Regional Multipliers

```sql
INSERT INTO regional_adjustments (zip_code, multiplier, area_name)
VALUES ('45999', 1.15, 'Premium Area');
```

### Modify Upsell Logic

Edit `backend/src/services/upsellEngine.ts` to customize recommendation rules.

---

## 📊 Database Schema

See `database/schema.sql` for complete schema.

**Key Tables:**
- `properties` - Property data + measurements
- `quotes` - Generated quotes + pricing
- `customers` - Customer information
- `rate_cards` - Service pricing rules
- `regional_adjustments` - ZIP code multipliers
- `jobber_sync_log` - Integration audit trail

---

## 🚢 Production Deployment

### Vercel (Recommended)

```bash
# Deploy frontend
cd frontend
vercel

# Deploy backend as Vercel functions
cd backend
vercel
```

### Traditional Hosting

```bash
# Build backend
cd backend
npm run build
npm start

# Build frontend
cd frontend
npm run build
npm start
```

### Environment Setup

1. Create Supabase production project
2. Run database schema
3. Configure all environment variables
4. Set up API keys with production quotas
5. Configure Jobber webhooks (if needed)

---

## 🔐 Security Considerations

- ✅ All API keys stored in environment variables
- ✅ Supabase Row Level Security (RLS) can be enabled
- ✅ Rate limiting recommended for production
- ✅ HTTPS required for production
- ✅ Input validation on all endpoints
- ✅ Error messages don't expose sensitive data

---

## 🐛 Troubleshooting

### Common Issues

**Property lookup fails**
- Verify Google Geocoding API key is valid
- Check API quota hasn't been exceeded
- Ensure address format is complete

**AI analysis returns defaults**
- Verify OpenAI API key has GPT-4 Vision access
- Check Street View image is available for address
- Review API quota limits

**Jobber integration fails**
- Confirm Jobber API credentials are correct
- Verify GraphQL API version compatibility
- Check Jobber account permissions

---

## 📚 Additional Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture details
- [database/schema.sql](./database/schema.sql) - Database schema

---

## 🤝 Support

For issues, questions, or feature requests:
- Review documentation first
- Check logs in `backend/logs/` (production)
- Verify all API keys are configured
- Test individual API endpoints with curl/Postman

---

## 📝 License

Proprietary - RDC's Landscape and Lawn © 2024

---

## 🎉 Features Roadmap

Future enhancements:
- [ ] Mobile app (React Native)
- [ ] Customer portal for quote approval
- [ ] Route optimization for crews
- [ ] Before/after photo uploads
- [ ] Analytics dashboard
- [ ] Seasonal pricing automation
- [ ] Multi-language support
- [ ] Calendar integration
- [ ] Automated follow-ups
- [ ] Referral tracking

---

Built with ❤️ for landscaping professionals
