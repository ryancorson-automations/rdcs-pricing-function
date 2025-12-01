# Complete Setup Guide - RDC's Pricing Platform

This guide walks you through setting up the entire platform from scratch.

---

## Step 1: Create Accounts & Get API Keys

### 1.1 Supabase (Database)

1. Go to [supabase.com](https://supabase.com)
2. Create a new account
3. Create a new project
4. Note your:
   - Project URL: `https://xxx.supabase.co`
   - Anon key: `eyJhb...`
   - Service role key: `eyJhb...` (Settings → API)
   - Database URL: `postgresql://...` (Settings → Database)

### 1.2 Google Cloud Platform

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable APIs:
   - Geocoding API
   - Maps Static API
   - Street View Static API
4. Create API key (Credentials → Create credentials → API key)
5. Restrict key (optional but recommended):
   - HTTP referrers for frontend
   - IP addresses for backend
6. Note your API key: `AIzaSy...`

### 1.3 OpenAI

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create account / Sign in
3. Add payment method (GPT-4 Vision requires paid account)
4. Create API key (API keys → Create new secret key)
5. Note your key: `sk-...`

### 1.4 Regrid (Property Data)

1. Go to [regrid.com](https://regrid.com)
2. Sign up for developer account
3. Get API key from dashboard
4. Note your key

**Alternative**: Use Loveland API instead

### 1.5 Jobber

1. Go to [getjobber.com](https://getjobber.com)
2. Create account (14-day trial available)
3. Go to Settings → API Access
4. Create API credentials
5. Note your:
   - API Key
   - API Secret
   - Account ID

---

## Step 2: Database Setup

### Option A: Supabase (Recommended)

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Create new query
4. Copy entire contents of `database/schema.sql`
5. Paste and run
6. Verify tables created in Table Editor

### Option B: Local PostgreSQL

```bash
# Install PostgreSQL (if not installed)
brew install postgresql  # macOS
# OR
sudo apt install postgresql  # Ubuntu

# Start PostgreSQL
brew services start postgresql  # macOS
# OR
sudo service postgresql start  # Ubuntu

# Create database
createdb rdcs_pricing

# Run schema
psql -U postgres -d rdcs_pricing -f database/schema.sql

# Verify tables
psql -U postgres -d rdcs_pricing -c "\dt"
```

---

## Step 3: Backend Setup

### 3.1 Install Dependencies

```bash
cd backend
npm install
```

### 3.2 Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database (from Step 1.1)
DATABASE_URL=postgresql://postgres:password@localhost:5432/rdcs_pricing
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# Google APIs (from Step 1.2)
GOOGLE_MAPS_API_KEY=AIzaSy...
GOOGLE_GEOCODING_API_KEY=AIzaSy...
GOOGLE_STREET_VIEW_API_KEY=AIzaSy...
GOOGLE_STATIC_MAPS_API_KEY=AIzaSy...

# OpenAI (from Step 1.3)
OPENAI_API_KEY=sk-...

# Regrid (from Step 1.4)
REGRID_API_KEY=your-key-here

# Jobber (from Step 1.5)
JOBBER_API_KEY=your-key-here
JOBBER_API_SECRET=your-secret-here
JOBBER_ACCOUNT_ID=your-account-id
JOBBER_API_URL=https://api.getjobber.com/api/graphql

# Service Area (Cincinnati, OH - adjust for your location)
SERVICE_AREA_CENTER_LAT=39.1031
SERVICE_AREA_CENTER_LNG=-84.5120
SERVICE_AREA_RADIUS_MILES=25

# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 3.3 Test Backend

```bash
# Start development server
npm run dev

# Should see:
# 🚀 RDC's Pricing API server running on port 3001
```

Test health endpoint:
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "service": "RDC's Landscape Pricing API"
}
```

---

## Step 4: Frontend Setup

### 4.1 Install Dependencies

```bash
cd frontend
npm install
```

### 4.2 Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 4.3 Test Frontend

```bash
npm run dev

# Should see:
# ✓ Ready on http://localhost:3000
```

Open browser to [http://localhost:3000](http://localhost:3000)

---

## Step 5: End-to-End Testing

### 5.1 Test Property Lookup

1. Open frontend at `http://localhost:3000`
2. Enter a valid US address (e.g., "1600 Pennsylvania Ave NW, Washington DC 20500")
3. Click "Get Instant Pricing"
4. Should see:
   - Loading spinner
   - Property details with measurements
   - Street View and Satellite images
   - AI condition analysis

### 5.2 Test Pricing Calculation

1. After property lookup completes
2. Click "Continue to Pricing"
3. Should see:
   - Three pricing tiers
   - Annual and monthly prices
   - Service breakdowns

### 5.3 Test Quote Generation

1. Select a tier (e.g., "Premier Lawn")
2. Should see:
   - Customer information form
   - Recommended upsells
   - Total calculation

### 5.4 Test Jobber Integration

1. Fill in customer details:
   - First Name: Test
   - Last Name: Customer
   - Email: test@example.com
   - Phone: (555) 123-4567
2. Click "Send Quote to Customer"
3. Should see:
   - Success message
   - Check Jobber dashboard for new client and quote

---

## Step 6: Verify All Features

### ✅ Property Lookup
- [ ] Address geocoding works
- [ ] Lot size detected from parcel data
- [ ] Lawn area estimated
- [ ] Street View image loads
- [ ] Satellite image loads

### ✅ AI Analysis
- [ ] Condition score generated (1-5)
- [ ] Grass height detected
- [ ] Bush count estimated
- [ ] Tree coverage assessed
- [ ] Debris level analyzed

### ✅ Pricing Engine
- [ ] Three tiers calculated
- [ ] Regional multiplier applied
- [ ] Complexity multiplier applied
- [ ] Prices look reasonable

### ✅ Upsells
- [ ] Recommendations generated
- [ ] Recommended items marked
- [ ] Can select/deselect upsells
- [ ] Total updates correctly

### ✅ Jobber Integration
- [ ] Client created in Jobber
- [ ] Quote created with line items
- [ ] Quote sent via email
- [ ] Sync log recorded in database

---

## Step 7: Customization

### Update Service Area

Edit `backend/.env`:
```env
# Change to your service area center
SERVICE_AREA_CENTER_LAT=your-latitude
SERVICE_AREA_CENTER_LNG=your-longitude
SERVICE_AREA_RADIUS_MILES=your-radius
```

### Update Rate Cards

Use Supabase dashboard or SQL:

```sql
-- Update existing rate
UPDATE rate_cards
SET base_rate = 5.00
WHERE service_code = 'MOWING_BASE';

-- Add new service
INSERT INTO rate_cards (service_code, service_name, unit_measure, base_rate, factor)
VALUES ('SPRING_CLEANUP', 'Spring Cleanup', 'Per 1000 Sq Ft', 8.00, 1);
```

### Add ZIP Code Adjustments

```sql
INSERT INTO regional_adjustments (zip_code, multiplier, area_name)
VALUES
  ('45201', 1.10, 'Downtown Premium'),
  ('45202', 1.05, 'West Side'),
  ('45203', 0.95, 'East Side');
```

---

## Step 8: Production Deployment

### 8.1 Prepare for Production

1. **Update Environment Variables**
   - Use production database URL
   - Use production API keys
   - Set `NODE_ENV=production`
   - Update `FRONTEND_URL` to production domain

2. **Build Applications**
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### 8.2 Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel
# Follow prompts, add environment variables

# Deploy backend
cd backend
vercel
# Add all environment variables
```

### 8.3 Alternative: Traditional Hosting

**Backend (Node.js server):**
- Deploy to DigitalOcean, AWS EC2, or similar
- Use PM2 for process management
- Set up reverse proxy (nginx)
- Enable HTTPS with Let's Encrypt

**Frontend:**
- Deploy to Vercel, Netlify, or similar
- Or build and serve with nginx

---

## Troubleshooting

### Database Connection Issues

```bash
# Test Supabase connection
curl -X POST https://your-project.supabase.co/rest/v1/rate_cards \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json"
```

### API Key Issues

**Google Maps 403 Error:**
- Check API is enabled in Google Cloud Console
- Verify API key restrictions
- Check billing is enabled

**OpenAI 401 Error:**
- Verify API key is correct
- Check account has GPT-4 access
- Verify billing is set up

**Jobber GraphQL Error:**
- Check API version header is correct
- Verify credentials in Jobber dashboard
- Test with Jobber GraphQL playground

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

---

## Next Steps

1. ✅ Complete setup
2. 📊 Monitor usage and costs
3. 🎨 Customize branding (colors, logo)
4. 📱 Add mobile responsiveness testing
5. 🔐 Set up rate limiting
6. 📈 Add analytics tracking
7. 🎯 Train team on using the platform
8. 📝 Collect customer feedback
9. 🚀 Iterate and improve

---

## Support Resources

- **Backend logs**: `backend/logs/` (production)
- **Frontend logs**: Browser console
- **Database**: Supabase dashboard
- **API testing**: Postman or curl

---

## Cost Estimates (Monthly)

| Service | Free Tier | Estimated Cost |
|---------|-----------|----------------|
| Supabase | 500MB DB | $0 - $25 |
| Google Maps | $200 credit | $0 - $50 |
| OpenAI GPT-4 | Pay per use | $10 - $100 |
| Regrid | Limited | $0 - $30 |
| Jobber | 14-day trial | $49+ |
| Vercel | Free tier | $0 - $20 |
| **Total** | | **$59 - $274/mo** |

**Tips to reduce costs:**
- Cache property lookups
- Batch AI analysis
- Use Google Maps Static API efficiently
- Optimize Regrid requests

---

Good luck with your deployment! 🚀
