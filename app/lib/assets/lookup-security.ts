// Security lookup service using NSE/BSE APIs
// Provides deterministic classification based on ISIN/ticker codes

import { NseIndia } from 'stock-nse-india';
import { SecurityType, AssetClass } from './types';

const nse = new NseIndia();

/**
 * Security lookup result from API
 */
export interface SecurityLookupResult {
  found: boolean;
  security_name?: string;
  security_type: SecurityType;
  asset_class: AssetClass;
  asset_subclass: string;
  exchange?: string;
  sector?: string;
  market_cap?: string; // 'large_cap', 'mid_cap', 'small_cap'
  confidence: number; // 0.95 for API-verified, 0 for not found
}

/**
 * Map NSE security type to our SecurityType
 */
function mapSecurityType(nseType: string): SecurityType {
  const normalized = nseType?.toLowerCase() || '';

  if (normalized.includes('equity') || normalized.includes('stock')) {
    return 'equity';
  }
  if (normalized.includes('mutual fund') || normalized.includes('mf')) {
    return 'mutual_fund';
  }
  if (normalized.includes('bond') || normalized.includes('debt')) {
    return 'bond';
  }
  if (normalized.includes('etf') || normalized.includes('exchange traded')) {
    return 'etf';
  }
  if (normalized.includes('gold') || normalized.includes('silver') || normalized.includes('commodity')) {
    return 'commodity';
  }

  return 'unknown';
}

/**
 * Determine asset subclass based on security details
 */
function determineSubclass(
  securityType: SecurityType,
  sector?: string,
  marketCap?: string,
  securityName?: string
): { asset_class: AssetClass; asset_subclass: string } {
  const name = securityName?.toLowerCase() || '';
  const sectorLower = sector?.toLowerCase() || '';

  // EQUITY - Direct Stocks
  if (securityType === 'equity') {
    // Check if it's an index fund (contains index name)
    if (name.includes('nifty') || name.includes('sensex') || name.includes('index')) {
      return { asset_class: 'equity', asset_subclass: 'index_funds' };
    }

    // Sectoral/thematic based on sector
    if (
      sectorLower.includes('pharma') ||
      sectorLower.includes('it') ||
      sectorLower.includes('bank') ||
      sectorLower.includes('infrastructure') ||
      sectorLower.includes('energy')
    ) {
      return { asset_class: 'equity', asset_subclass: 'sectoral_funds' };
    }

    // Market cap-based classification
    if (marketCap === 'large_cap') {
      return { asset_class: 'equity', asset_subclass: 'large_cap_funds' };
    }
    if (marketCap === 'mid_cap') {
      return { asset_class: 'equity', asset_subclass: 'mid_cap_funds' };
    }
    if (marketCap === 'small_cap') {
      return { asset_class: 'equity', asset_subclass: 'small_cap_funds' };
    }

    // Default to direct stocks
    return { asset_class: 'equity', asset_subclass: 'direct_stocks' };
  }

  // EQUITY - Mutual Funds
  if (securityType === 'mutual_fund') {
    // ELSS (tax saver)
    if (name.includes('elss') || name.includes('tax saver') || name.includes('80c')) {
      return { asset_class: 'equity', asset_subclass: 'elss' };
    }

    // Index funds
    if (name.includes('index') || name.includes('nifty') || name.includes('sensex')) {
      return { asset_class: 'equity', asset_subclass: 'index_funds' };
    }

    // Sectoral/thematic
    if (
      name.includes('pharma') ||
      name.includes('technology') ||
      name.includes('banking') ||
      name.includes('infrastructure') ||
      name.includes('sector')
    ) {
      return { asset_class: 'equity', asset_subclass: 'sectoral_funds' };
    }

    // Market cap-based
    if (name.includes('large cap') || name.includes('largecap') || name.includes('bluechip')) {
      return { asset_class: 'equity', asset_subclass: 'large_cap_funds' };
    }
    if (name.includes('mid cap') || name.includes('midcap')) {
      return { asset_class: 'equity', asset_subclass: 'mid_cap_funds' };
    }
    if (name.includes('small cap') || name.includes('smallcap')) {
      return { asset_class: 'equity', asset_subclass: 'small_cap_funds' };
    }

    // International
    if (
      name.includes('international') ||
      name.includes('global') ||
      name.includes('us equity') ||
      name.includes('nasdaq')
    ) {
      return { asset_class: 'equity', asset_subclass: 'international_equity' };
    }

    // Default to large cap funds (safest assumption for unclassified MF)
    return { asset_class: 'equity', asset_subclass: 'large_cap_funds' };
  }

  // ETF - Typically equity-based in India
  if (securityType === 'etf') {
    if (name.includes('gold') || name.includes('silver')) {
      return { asset_class: 'other', asset_subclass: 'physical_gold' };
    }
    // Most ETFs in India are equity index ETFs
    return { asset_class: 'equity', asset_subclass: 'index_funds' };
  }

  // DEBT - Bonds
  if (securityType === 'bond') {
    if (name.includes('government') || name.includes('g-sec') || name.includes('sovereign')) {
      return { asset_class: 'debt', asset_subclass: 'government_bonds' };
    }
    if (name.includes('corporate')) {
      return { asset_class: 'debt', asset_subclass: 'corporate_bonds' };
    }
    return { asset_class: 'debt', asset_subclass: 'bonds' };
  }

  // COMMODITY - Gold/Silver
  if (securityType === 'commodity') {
    return { asset_class: 'other', asset_subclass: 'physical_gold' };
  }

  // Unknown - fall back to AI classification
  return { asset_class: 'equity', asset_subclass: 'direct_stocks' };
}

/**
 * Lookup security by ISIN code
 * Returns classification details if found
 */
export async function lookupByIsin(isin: string): Promise<SecurityLookupResult> {
  try {
    console.log(`🔍 Looking up ISIN: ${isin}`);

    // The stock-nse-india package doesn't have direct ISIN lookup
    // But we can try to search by symbol derived from ISIN
    // ISIN format: INE002A01018
    // First 3 chars = country (IND/INE), next 6 = issuer, next 2 = security type, last 1 = check digit

    // For Indian ISINs, we can identify the type:
    // INE* = Equity securities
    // INF* = Mutual fund units
    // IN0* = Government securities
    const isinPrefix = isin.substring(0, 3);

    let securityType: SecurityType = 'unknown';
    if (isinPrefix === 'INE') {
      securityType = 'equity';
    } else if (isinPrefix === 'INF') {
      securityType = 'mutual_fund';
    } else if (isinPrefix === 'IN0' || isinPrefix === 'IN9') {
      securityType = 'bond';
    }

    // If we identified the security type, we can provide basic classification
    if (securityType !== 'unknown') {
      const classification = determineSubclass(securityType, undefined, undefined, undefined);

      return {
        found: true,
        security_type: securityType,
        asset_class: classification.asset_class,
        asset_subclass: classification.asset_subclass,
        confidence: 0.85, // Good confidence from ISIN prefix, but no detailed info
      };
    }

    return {
      found: false,
      security_type: 'unknown',
      asset_class: 'equity',
      asset_subclass: 'direct_stocks',
      confidence: 0,
    };
  } catch (error) {
    console.error('ISIN lookup error:', error);
    return {
      found: false,
      security_type: 'unknown',
      asset_class: 'equity',
      asset_subclass: 'direct_stocks',
      confidence: 0,
    };
  }
}

/**
 * Lookup security by ticker symbol
 * Uses NSE API for live data
 */
export async function lookupByTicker(
  ticker: string,
  exchange: string = 'NSE'
): Promise<SecurityLookupResult> {
  try {
    console.log(`🔍 Looking up ticker: ${ticker} on ${exchange}`);

    // Fetch equity details from NSE
    const equityDetails = await nse.getEquityDetails(ticker);

    if (equityDetails && equityDetails.info) {
      const info = equityDetails.info;
      const securityName = info.companyName || info.symbol || ticker;
      const industry = info.industry || '';

      // Determine security type (most NSE stocks are equity)
      const securityType: SecurityType = 'equity';

      // Determine market cap category
      let marketCap: string | undefined;
      if (info.isNifty50 || info.isNifty100) {
        marketCap = 'large_cap';
      } else if (info.isNifty200) {
        marketCap = 'mid_cap';
      } else {
        marketCap = 'small_cap';
      }

      const classification = determineSubclass(securityType, industry, marketCap, securityName);

      return {
        found: true,
        security_name: securityName,
        security_type: securityType,
        asset_class: classification.asset_class,
        asset_subclass: classification.asset_subclass,
        exchange: exchange,
        sector: industry,
        market_cap: marketCap,
        confidence: 0.95, // High confidence from API
      };
    }

    // Try to fetch as index
    try {
      const indexDetails = await nse.getIndexDetails(ticker);
      if (indexDetails) {
        return {
          found: true,
          security_name: ticker,
          security_type: 'equity',
          asset_class: 'equity',
          asset_subclass: 'index_funds',
          exchange: 'NSE',
          confidence: 0.95,
        };
      }
    } catch (indexError) {
      // Not an index, continue
    }

    return {
      found: false,
      security_type: 'unknown',
      asset_class: 'equity',
      asset_subclass: 'direct_stocks',
      confidence: 0,
    };
  } catch (error) {
    console.error('Ticker lookup error:', error);
    return {
      found: false,
      security_type: 'unknown',
      asset_class: 'equity',
      asset_subclass: 'direct_stocks',
      confidence: 0,
    };
  }
}

/**
 * Main lookup function - tries ISIN first, then ticker
 */
export async function lookupSecurity(
  isin?: string,
  ticker?: string,
  exchange?: string
): Promise<SecurityLookupResult> {
  // Try ISIN lookup first (more accurate)
  if (isin && isin.length >= 10) {
    const result = await lookupByIsin(isin);
    if (result.found) {
      return result;
    }
  }

  // Fall back to ticker lookup
  if (ticker && ticker.length > 0) {
    const result = await lookupByTicker(ticker, exchange);
    if (result.found) {
      return result;
    }
  }

  // Not found via any method
  return {
    found: false,
    security_type: 'unknown',
    asset_class: 'equity',
    asset_subclass: 'direct_stocks',
    confidence: 0,
  };
}

/**
 * Batch lookup for multiple securities
 * Includes rate limiting to avoid API throttling
 */
export async function lookupSecuritiesBatch(
  securities: Array<{ isin?: string; ticker?: string; exchange?: string }>
): Promise<SecurityLookupResult[]> {
  const results: SecurityLookupResult[] = [];
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (const security of securities) {
    const result = await lookupSecurity(security.isin, security.ticker, security.exchange);
    results.push(result);

    // Rate limiting: 100ms between requests to avoid overwhelming API
    await delay(100);
  }

  return results;
}
