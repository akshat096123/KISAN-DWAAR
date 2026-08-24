// Service layer for fetching market data and calculating fair price
import axios, { AxiosError, AxiosInstance } from 'axios';
import { CropType, Grade, IMandiPrice, IFairPrice } from '../types';

// ============================================================================
// Configuration & Constants
// ============================================================================

// API Configuration from environment variables
const API_CONFIG = {
  // Agmarknet API (requires registration at agmarknet.gov.in)
  agmarknet: {
    baseUrl: import.meta.env.VITE_AGMARKNET_API_URL || 'https://api.agmarknet.gov.in',
    apiKey: import.meta.env.VITE_AGMARKNET_API_KEY || '',
    timeout: 10000,
    maxRetries: 3,
  },
  // data.gov.in API for MSP and market data
  dataGovIn: {
    baseUrl: import.meta.env.VITE_DATA_GOV_IN_API_URL || 'https://api.data.gov.in',
    apiKey: import.meta.env.VITE_DATA_GOV_IN_API_KEY || '',
    timeout: 10000,
    maxRetries: 3,
  },
  // State-specific mandi APIs (example: Maharashtra, Karnataka)
  stateApis: {
    maharashtra: {
      baseUrl: 'https://msamb.maharashtra.gov.in/api',
      timeout: 10000,
    },
    karnataka: {
      baseUrl: 'https://raitamitra.karnataka.gov.in/api',
      timeout: 10000,
    },
  },
};

// Fallback deterministic prices when all APIs are unavailable
const FALLBACK_MANDI_PRICES: Record<CropType, number> = {
  wheat: 2150,
  rice: 1940,
  moong: 7050,
  masoor: 5100,
  urad: 6000,
  chana: 5100,
  jau: 1850,
  bajra: 2150,
  makai: 1750,
  jowar: 3500,
};

const FALLBACK_MSP: Record<CropType, number> = {
  wheat: 2275,
  rice: 2040,
  moong: 7755,
  masoor: 5500,
  urad: 6600,
  chana: 5335,
  jau: 1975,
  bajra: 2250,
  makai: 1850,
  jowar: 2970,
};

// In-memory cache to reduce API calls (TTL: 1 hour)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const mandiCache = new Map<string, CacheEntry<IMandiPrice[]>>();
const mspCache = new Map<string, CacheEntry<IMSPData>>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ============================================================================
// HTTP Client with Retry Logic
// ============================================================================

function createApiClient(baseUrl: string, timeout: number, maxRetries: number): AxiosInstance {
  const client = axios.create({ baseURL: baseUrl, timeout });
  
  client.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const config = error.config;
      if (!config || !config.headers) return Promise.reject(error);
      
      const retries = (config.headers['x-retry-count'] as number) || 0;
      if (retries >= maxRetries) return Promise.reject(error);
      
      config.headers['x-retry-count'] = retries + 1;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      return client.request(config);
    }
  );
  
  return client;
}

const agmarknetClient = createApiClient(
  API_CONFIG.agmarknet.baseUrl,
  API_CONFIG.agmarknet.timeout,
  API_CONFIG.agmarknet.maxRetries
);

const dataGovInClient = createApiClient(
  API_CONFIG.dataGovIn.baseUrl,
  API_CONFIG.dataGovIn.timeout,
  API_CONFIG.dataGovIn.maxRetries
);

// ============================================================================
// Cache Helpers
// ============================================================================

function getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// Error Reporting
// ============================================================================

interface ApiErrorReport {
  timestamp: string;
  service: string;
  endpoint: string;
  error: string;
  statusCode?: number;
  retryCount: number;
}

function reportError(report: ApiErrorReport): void {
  // In production, send to error tracking service (Sentry, LogRocket, etc.)
  console.error('[MandiService Error]', JSON.stringify(report, null, 2));
  
  // Also store in localStorage for debugging
  try {
    const errors = JSON.parse(localStorage.getItem('mandi-api-errors') || '[]');
    errors.push(report);
    if (errors.length > 100) errors.shift();
    localStorage.setItem('mandi-api-errors', JSON.stringify(errors));
  } catch {
    // Ignore localStorage errors
  }
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Fetch mandi prices for a given crop and market.
 * Tries multiple data sources in order of preference.
 */
export async function fetchMandiPrices(
  crop: CropType,
  market: string,
): Promise<IMandiPrice[]> {
  const cacheKey = `mandi:${crop}:${market}`;
  const cached = getFromCache(mandiCache, cacheKey);
  if (cached) return cached;

  const errors: ApiErrorReport[] = [];

  // 1. Try Agmarknet API (primary source)
  if (API_CONFIG.agmarknet.apiKey) {
    try {
      const response = await agmarknetClient.get<IMandiPrice[]>('/prices', {
        params: { crop, market, api_key: API_CONFIG.agmarknet.apiKey },
      });
      const data = response.data;
      if (data.length > 0) {
        setCache(mandiCache, cacheKey, data);
        return data;
      }
    } catch (error) {
      errors.push({
        timestamp: new Date().toISOString(),
        service: 'agmarknet',
        endpoint: '/prices',
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: (error as AxiosError).response?.status,
        retryCount: 0,
      });
    }
  }

  // 2. Try data.gov.in API
  if (API_CONFIG.dataGovIn.apiKey) {
    try {
      const response = await dataGovInClient.get<IMandiPrice[]>('/mandi/prices', {
        params: { crop, market, api_key: API_CONFIG.dataGovIn.apiKey },
      });
      const data = response.data;
      if (data.length > 0) {
        setCache(mandiCache, cacheKey, data);
        return data;
      }
    } catch (error) {
      errors.push({
        timestamp: new Date().toISOString(),
        service: 'data.gov.in',
        endpoint: '/mandi/prices',
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: (error as AxiosError).response?.status,
        retryCount: 0,
      });
    }
  }

  // 3. Try state-specific APIs based on market location
  const stateApi = getStateApiForMarket(market);
  if (stateApi) {
    try {
      const client = axios.create({ baseURL: stateApi.baseUrl, timeout: stateApi.timeout });
      const response = await client.get<IMandiPrice[]>('/prices', {
        params: { crop, market },
      });
      const data = response.data;
      if (data.length > 0) {
        setCache(mandiCache, cacheKey, data);
        return data;
      }
    } catch (error) {
      errors.push({
        timestamp: new Date().toISOString(),
        service: `state-${stateApi.name}`,
        endpoint: '/prices',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
      });
    }
  }

  // All APIs failed - log errors and return fallback
  errors.forEach(reportError);
  console.warn(`All mandi price APIs failed for ${crop} in ${market}, using fallback`);

  const fallback: IMandiPrice[] = [{
    crop,
    market,
    price: FALLBACK_MANDI_PRICES[crop],
    grade: 'A' as Grade,
    state: getStateForMarket(market),
    date: new Date().toISOString(),
    unit: 'quintal',
  }];
  
  setCache(mandiCache, cacheKey, fallback);
  return fallback;
}

/**
 * Fetch Minimum Support Price (MSP) for a crop in a state.
 * Uses official MSP data from government sources.
 */
export async function fetchMSP(
  crop: CropType,
  state: string,
): Promise<IMSPData> {
  const cacheKey = `msp:${crop}:${state}`;
  const cached = getFromCache(mspCache, cacheKey);
  if (cached) return cached;

  const errors: ApiErrorReport[] = [];

  // 1. Try data.gov.in MSP dataset
  if (API_CONFIG.dataGovIn.apiKey) {
    try {
      const response = await dataGovInClient.get<IMSPData>('/msp', {
        params: { crop, state, api_key: API_CONFIG.dataGovIn.apiKey },
      });
      const data = response.data;
      if (data) {
        setCache(mspCache, cacheKey, data);
        return data;
      }
    } catch (error) {
      errors.push({
        timestamp: new Date().toISOString(),
        service: 'data.gov.in',
        endpoint: '/msp',
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: (error as AxiosError).response?.status,
        retryCount: 0,
      });
    }
  }

  // 2. Try official DACNET MSP API
  try {
    const response = await axios.get<IMSPData>('https://api.dacnet.nic.in/msp', {
      params: { crop, state },
      timeout: 10000,
    });
    const data = response.data;
    if (data) {
      setCache(mspCache, cacheKey, data);
      return data;
    }
  } catch (error) {
    errors.push({
      timestamp: new Date().toISOString(),
      service: 'dacnet',
      endpoint: '/msp',
      error: error instanceof Error ? error.message : 'Unknown error',
      retryCount: 0,
    });
  }

  // All APIs failed - log and return fallback
  errors.forEach(reportError);
  console.warn(`All MSP APIs failed for ${crop} in ${state}, using fallback`);

  const fallback: IMSPData = {
    crop,
    state,
    msp: FALLBACK_MSP[crop] ?? 0,
    date: new Date().toISOString(),
  };
  
  setCache(mspCache, cacheKey, fallback);
  return fallback;
}

/**
 * Predict a fair price by combining mandi prices and MSP.
 * Implements a weighted average with confidence scoring.
 */
export async function predictFairPrice(
  crop: CropType,
  location: string,
): Promise<IFairPrice> {
  // Location is used as market for mandi and state for MSP
  const [mandiPrices, mspData] = await Promise.all([
    fetchMandiPrices(crop, location),
    fetchMSP(crop, location),
  ]);

  // Calculate weighted average mandi price
  const weightedMandi = mandiPrices.length > 0
    ? mandiPrices.reduce((sum, p) => sum + p.price, 0) / mandiPrices.length
    : FALLBACK_MANDI_PRICES[crop] ?? 0;

  const msp = mspData?.msp ?? FALLBACK_MSP[crop] ?? 0;

  // Weighted fair price: 60% mandi, 40% MSP (adjustable)
  const fairPrice = Math.round(0.6 * weightedMandi + 0.4 * msp);

  // Confidence based on data freshness and source count
  const confidence = calculateConfidence(mandiPrices, mspData);

  return {
    crop,
    location,
    fairPrice,
    mandiPrice: Math.round(weightedMandi),
    msp,
    confidence,
    reason: `Weighted average: 60% mandi (₹${Math.round(weightedMandi)}) + 40% MSP (₹${msp})`,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

interface IMSPData {
  crop: CropType;
  state: string;
  msp: number;
  date: string;
}

function calculateConfidence(mandiPrices: IMandiPrice[], mspData: IMSPData): number {
  let confidence = 0.5; // Base confidence
  
  // Increase confidence with more mandi data points
  if (mandiPrices.length >= 3) confidence += 0.2;
  else if (mandiPrices.length >= 1) confidence += 0.1;
  
  // Increase confidence with valid MSP data
  if (mspData && mspData.msp > 0) confidence += 0.2;
  
  // Check data freshness (within 7 days)
  const now = Date.now();
  const freshMandi = mandiPrices.some(p => 
    now - new Date(p.date).getTime() < 7 * 24 * 60 * 60 * 1000
  );
  if (freshMandi) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

function getStateApiForMarket(market: string): { name: string; baseUrl: string; timeout: number } | null {
  const marketLower = market.toLowerCase();
  if (marketLower.includes('maharashtra') || marketLower.includes('mumbai') || marketLower.includes('pune')) {
    return { name: 'maharashtra', baseUrl: API_CONFIG.stateApis.maharashtra.baseUrl, timeout: API_CONFIG.stateApis.maharashtra.timeout };
  }
  if (marketLower.includes('karnataka') || marketLower.includes('bangalore') || marketLower.includes('mysore')) {
    return { name: 'karnataka', baseUrl: API_CONFIG.stateApis.karnataka.baseUrl, timeout: API_CONFIG.stateApis.karnataka.timeout };
  }
  return null;
}

function getStateForMarket(market: string): string {
  const marketLower = market.toLowerCase();
  if (marketLower.includes('maharashtra') || marketLower.includes('mumbai') || marketLower.includes('pune')) return 'Maharashtra';
  if (marketLower.includes('karnataka') || marketLower.includes('bangalore') || marketLower.includes('mysore')) return 'Karnataka';
  if (marketLower.includes('punjab') || marketLower.includes('ludhiana')) return 'Punjab';
  if (marketLower.includes('haryana') || marketLower.includes('hisar')) return 'Haryana';
  if (marketLower.includes('uttar pradesh') || marketLower.includes('lucknow')) return 'Uttar Pradesh';
  if (marketLower.includes('madhya pradesh') || marketLower.includes('indore')) return 'Madhya Pradesh';
  return 'Unknown';
}

// ============================================================================
// Utility Functions for Debugging
// ============================================================================

/** Clear all cached data */
export function clearMandiCache(): void {
  mandiCache.clear();
  mspCache.clear();
}

/** Get stored API error reports for debugging */
export function getApiErrorReports(): ApiErrorReport[] {
  try {
    return JSON.parse(localStorage.getItem('mandi-api-errors') || '[]');
  } catch {
    return [];
  }
}

/** Clear error reports */
export function clearApiErrorReports(): void {
  localStorage.removeItem('mandi-api-errors');
}

/** Get cache statistics */
export function getCacheStats(): { mandiEntries: number; mspEntries: number } {
  return {
    mandiEntries: mandiCache.size,
    mspEntries: mspCache.size,
  };
}