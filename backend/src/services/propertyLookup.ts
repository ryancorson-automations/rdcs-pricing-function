import axios from 'axios';
import { logger } from '../utils/logger';
import { Property, PropertyAddress, PropertyMeasurements } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Property Lookup Service
 *
 * Handles property address geocoding, measurements, and parcel data retrieval
 * Uses Google Maps Geocoding, Static Maps, and Regrid/Loveland for parcel data
 */

const GOOGLE_GEOCODING_API = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_STATIC_MAPS_API = 'https://maps.googleapis.com/maps/api/staticmap';
const REGRID_API = 'https://app.regrid.com/api/v1';

interface GeocodeResult {
  formattedAddress: string;
  lat: number;
  lng: number;
  zipCode?: string;
  city?: string;
  state?: string;
}

interface ParcelData {
  lotSizeSqft?: number;
  parcelId?: string;
  owner?: string;
  landUse?: string;
  rawData?: any;
}

/**
 * Geocode an address using Google Geocoding API
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  try {
    const response = await axios.get(GOOGLE_GEOCODING_API, {
      params: {
        address,
        key: process.env.GOOGLE_GEOCODING_API_KEY,
      },
    });

    if (response.data.status !== 'OK' || !response.data.results.length) {
      throw new AppError('Address not found', 404);
    }

    const result = response.data.results[0];
    const location = result.geometry.location;
    const addressComponents = result.address_components;

    // Extract ZIP code, city, state
    const zipCode = addressComponents.find((c: any) =>
      c.types.includes('postal_code')
    )?.long_name;

    const city = addressComponents.find((c: any) =>
      c.types.includes('locality')
    )?.long_name;

    const state = addressComponents.find((c: any) =>
      c.types.includes('administrative_area_level_1')
    )?.short_name;

    logger.info('Geocoded address:', {
      address,
      formattedAddress: result.formatted_address,
      lat: location.lat,
      lng: location.lng,
    });

    return {
      formattedAddress: result.formatted_address,
      lat: location.lat,
      lng: location.lng,
      zipCode,
      city,
      state,
    };
  } catch (error: any) {
    logger.error('Geocoding error:', error);
    throw new AppError('Failed to geocode address', 500);
  }
}

/**
 * Get parcel data from Regrid API
 */
export async function getParcelData(lat: number, lng: number): Promise<ParcelData> {
  try {
    const response = await axios.get(`${REGRID_API}/parcel`, {
      params: {
        lat,
        lng,
        token: process.env.REGRID_API_KEY,
      },
    });

    if (!response.data || !response.data.results || !response.data.results.length) {
      logger.warn('No parcel data found for coordinates:', { lat, lng });
      return {};
    }

    const parcel = response.data.results[0];
    const lotSizeSqft = parcel.properties?.lotsize || parcel.properties?.sqft;

    logger.info('Retrieved parcel data:', {
      parcelId: parcel.properties?.parcelid,
      lotSizeSqft,
    });

    return {
      lotSizeSqft,
      parcelId: parcel.properties?.parcelid,
      owner: parcel.properties?.owner,
      landUse: parcel.properties?.landuse,
      rawData: parcel.properties,
    };
  } catch (error: any) {
    logger.warn('Regrid API error (using fallback):', error.message);
    return {};
  }
}

/**
 * Estimate lawn square footage based on lot size
 *
 * Algorithm:
 * - Residential lots: ~60-70% of lot size is typically lawn/landscaped area
 * - Subtract estimated building footprint (15-20% of lot)
 * - Subtract driveway/hardscape (10-15% of lot)
 */
export function estimateLawnArea(lotSizeSqft: number): PropertyMeasurements {
  // Conservative estimates
  const buildingFootprintRatio = 0.18; // 18% of lot
  const hardscapeRatio = 0.12; // 12% of lot (driveway, walkways, patio)
  const bedAreaRatio = 0.10; // 10% of lot in landscape beds

  const buildingSqft = Math.round(lotSizeSqft * buildingFootprintRatio);
  const drivewaySquft = Math.round(lotSizeSqft * hardscapeRatio);
  const bedSqft = Math.round(lotSizeSqft * bedAreaRatio);

  // Lawn = total - building - hardscape - beds
  const lawnSqft = Math.round(
    lotSizeSqft - buildingSqft - drivewaySquft - bedSqft
  );

  // Estimate roofline for Christmas lights (perimeter of building footprint)
  // Assume roughly square building
  const buildingSide = Math.sqrt(buildingSqft);
  const rooflineFt = Math.round(buildingSide * 4);

  // Estimate walkway linear feet (typical residential property)
  const walkwayLinearFt = Math.round(50 + (lotSizeSqft / 1000) * 5);

  logger.info('Estimated property measurements:', {
    lotSizeSqft,
    lawnSqft,
    bedSqft,
    drivewaySquft,
    rooflineFt,
    walkwayLinearFt,
  });

  return {
    lotSizeSqft,
    lawnSqft,
    bedSqft,
    drivewaySquft,
    rooflineFt,
    walkwayLinearFt,
    slopeGrade: 'flat', // Default, can be improved with elevation API
  };
}

/**
 * Get Google Street View image URL for property
 */
export function getStreetViewUrl(lat: number, lng: number, heading: number = 0): string {
  return `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&heading=${heading}&pitch=0&key=${process.env.GOOGLE_STREET_VIEW_API_KEY}`;
}

/**
 * Get Google Static Maps satellite image URL
 */
export function getSatelliteImageUrl(lat: number, lng: number, zoom: number = 19): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=640x480&maptype=satellite&key=${process.env.GOOGLE_STATIC_MAPS_API_KEY}`;
}

/**
 * Calculate distance from property to service area center
 */
export function calculateDistanceFromServiceCenter(lat: number, lng: number): number {
  const centerLat = parseFloat(process.env.SERVICE_AREA_CENTER_LAT || '39.1031');
  const centerLng = parseFloat(process.env.SERVICE_AREA_CENTER_LNG || '-84.5120');

  // Haversine formula for distance in miles
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat - centerLat);
  const dLng = toRad(lng - centerLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(centerLat)) *
      Math.cos(toRad(lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Main function: Complete property lookup
 */
export async function lookupProperty(address: string): Promise<Property> {
  logger.info('Starting property lookup:', { address });

  // Step 1: Geocode address
  const geocode = await geocodeAddress(address);

  // Step 2: Get parcel data (lot size)
  const parcelData = await getParcelData(geocode.lat, geocode.lng);

  // Step 3: Estimate measurements
  let measurements: PropertyMeasurements = {};

  if (parcelData.lotSizeSqft) {
    measurements = estimateLawnArea(parcelData.lotSizeSqft);
  } else {
    // Fallback: Use average residential lot size (10,000 sqft)
    logger.warn('No parcel data available, using default lot size');
    measurements = estimateLawnArea(10000);
  }

  // Step 4: Generate image URLs
  const streetViewUrl = getStreetViewUrl(geocode.lat, geocode.lng);
  const satelliteImageUrl = getSatelliteImageUrl(geocode.lat, geocode.lng);

  // Step 5: Assemble property object
  const property: Property = {
    address,
    formattedAddress: geocode.formattedAddress,
    lat: geocode.lat,
    lng: geocode.lng,
    zipCode: geocode.zipCode,
    city: geocode.city,
    state: geocode.state,
    ...measurements,
    streetViewUrl,
    satelliteImageUrl,
    parcelData: parcelData.rawData,
    propertyType: 'residential',
  };

  logger.info('Property lookup completed:', {
    address: property.formattedAddress,
    lotSizeSqft: property.lotSizeSqft,
    lawnSqft: property.lawnSqft,
  });

  return property;
}
