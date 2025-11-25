-- Migration: Add Asset Tracking System
-- Description: Adds comprehensive asset tracking with sub-classes, snapshots, and historical returns
-- Date: 2025-11-24

-- ============================================================================
-- 1. Asset Snapshots Table
-- ============================================================================
-- Stores periodic net worth snapshots (created on each upload or manual update)

CREATE TABLE IF NOT EXISTS asset_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  total_networth NUMERIC(15, 2) NOT NULL,

  -- High-level category totals (for backward compatibility with user_profiles)
  equity_total NUMERIC(15, 2) DEFAULT 0,
  debt_total NUMERIC(15, 2) DEFAULT 0,
  cash_total NUMERIC(15, 2) DEFAULT 0,
  real_estate_total NUMERIC(15, 2) DEFAULT 0,
  other_assets_total NUMERIC(15, 2) DEFAULT 0,

  -- Metadata
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'manual', 'system')),
  source_files TEXT[], -- Array of uploaded file names
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, snapshot_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_snapshots_user_date
  ON asset_snapshots(user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_asset_snapshots_user_latest
  ON asset_snapshots(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE asset_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON asset_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON asset_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
  ON asset_snapshots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON asset_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_asset_snapshot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_snapshots_updated_at
  BEFORE UPDATE ON asset_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_snapshot_updated_at();

-- ============================================================================
-- 2. Asset Sub-Class Mapping Table
-- ============================================================================
-- Defines sub-class taxonomy with risk/return profiles and AI classification rules

CREATE TABLE IF NOT EXISTS asset_subclass_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_class TEXT NOT NULL CHECK (asset_class IN ('equity', 'debt', 'cash', 'real_estate', 'other')),
  subclass_code TEXT NOT NULL, -- e.g., 'direct_stocks', 'index_funds'
  subclass_display_name TEXT NOT NULL, -- e.g., 'Direct Stocks', 'Index Funds'
  risk_level TEXT NOT NULL CHECK (risk_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  expected_return_range TEXT, -- e.g., "12-15%", "6-7%"
  expected_return_midpoint NUMERIC(5, 2), -- e.g., 13.5 for "12-15%"

  -- AI mapping rules (keywords for classification)
  keyword_patterns TEXT[], -- e.g., ['index', 'nifty', 'sensex']

  -- Display and metadata
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(subclass_code),
  UNIQUE(asset_class, subclass_code)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_asset_subclass_mapping_class
  ON asset_subclass_mapping(asset_class, sort_order);

-- RLS: Allow all authenticated users to read sub-class mappings
ALTER TABLE asset_subclass_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sub-class mappings"
  ON asset_subclass_mapping FOR SELECT
  TO authenticated
  USING (TRUE);

-- ============================================================================
-- 3. Assets Table
-- ============================================================================
-- Stores individual asset holdings linked to snapshots

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES asset_snapshots(id) ON DELETE CASCADE,

  -- Asset details
  asset_name TEXT NOT NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN ('equity', 'debt', 'cash', 'real_estate', 'other')),
  asset_subclass TEXT NOT NULL, -- References subclass_code in asset_subclass_mapping

  -- Financial data
  current_value NUMERIC(15, 2) NOT NULL CHECK (current_value >= 0),
  quantity NUMERIC(15, 4), -- Optional: for stocks/MF units
  purchase_price NUMERIC(15, 2), -- Optional: for gains calculation
  purchase_date DATE, -- Optional: for LTCG/STCG calculation

  -- Risk/return profile (computed from subclass)
  risk_level TEXT CHECK (risk_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  expected_return_percentage NUMERIC(5, 2), -- e.g., 12.50 for 12.5%

  -- Metadata
  source_file TEXT, -- Which file this came from
  ai_confidence_score NUMERIC(3, 2) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1), -- 0.0 to 1.0
  is_manually_verified BOOLEAN DEFAULT FALSE,
  is_duplicate BOOLEAN DEFAULT FALSE, -- Marked as duplicate during review
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_user_snapshot
  ON assets(user_id, snapshot_id);

CREATE INDEX IF NOT EXISTS idx_assets_class_subclass
  ON assets(asset_class, asset_subclass);

CREATE INDEX IF NOT EXISTS idx_assets_snapshot
  ON assets(snapshot_id);

-- RLS Policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assets"
  ON assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assets"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
  ON assets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
  ON assets FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_asset_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_updated_at();

-- ============================================================================
-- 4. Asset Sub-Class Returns Table
-- ============================================================================
-- Stores historical return data for each sub-class by year

CREATE TABLE IF NOT EXISTS asset_subclass_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subclass_code TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  annual_return_percentage NUMERIC(8, 2) NOT NULL, -- e.g., 12.50 for 12.5%, can be negative (allows up to 999999.99 for volatile assets)
  data_source TEXT NOT NULL, -- 'NSE', 'AMFI', 'RBI', 'manual', etc.
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(subclass_code, year)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_asset_subclass_returns_code_year
  ON asset_subclass_returns(subclass_code, year DESC);

-- RLS: Allow all authenticated users to read historical returns
ALTER TABLE asset_subclass_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sub-class returns"
  ON asset_subclass_returns FOR SELECT
  TO authenticated
  USING (TRUE);

-- ============================================================================
-- 5. Upload Logs Table
-- ============================================================================
-- Tracks file uploads and AI processing for debugging and cost monitoring

CREATE TABLE IF NOT EXISTS upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('pdf', 'csv', 'xlsx', 'other')),
  file_size_bytes INTEGER,

  -- Processing status
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  assets_extracted INTEGER DEFAULT 0,
  duplicates_found INTEGER DEFAULT 0,
  processing_time_ms INTEGER,

  -- AI metrics
  ai_model_used TEXT, -- 'gpt-4-vision-preview', 'gpt-4o-mini'
  total_tokens_used INTEGER,
  api_cost NUMERIC(10, 4), -- Cost in USD

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_upload_logs_user_created
  ON upload_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_upload_logs_status
  ON upload_logs(status, created_at DESC);

-- RLS Policies
ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own upload logs"
  ON upload_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upload logs"
  ON upload_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. Seed Data: Asset Sub-Class Mappings
-- ============================================================================
-- Instrument-based taxonomy (Option A from analysis)

-- EQUITY SUB-CLASSES
INSERT INTO asset_subclass_mapping
  (asset_class, subclass_code, subclass_display_name, risk_level, expected_return_range, expected_return_midpoint, keyword_patterns, description, sort_order)
VALUES
  -- Equity
  ('equity', 'direct_stocks', 'Direct Stocks', 'high', '14-18%', 16.0,
   ARRAY['stock', 'share', 'equity', 'ltd', 'limited', 'bse', 'nse', 'reliance', 'tcs', 'hdfc bank', 'infosys', 'wipro'],
   'Individual company stocks traded on NSE/BSE', 1),

  ('equity', 'index_funds', 'Index Funds', 'medium', '11-13%', 12.0,
   ARRAY['index', 'nifty', 'sensex', 'nifty 50', 'nifty50', 'nifty next 50', 'midcap 150', 'smallcap 250', 'index fund'],
   'Passive funds tracking market indices (Nifty, Sensex, etc.)', 2),

  ('equity', 'equity_mutual_funds', 'Actively Managed Equity Funds', 'high', '12-16%', 14.0,
   ARRAY['mutual fund', 'mf', 'equity fund', 'flexi', 'flexicap', 'large cap', 'mid cap', 'small cap', 'multi cap', 'bluechip', 'growth', 'parag parikh', 'axis', 'icici pru'],
   'Active equity mutual funds (flexi-cap, large-cap, multi-cap)', 3),

  ('equity', 'sectoral_funds', 'Sectoral/Thematic Funds', 'very_high', '15-20%', 17.5,
   ARRAY['sectoral', 'sector', 'thematic', 'theme', 'banking', 'pharma', 'it', 'technology', 'infrastructure', 'consumption', 'esg', 'momentum'],
   'Sector-specific or thematic equity funds (higher risk, higher potential)', 4),

  ('equity', 'international_equity', 'International Equity', 'high', '10-15%', 12.5,
   ARRAY['international', 'global', 'us', 'nasdaq', 's&p', 'sp500', 'emerging', 'developed', 'foreign', 'overseas'],
   'International/global equity funds (currency risk applies)', 5);

-- DEBT SUB-CLASSES
INSERT INTO asset_subclass_mapping
  (asset_class, subclass_code, subclass_display_name, risk_level, expected_return_range, expected_return_midpoint, keyword_patterns, description, sort_order)
VALUES
  ('debt', 'liquid_overnight', 'Liquid & Overnight Funds', 'very_low', '6-7%', 6.5,
   ARRAY['liquid', 'overnight', 'money market', 'ultra short', 'liquid fund', 'cash fund'],
   'Ultra-short duration funds for emergency corpus (T+1 liquidity)', 1),

  ('debt', 'short_duration', 'Short Duration Debt Funds', 'low', '7-8%', 7.5,
   ARRAY['short term', 'short duration', 'low duration', 'corporate bond', 'banking psus'],
   'Debt funds with duration < 3 years (low interest rate risk)', 2),

  ('debt', 'medium_long_duration', 'Medium/Long Duration Debt Funds', 'medium', '8-9%', 8.5,
   ARRAY['medium duration', 'long duration', 'gilt', 'government securities', 'g-sec', 'dynamic bond'],
   'Debt funds with duration > 3 years (higher returns, higher risk)', 3),

  ('debt', 'fixed_income', 'Fixed Income Instruments', 'low', '7-8%', 7.5,
   ARRAY['fixed deposit', 'fd', 'ppf', 'epf', 'provident fund', 'nsc', 'national savings', 'bonds', 'debenture', 'corporate fd'],
   'Fixed deposits, PPF, EPF, NSC, bonds (locked-in tenure)', 4),

  ('debt', 'arbitrage_hybrid', 'Arbitrage & Hybrid Funds', 'low', '8-10%', 9.0,
   ARRAY['arbitrage', 'hybrid', 'balanced advantage', 'dynamic asset', 'income', 'equity savings'],
   'Arbitrage or hybrid debt funds (tax-efficient, equity-like taxation)', 5);

-- CASH SUB-CLASSES
INSERT INTO asset_subclass_mapping
  (asset_class, subclass_code, subclass_display_name, risk_level, expected_return_range, expected_return_midpoint, keyword_patterns, description, sort_order)
VALUES
  ('cash', 'savings_account', 'Bank Savings Accounts', 'very_low', '3-4%', 3.5,
   ARRAY['savings', 'bank account', 'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'savings account', 'salary account'],
   'Regular bank savings accounts (instant liquidity, low returns)', 1),

  ('cash', 'fixed_deposits', 'Fixed Deposits', 'very_low', '6-7%', 6.5,
   ARRAY['fixed deposit', 'fd', 'bank fd', 'term deposit', 'recurring deposit', 'rd'],
   'Bank fixed deposits (locked tenure, FDIC insured)', 2);

-- REAL ESTATE SUB-CLASSES
INSERT INTO asset_subclass_mapping
  (asset_class, subclass_code, subclass_display_name, risk_level, expected_return_range, expected_return_midpoint, keyword_patterns, description, sort_order)
VALUES
  ('real_estate', 'residential', 'Residential Property', 'medium', '8-12%', 10.0,
   ARRAY['house', 'apartment', 'flat', 'residential', 'home', 'villa', 'plot', 'land'],
   'Residential real estate (house, apartment, land)', 1),

  ('real_estate', 'commercial', 'Commercial Property', 'medium', '10-14%', 12.0,
   ARRAY['commercial', 'office', 'retail', 'shop', 'warehouse', 'industrial'],
   'Commercial real estate (office, retail, industrial)', 2),

  ('real_estate', 'reits', 'REITs', 'medium', '8-10%', 9.0,
   ARRAY['reit', 'real estate investment trust', 'embassy', 'mindspace', 'brookfield'],
   'Real Estate Investment Trusts (liquid, exchange-traded)', 3);

-- OTHER ASSETS SUB-CLASSES
INSERT INTO asset_subclass_mapping
  (asset_class, subclass_code, subclass_display_name, risk_level, expected_return_range, expected_return_midpoint, keyword_patterns, description, sort_order)
VALUES
  ('other', 'gold', 'Gold (Physical/Digital)', 'medium', '8-10%', 9.0,
   ARRAY['gold', 'sovereign gold bond', 'sgb', 'digital gold', 'gold etf', 'gold fund', 'gold coin', 'jewellery'],
   'Gold investments (physical, digital, SGB, ETF)', 1),

  ('other', 'cryptocurrency', 'Cryptocurrency', 'very_high', 'Highly Volatile', NULL,
   ARRAY['crypto', 'cryptocurrency', 'bitcoin', 'btc', 'ethereum', 'eth', 'altcoin', 'blockchain'],
   'Cryptocurrency investments (extremely high risk/return)', 2),

  ('other', 'alternative', 'Alternative Investments', 'high', 'Varies', NULL,
   ARRAY['p2p', 'peer to peer', 'startup', 'angel', 'venture', 'collectible', 'art', 'wine'],
   'P2P lending, startups, angel investments, collectibles', 3),

  ('other', 'other_assets', 'Other Assets', 'low', 'N/A', NULL,
   ARRAY['vehicle', 'car', 'bike', 'other', 'misc', 'miscellaneous'],
   'Vehicles, deprecating assets, miscellaneous', 4);

-- ============================================================================
-- 7. Seed Data: Historical Returns (Conservative Estimates)
-- ============================================================================
-- 10-year historical returns (2015-2024) - Conservative defaults based on Indian market data

-- Direct Stocks (NSE Nifty 500 TRI as proxy)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('direct_stocks', 2024, 15.20, 'manual', 'Conservative estimate based on Nifty 500 TRI'),
  ('direct_stocks', 2023, 18.50, 'manual', 'Strong year for Indian equities'),
  ('direct_stocks', 2022, -3.20, 'manual', 'Market correction year'),
  ('direct_stocks', 2021, 25.10, 'manual', 'Post-COVID recovery'),
  ('direct_stocks', 2020, 12.80, 'manual', 'COVID year, volatile'),
  ('direct_stocks', 2019, 14.30, 'manual', 'Stable growth year'),
  ('direct_stocks', 2018, -5.90, 'manual', 'Market correction'),
  ('direct_stocks', 2017, 28.40, 'manual', 'Strong bull run'),
  ('direct_stocks', 2016, 3.80, 'manual', 'Demonetization impact'),
  ('direct_stocks', 2015, -4.10, 'manual', 'Weak year for markets');

-- Index Funds (Nifty 50 TRI as proxy)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('index_funds', 2024, 12.80, 'manual', 'Nifty 50 TRI performance'),
  ('index_funds', 2023, 18.20, 'manual', 'Strong year for large caps'),
  ('index_funds', 2022, -1.80, 'manual', 'Correction year'),
  ('index_funds', 2021, 23.40, 'manual', 'Post-pandemic rally'),
  ('index_funds', 2020, 14.90, 'manual', 'Recovery from COVID lows'),
  ('index_funds', 2019, 12.00, 'manual', 'Steady growth'),
  ('index_funds', 2018, -3.50, 'manual', 'Market pullback'),
  ('index_funds', 2017, 27.90, 'manual', 'Excellent year for large caps'),
  ('index_funds', 2016, 4.10, 'manual', 'Modest returns'),
  ('index_funds', 2015, -3.70, 'manual', 'Weak year');

-- Equity Mutual Funds (Actively Managed - Conservative)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('equity_mutual_funds', 2024, 14.50, 'manual', 'Active equity fund average'),
  ('equity_mutual_funds', 2023, 20.10, 'manual', 'Outperformance in bull market'),
  ('equity_mutual_funds', 2022, -2.50, 'manual', 'Slightly worse than index'),
  ('equity_mutual_funds', 2021, 26.30, 'manual', 'Strong active management year'),
  ('equity_mutual_funds', 2020, 13.20, 'manual', 'Mixed performance'),
  ('equity_mutual_funds', 2019, 13.80, 'manual', 'Modest alpha generation'),
  ('equity_mutual_funds', 2018, -5.20, 'manual', 'Underperformance in down market'),
  ('equity_mutual_funds', 2017, 30.50, 'manual', 'Alpha generation in bull run'),
  ('equity_mutual_funds', 2016, 3.20, 'manual', 'Modest returns'),
  ('equity_mutual_funds', 2015, -5.00, 'manual', 'Weak year');

-- Sectoral Funds (Higher volatility)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('sectoral_funds', 2024, 18.70, 'manual', 'Sector rotation benefits'),
  ('sectoral_funds', 2023, 25.30, 'manual', 'IT/Banking sectors strong'),
  ('sectoral_funds', 2022, -8.50, 'manual', 'High volatility in correction'),
  ('sectoral_funds', 2021, 32.10, 'manual', 'Thematic outperformance'),
  ('sectoral_funds', 2020, 15.40, 'manual', 'Pharma/IT sectors strong'),
  ('sectoral_funds', 2019, 16.20, 'manual', 'Sector-specific gains'),
  ('sectoral_funds', 2018, -10.30, 'manual', 'Underperformance in bear market'),
  ('sectoral_funds', 2017, 35.80, 'manual', 'Strong sectoral trends'),
  ('sectoral_funds', 2016, 2.10, 'manual', 'Mixed sector performance'),
  ('sectoral_funds', 2015, -8.70, 'manual', 'Weak across sectors');

-- International Equity (S&P 500 as proxy, adjusted for INR depreciation)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('international_equity', 2024, 11.20, 'manual', 'US markets + currency gains'),
  ('international_equity', 2023, 14.80, 'manual', 'Strong US tech rally'),
  ('international_equity', 2022, -5.40, 'manual', 'Bear market in US'),
  ('international_equity', 2021, 18.50, 'manual', 'Post-pandemic US rally'),
  ('international_equity', 2020, 10.30, 'manual', 'COVID recovery began'),
  ('international_equity', 2019, 15.70, 'manual', 'Strong US markets'),
  ('international_equity', 2018, -8.20, 'manual', 'US correction'),
  ('international_equity', 2017, 12.40, 'manual', 'Steady US growth'),
  ('international_equity', 2016, 7.80, 'manual', 'Trump rally began'),
  ('international_equity', 2015, -3.50, 'manual', 'Weak year for emerging markets');

-- Liquid & Overnight Funds
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('liquid_overnight', 2024, 6.80, 'manual', 'Repo rate at 6.5%'),
  ('liquid_overnight', 2023, 7.10, 'manual', 'Higher interest rate regime'),
  ('liquid_overnight', 2022, 4.20, 'manual', 'Rates rising from lows'),
  ('liquid_overnight', 2021, 3.50, 'manual', 'Low interest rate environment'),
  ('liquid_overnight', 2020, 3.80, 'manual', 'RBI rate cuts'),
  ('liquid_overnight', 2019, 6.50, 'manual', 'Moderate rate environment'),
  ('liquid_overnight', 2018, 6.90, 'manual', 'Stable rates'),
  ('liquid_overnight', 2017, 6.60, 'manual', 'Demonetization aftermath'),
  ('liquid_overnight', 2016, 7.20, 'manual', 'Higher repo rates'),
  ('liquid_overnight', 2015, 7.50, 'manual', 'Pre-rate cut era');

-- Short Duration Debt Funds
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('short_duration', 2024, 7.50, 'manual', 'Short duration debt performance'),
  ('short_duration', 2023, 7.80, 'manual', 'Benefited from rate hikes'),
  ('short_duration', 2022, 4.80, 'manual', 'Rising rate environment'),
  ('short_duration', 2021, 4.30, 'manual', 'Low rates'),
  ('short_duration', 2020, 5.10, 'manual', 'Rate cuts helped'),
  ('short_duration', 2019, 7.30, 'manual', 'Stable environment'),
  ('short_duration', 2018, 7.60, 'manual', 'Corporate bond spreads'),
  ('short_duration', 2017, 7.40, 'manual', 'Steady returns'),
  ('short_duration', 2016, 8.10, 'manual', 'Pre-demonetization'),
  ('short_duration', 2015, 8.50, 'manual', 'Higher rate regime');

-- Medium/Long Duration Debt (more volatile)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('medium_long_duration', 2024, 8.20, 'manual', 'Duration play benefits'),
  ('medium_long_duration', 2023, 6.50, 'manual', 'Rate hike impact'),
  ('medium_long_duration', 2022, 2.10, 'manual', 'Duration risk hit'),
  ('medium_long_duration', 2021, 5.80, 'manual', 'Rates at bottom'),
  ('medium_long_duration', 2020, 9.40, 'manual', 'Rally from rate cuts'),
  ('medium_long_duration', 2019, 8.70, 'manual', 'Duration gains'),
  ('medium_long_duration', 2018, 6.20, 'manual', 'Mixed duration impact'),
  ('medium_long_duration', 2017, 8.30, 'manual', 'Good year for gilt'),
  ('medium_long_duration', 2016, 10.50, 'manual', 'Rate cut expectations'),
  ('medium_long_duration', 2015, 7.80, 'manual', 'Moderate returns');

-- Fixed Income (PPF, FD, EPF - averaged)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('fixed_income', 2024, 7.30, 'manual', 'PPF at 7.1%, FDs at 7-8%'),
  ('fixed_income', 2023, 7.10, 'manual', 'Stable fixed income rates'),
  ('fixed_income', 2022, 6.80, 'manual', 'Rates began rising'),
  ('fixed_income', 2021, 6.50, 'manual', 'Low rate environment'),
  ('fixed_income', 2020, 7.10, 'manual', 'PPF cut to 7.1%'),
  ('fixed_income', 2019, 7.90, 'manual', 'Higher PPF rates'),
  ('fixed_income', 2018, 7.80, 'manual', 'Stable rates'),
  ('fixed_income', 2017, 7.90, 'manual', 'Good fixed income year'),
  ('fixed_income', 2016, 8.10, 'manual', 'PPF at 8.1%'),
  ('fixed_income', 2015, 8.70, 'manual', 'Higher rate regime');

-- Arbitrage & Hybrid Funds
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('arbitrage_hybrid', 2024, 8.50, 'manual', 'Arbitrage opportunities good'),
  ('arbitrage_hybrid', 2023, 8.80, 'manual', 'Higher volatility helped'),
  ('arbitrage_hybrid', 2022, 6.20, 'manual', 'Mixed market conditions'),
  ('arbitrage_hybrid', 2021, 5.80, 'manual', 'Lower arb opportunities'),
  ('arbitrage_hybrid', 2020, 7.40, 'manual', 'COVID volatility helped'),
  ('arbitrage_hybrid', 2019, 7.90, 'manual', 'Steady arbitrage gains'),
  ('arbitrage_hybrid', 2018, 7.30, 'manual', 'Moderate opportunities'),
  ('arbitrage_hybrid', 2017, 6.80, 'manual', 'Lower volatility year'),
  ('arbitrage_hybrid', 2016, 7.60, 'manual', 'Good arb opportunities'),
  ('arbitrage_hybrid', 2015, 8.10, 'manual', 'Higher volatility helped');

-- Savings Accounts
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('savings_account', 2024, 3.50, 'manual', 'Standard bank rates'),
  ('savings_account', 2023, 3.50, 'manual', 'Stable rates'),
  ('savings_account', 2022, 3.00, 'manual', 'Rising from lows'),
  ('savings_account', 2021, 2.70, 'manual', 'Low rate environment'),
  ('savings_account', 2020, 2.70, 'manual', 'Post-rate cut'),
  ('savings_account', 2019, 3.50, 'manual', 'Standard rates'),
  ('savings_account', 2018, 3.50, 'manual', 'Stable'),
  ('savings_account', 2017, 3.50, 'manual', 'Unchanged'),
  ('savings_account', 2016, 4.00, 'manual', 'Pre-demonetization'),
  ('savings_account', 2015, 4.00, 'manual', 'Higher rates');

-- Fixed Deposits (Bank FDs)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('fixed_deposits', 2024, 6.80, 'manual', '1-year FD rates'),
  ('fixed_deposits', 2023, 7.20, 'manual', 'Peak FD rates'),
  ('fixed_deposits', 2022, 6.00, 'manual', 'Rates rising'),
  ('fixed_deposits', 2021, 5.50, 'manual', 'Low rate environment'),
  ('fixed_deposits', 2020, 5.80, 'manual', 'Post-rate cuts'),
  ('fixed_deposits', 2019, 6.80, 'manual', 'Moderate rates'),
  ('fixed_deposits', 2018, 6.90, 'manual', 'Stable rates'),
  ('fixed_deposits', 2017, 7.00, 'manual', 'Good FD year'),
  ('fixed_deposits', 2016, 7.50, 'manual', 'Higher rates'),
  ('fixed_deposits', 2015, 8.00, 'manual', 'Pre-rate cut era');

-- Residential Real Estate (metros averaged)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('residential', 2024, 9.50, 'manual', 'Real estate recovery'),
  ('residential', 2023, 11.20, 'manual', 'Strong property market'),
  ('residential', 2022, 8.30, 'manual', 'Post-COVID recovery'),
  ('residential', 2021, 7.80, 'manual', 'Market stabilization'),
  ('residential', 2020, 2.50, 'manual', 'COVID impact'),
  ('residential', 2019, 5.10, 'manual', 'Weak property market'),
  ('residential', 2018, 3.20, 'manual', 'Slow growth'),
  ('residential', 2017, 6.80, 'manual', 'Pre-RERA correction'),
  ('residential', 2016, 8.90, 'manual', 'Good property year'),
  ('residential', 2015, 10.20, 'manual', 'Property boom tail end');

-- Commercial Real Estate
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('commercial', 2024, 11.80, 'manual', 'Office space demand high'),
  ('commercial', 2023, 13.50, 'manual', 'Commercial boom'),
  ('commercial', 2022, 10.20, 'manual', 'Return to office trend'),
  ('commercial', 2021, 8.50, 'manual', 'Recovery from COVID'),
  ('commercial', 2020, 1.20, 'manual', 'Work from home impact'),
  ('commercial', 2019, 9.30, 'manual', 'Steady commercial growth'),
  ('commercial', 2018, 10.80, 'manual', 'Office space expansion'),
  ('commercial', 2017, 12.40, 'manual', 'Strong commercial year'),
  ('commercial', 2016, 11.70, 'manual', 'IT expansion drove demand'),
  ('commercial', 2015, 13.20, 'manual', 'Peak commercial growth');

-- REITs (Indian REITs, limited history)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('reits', 2024, 8.90, 'manual', 'Embassy/Mindspace performance'),
  ('reits', 2023, 10.30, 'manual', 'Strong REIT year'),
  ('reits', 2022, 7.80, 'manual', 'Recovery from COVID'),
  ('reits', 2021, 6.50, 'manual', 'Stabilization'),
  ('reits', 2020, -2.30, 'manual', 'COVID impact on REITs'),
  ('reits', 2019, 8.70, 'manual', 'First REIT listings in India');

-- Gold (Physical/Digital)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('gold', 2024, 8.20, 'manual', 'Gold prices moderate'),
  ('gold', 2023, 12.70, 'manual', 'Strong gold year'),
  ('gold', 2022, 1.50, 'manual', 'Weak gold prices'),
  ('gold', 2021, -3.80, 'manual', 'Gold correction'),
  ('gold', 2020, 24.60, 'manual', 'COVID safe haven rush'),
  ('gold', 2019, 21.40, 'manual', 'Excellent gold year'),
  ('gold', 2018, 5.90, 'manual', 'Moderate gains'),
  ('gold', 2017, 8.60, 'manual', 'Good year for gold'),
  ('gold', 2016, 9.70, 'manual', 'Demonetization gold rush'),
  ('gold', 2015, -5.40, 'manual', 'Weak gold prices');

-- Cryptocurrency (Bitcoin as proxy - highly volatile)
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage, data_source, notes)
VALUES
  ('cryptocurrency', 2024, 45.30, 'manual', 'Bitcoin rally to new highs'),
  ('cryptocurrency', 2023, 155.70, 'manual', 'Crypto recovery year'),
  ('cryptocurrency', 2022, -64.20, 'manual', 'Crypto winter'),
  ('cryptocurrency', 2021, 59.80, 'manual', 'Bull run year'),
  ('cryptocurrency', 2020, 301.50, 'manual', 'Massive bull run'),
  ('cryptocurrency', 2019, 92.30, 'manual', 'Recovery from 2018 crash'),
  ('cryptocurrency', 2018, -72.60, 'manual', 'Crypto bear market'),
  ('cryptocurrency', 2017, 1331.50, 'manual', 'Epic bull run'),
  ('cryptocurrency', 2016, 125.40, 'manual', 'Strong crypto year'),
  ('cryptocurrency', 2015, 35.70, 'manual', 'Recovery year');

-- ============================================================================
-- 8. Helper Functions
-- ============================================================================

-- Function to calculate 10-year average return for a sub-class
CREATE OR REPLACE FUNCTION get_subclass_average_return(p_subclass_code TEXT, p_years INTEGER DEFAULT 10)
RETURNS NUMERIC AS $$
DECLARE
  v_avg_return NUMERIC;
BEGIN
  SELECT AVG(annual_return_percentage)
  INTO v_avg_return
  FROM asset_subclass_returns
  WHERE subclass_code = p_subclass_code
    AND year >= EXTRACT(YEAR FROM NOW()) - p_years
    AND year <= EXTRACT(YEAR FROM NOW());

  RETURN COALESCE(v_avg_return, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate weighted portfolio return for a snapshot
CREATE OR REPLACE FUNCTION calculate_snapshot_weighted_return(p_snapshot_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_weighted_return NUMERIC := 0;
  v_total_value NUMERIC;
  v_asset RECORD;
BEGIN
  -- Get total portfolio value
  SELECT SUM(current_value) INTO v_total_value
  FROM assets
  WHERE snapshot_id = p_snapshot_id AND is_duplicate = FALSE;

  -- Return 0 if no assets
  IF v_total_value IS NULL OR v_total_value = 0 THEN
    RETURN 0;
  END IF;

  -- Calculate weighted return
  FOR v_asset IN
    SELECT
      a.current_value,
      a.asset_subclass,
      COALESCE(a.expected_return_percentage, m.expected_return_midpoint, 0) as return_pct
    FROM assets a
    LEFT JOIN asset_subclass_mapping m ON a.asset_subclass = m.subclass_code
    WHERE a.snapshot_id = p_snapshot_id AND a.is_duplicate = FALSE
  LOOP
    v_weighted_return := v_weighted_return +
      ((v_asset.current_value / v_total_value) * v_asset.return_pct);
  END LOOP;

  RETURN v_weighted_return;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. Comments
-- ============================================================================

COMMENT ON TABLE asset_snapshots IS 'Stores periodic snapshots of user net worth with timestamp';
COMMENT ON TABLE assets IS 'Stores individual asset holdings linked to snapshots';
COMMENT ON TABLE asset_subclass_mapping IS 'Defines asset sub-class taxonomy with risk/return profiles';
COMMENT ON TABLE asset_subclass_returns IS 'Historical annual returns for each sub-class';
COMMENT ON TABLE upload_logs IS 'Tracks file uploads and AI processing metrics';

COMMENT ON FUNCTION get_subclass_average_return IS 'Calculates N-year average return for a sub-class';
COMMENT ON FUNCTION calculate_snapshot_weighted_return IS 'Calculates weighted portfolio return based on asset allocation';

-- ============================================================================
-- Migration Complete
-- ============================================================================
