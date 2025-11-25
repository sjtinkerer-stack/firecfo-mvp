-- Migration: Add Asset Tracking System (CLEAN VERSION)
-- Description: Drops existing tables and recreates them fresh
-- Date: 2025-11-24
-- IMPORTANT: This will delete any existing asset tracking data!

-- ============================================================================
-- Drop existing tables and functions (in reverse dependency order)
-- ============================================================================

-- Drop functions first
DROP FUNCTION IF EXISTS calculate_snapshot_weighted_return(UUID);
DROP FUNCTION IF EXISTS get_subclass_average_return(TEXT, INTEGER);
DROP FUNCTION IF EXISTS update_asset_updated_at();
DROP FUNCTION IF EXISTS update_upload_log_updated_at();
DROP FUNCTION IF EXISTS update_asset_snapshot_updated_at();

-- Drop tables (in reverse dependency order to avoid foreign key errors)
DROP TABLE IF EXISTS upload_logs CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS asset_subclass_returns CASCADE;
DROP TABLE IF EXISTS asset_subclass_mapping CASCADE;
DROP TABLE IF EXISTS asset_snapshots CASCADE;

-- ============================================================================
-- 1. Asset Snapshots Table
-- ============================================================================
-- Stores periodic net worth snapshots (created on each upload or manual update)

CREATE TABLE asset_snapshots (
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
CREATE INDEX idx_asset_snapshots_user_date
  ON asset_snapshots(user_id, snapshot_date DESC);

CREATE INDEX idx_asset_snapshots_user_latest
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

CREATE TABLE asset_subclass_mapping (
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
CREATE INDEX idx_asset_subclass_mapping_class
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

CREATE TABLE assets (
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
CREATE INDEX idx_assets_user_snapshot
  ON assets(user_id, snapshot_id);

CREATE INDEX idx_assets_class_subclass
  ON assets(asset_class, asset_subclass);

CREATE INDEX idx_assets_snapshot
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
-- 4. Asset Sub-Class Historical Returns Table
-- ============================================================================
-- Stores historical return data for each sub-class (for weighted return calculations)

CREATE TABLE asset_subclass_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subclass_code TEXT NOT NULL REFERENCES asset_subclass_mapping(subclass_code) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  annual_return_percentage NUMERIC(8, 3) NOT NULL, -- e.g., 12.345 for 12.345% (allows up to 99999.999 for volatile assets like crypto)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(subclass_code, year)
);

-- Index for lookups
CREATE INDEX idx_asset_subclass_returns_code_year
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
-- Tracks file upload history and AI processing results

CREATE TABLE upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES asset_snapshots(id) ON DELETE SET NULL,

  -- Upload details
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'csv', 'xlsx'
  file_size_bytes INTEGER,

  -- Processing status
  status TEXT NOT NULL CHECK (status IN ('uploaded', 'parsing', 'classifying', 'completed', 'failed')),
  assets_parsed INTEGER DEFAULT 0,
  assets_saved INTEGER DEFAULT 0,
  duplicates_found INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,

  -- Timing
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_upload_logs_user_uploaded
  ON upload_logs(user_id, uploaded_at DESC);

-- RLS Policies
ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own upload logs"
  ON upload_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upload logs"
  ON upload_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload logs"
  ON upload_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_upload_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_upload_logs_updated_at
  BEFORE UPDATE ON upload_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_log_updated_at();

-- ============================================================================
-- Seed Data: Sub-Class Mappings (26 sub-classes)
-- ============================================================================

INSERT INTO asset_subclass_mapping (asset_class, subclass_code, subclass_display_name, risk_level, expected_return_range, expected_return_midpoint, keyword_patterns, description, sort_order, is_active) VALUES

-- EQUITY (9 sub-classes)
('equity', 'direct_stocks', 'Direct Stocks', 'very_high', '12-18%', 15.00, ARRAY['stock', 'equity', 'share', 'bse', 'nse'], 'Individual company stocks traded on exchanges', 1, TRUE),
('equity', 'index_funds', 'Index Funds', 'medium', '11-13%', 12.00, ARRAY['index', 'nifty', 'sensex', 'nifty50', 'nifty 50'], 'Mutual funds or ETFs tracking market indices', 2, TRUE),
('equity', 'large_cap_funds', 'Large Cap Mutual Funds', 'medium', '11-14%', 12.50, ARRAY['large cap', 'largecap', 'bluechip', 'blue chip'], 'Funds investing in large, established companies', 3, TRUE),
('equity', 'mid_cap_funds', 'Mid Cap Mutual Funds', 'high', '13-16%', 14.50, ARRAY['mid cap', 'midcap', 'mid-cap'], 'Funds investing in medium-sized companies', 4, TRUE),
('equity', 'small_cap_funds', 'Small Cap Mutual Funds', 'very_high', '14-18%', 16.00, ARRAY['small cap', 'smallcap', 'small-cap'], 'Funds investing in smaller, high-growth companies', 5, TRUE),
('equity', 'sectoral_funds', 'Sectoral/Thematic Funds', 'very_high', '10-20%', 15.00, ARRAY['sector', 'thematic', 'pharma', 'it', 'banking', 'infrastructure'], 'Funds focused on specific sectors or themes', 6, TRUE),
('equity', 'international_equity', 'International Equity Funds', 'high', '10-15%', 12.50, ARRAY['international', 'global', 'us equity', 'nasdaq', 'sp500', 's&p 500'], 'Funds investing in foreign markets', 7, TRUE),
('equity', 'elss', 'ELSS (Tax Saver Funds)', 'high', '12-15%', 13.50, ARRAY['elss', 'tax saver', '80c'], 'Equity funds with 3-year lock-in and tax benefits', 8, TRUE),
('equity', 'pms_aif', 'PMS / AIF', 'very_high', '12-20%', 16.00, ARRAY['pms', 'aif', 'portfolio management'], 'Portfolio Management Services and Alternative Investment Funds', 9, TRUE),

-- DEBT (8 sub-classes)
('debt', 'fd_bank', 'Fixed Deposits (Bank)', 'very_low', '6-7%', 6.50, ARRAY['fixed deposit', 'fd', 'bank fd', 'term deposit'], 'Bank fixed deposits with guaranteed returns', 10, TRUE),
('debt', 'fd_corporate', 'Fixed Deposits (Corporate)', 'low', '7-9%', 8.00, ARRAY['corporate fd', 'company fd', 'corporate deposit'], 'Fixed deposits with NBFCs and corporates', 11, TRUE),
('debt', 'ppf', 'Public Provident Fund (PPF)', 'very_low', '7-8%', 7.50, ARRAY['ppf', 'public provident'], 'Government-backed long-term savings with tax benefits', 12, TRUE),
('debt', 'epf_vpf', 'EPF / VPF', 'very_low', '8-9%', 8.50, ARRAY['epf', 'vpf', 'provident fund', 'pf'], 'Employer and voluntary provident fund contributions', 13, TRUE),
('debt', 'nsc_scss', 'NSC / SCSS', 'very_low', '7-8%', 7.50, ARRAY['nsc', 'scss', 'national savings', 'senior citizen'], 'National Savings Certificate and Senior Citizen Savings Scheme', 14, TRUE),
('debt', 'debt_mutual_funds', 'Debt Mutual Funds', 'low', '6-8%', 7.00, ARRAY['debt fund', 'income fund', 'bond fund', 'gilt'], 'Mutual funds investing in bonds and debt instruments', 15, TRUE),
('debt', 'bonds', 'Bonds (Corporate/Govt)', 'low', '7-9%', 8.00, ARRAY['bond', 'debenture', 'govt bond', 'corporate bond', 'g-sec'], 'Direct investment in government or corporate bonds', 16, TRUE),
('debt', 'sovereign_gold_bonds', 'Sovereign Gold Bonds', 'low', '8-10%', 9.00, ARRAY['sgb', 'sovereign gold', 'gold bond'], 'Government-issued gold bonds with interest', 17, TRUE),

-- CASH (3 sub-classes)
('cash', 'savings_account', 'Savings Account', 'very_low', '3-4%', 3.50, ARRAY['savings', 'savings account', 'bank account'], 'Regular bank savings accounts', 18, TRUE),
('cash', 'liquid_funds', 'Liquid Funds', 'very_low', '4-5%', 4.50, ARRAY['liquid', 'liquid fund', 'overnight fund'], 'Ultra-short-term debt funds for parking surplus', 19, TRUE),
('cash', 'fd_short_term', 'Short-Term FDs (<1 year)', 'very_low', '5-6%', 5.50, ARRAY['short term fd', 'short fd'], 'Fixed deposits with maturity less than 1 year', 20, TRUE),

-- REAL ESTATE (3 sub-classes)
('real_estate', 'primary_residence', 'Primary Residence', 'medium', '5-8%', 6.50, ARRAY['house', 'home', 'apartment', 'flat', 'residence'], 'Self-occupied residential property', 21, TRUE),
('real_estate', 'rental_property', 'Rental Property', 'medium', '6-10%', 8.00, ARRAY['rental', 'rent', 'investment property'], 'Property generating rental income', 22, TRUE),
('real_estate', 'reits', 'REITs', 'medium', '8-12%', 10.00, ARRAY['reit', 'real estate investment trust'], 'Real Estate Investment Trusts', 23, TRUE),

-- OTHER (3 sub-classes)
('other', 'physical_gold', 'Physical Gold/Jewelry', 'medium', '8-10%', 9.00, ARRAY['gold', 'jewelry', 'jewellery', 'physical gold'], 'Gold coins, bars, and jewelry', 24, TRUE),
('other', 'gold_etf', 'Gold ETF/Funds', 'medium', '8-10%', 9.00, ARRAY['gold etf', 'gold fund'], 'Exchange-traded funds tracking gold prices', 25, TRUE),
('other', 'crypto_commodities', 'Crypto/Commodities', 'very_high', '0-30%', 15.00, ARRAY['crypto', 'bitcoin', 'commodity', 'silver'], 'Cryptocurrencies and commodity investments', 26, TRUE);

-- ============================================================================
-- Seed Data: Historical Returns (10 years: 2015-2024)
-- ============================================================================

-- EQUITY SUB-CLASSES
INSERT INTO asset_subclass_returns (subclass_code, year, annual_return_percentage) VALUES
-- Direct Stocks (Volatile, based on Nifty 50 returns with 20% higher volatility)
('direct_stocks', 2015, -4.06), ('direct_stocks', 2016, 3.01), ('direct_stocks', 2017, 28.65),
('direct_stocks', 2018, 3.15), ('direct_stocks', 2019, 12.02), ('direct_stocks', 2020, 14.90),
('direct_stocks', 2021, 24.12), ('direct_stocks', 2022, 4.32), ('direct_stocks', 2023, 20.03),
('direct_stocks', 2024, 10.50),

-- Index Funds (Nifty 50 TRI returns)
('index_funds', 2015, -3.72), ('index_funds', 2016, 2.51), ('index_funds', 2017, 28.65),
('index_funds', 2018, 3.15), ('index_funds', 2019, 12.02), ('index_funds', 2020, 14.90),
('index_funds', 2021, 24.12), ('index_funds', 2022, 4.32), ('index_funds', 2023, 20.03),
('index_funds', 2024, 10.50),

-- Large Cap Funds (Similar to Nifty with slight outperformance)
('large_cap_funds', 2015, -3.50), ('large_cap_funds', 2016, 3.00), ('large_cap_funds', 2017, 29.00),
('large_cap_funds', 2018, 3.50), ('large_cap_funds', 2019, 12.50), ('large_cap_funds', 2020, 15.20),
('large_cap_funds', 2021, 24.50), ('large_cap_funds', 2022, 4.80), ('large_cap_funds', 2023, 20.50),
('large_cap_funds', 2024, 11.00),

-- Mid Cap Funds (Higher returns, more volatile)
('mid_cap_funds', 2015, -5.00), ('mid_cap_funds', 2016, 5.00), ('mid_cap_funds', 2017, 35.00),
('mid_cap_funds', 2018, 2.00), ('mid_cap_funds', 2019, 15.00), ('mid_cap_funds', 2020, 18.00),
('mid_cap_funds', 2021, 28.00), ('mid_cap_funds', 2022, 2.50), ('mid_cap_funds', 2023, 25.00),
('mid_cap_funds', 2024, 12.50),

-- Small Cap Funds (Highest equity returns, most volatile)
('small_cap_funds', 2015, -8.00), ('small_cap_funds', 2016, 7.00), ('small_cap_funds', 2017, 40.00),
('small_cap_funds', 2018, 0.00), ('small_cap_funds', 2019, 18.00), ('small_cap_funds', 2020, 20.00),
('small_cap_funds', 2021, 32.00), ('small_cap_funds', 2022, 1.00), ('small_cap_funds', 2023, 28.00),
('small_cap_funds', 2024, 14.00),

-- Sectoral/Thematic Funds (Highly volatile, sector-dependent)
('sectoral_funds', 2015, -6.00), ('sectoral_funds', 2016, 4.00), ('sectoral_funds', 2017, 32.00),
('sectoral_funds', 2018, 1.00), ('sectoral_funds', 2019, 14.00), ('sectoral_funds', 2020, 16.00),
('sectoral_funds', 2021, 26.00), ('sectoral_funds', 2022, 3.00), ('sectoral_funds', 2023, 22.00),
('sectoral_funds', 2024, 11.00),

-- International Equity (Based on S&P 500 and global markets)
('international_equity', 2015, 1.38), ('international_equity', 2016, 11.96), ('international_equity', 2017, 21.83),
('international_equity', 2018, -4.38), ('international_equity', 2019, 31.49), ('international_equity', 2020, 18.40),
('international_equity', 2021, 28.71), ('international_equity', 2022, -18.11), ('international_equity', 2023, 26.29),
('international_equity', 2024, 9.50),

-- ELSS (Similar to large cap with lock-in)
('elss', 2015, -3.80), ('elss', 2016, 3.20), ('elss', 2017, 29.50),
('elss', 2018, 3.30), ('elss', 2019, 12.80), ('elss', 2020, 15.50),
('elss', 2021, 24.80), ('elss', 2022, 4.60), ('elss', 2023, 20.80),
('elss', 2024, 11.20),

-- PMS/AIF (Higher returns potential, varies widely)
('pms_aif', 2015, -2.00), ('pms_aif', 2016, 5.00), ('pms_aif', 2017, 32.00),
('pms_aif', 2018, 4.00), ('pms_aif', 2019, 16.00), ('pms_aif', 2020, 18.00),
('pms_aif', 2021, 28.00), ('pms_aif', 2022, 5.00), ('pms_aif', 2023, 24.00),
('pms_aif', 2024, 13.00),

-- DEBT SUB-CLASSES (More stable, lower returns)
-- Fixed Deposits (Bank) - Based on SBI FD rates
('fd_bank', 2015, 7.75), ('fd_bank', 2016, 7.25), ('fd_bank', 2017, 6.75),
('fd_bank', 2018, 6.75), ('fd_bank', 2019, 6.85), ('fd_bank', 2020, 5.50),
('fd_bank', 2021, 5.40), ('fd_bank', 2022, 5.75), ('fd_bank', 2023, 7.00),
('fd_bank', 2024, 7.10),

-- Corporate FDs (Slightly higher than bank FDs)
('fd_corporate', 2015, 8.75), ('fd_corporate', 2016, 8.25), ('fd_corporate', 2017, 7.75),
('fd_corporate', 2018, 7.75), ('fd_corporate', 2019, 7.85), ('fd_corporate', 2020, 6.50),
('fd_corporate', 2021, 6.40), ('fd_corporate', 2022, 6.75), ('fd_corporate', 2023, 8.00),
('fd_corporate', 2024, 8.10),

-- PPF (Government-set rates, changes quarterly)
('ppf', 2015, 8.70), ('ppf', 2016, 8.10), ('ppf', 2017, 7.80),
('ppf', 2018, 7.60), ('ppf', 2019, 7.90), ('ppf', 2020, 7.10),
('ppf', 2021, 7.10), ('ppf', 2022, 7.10), ('ppf', 2023, 7.10),
('ppf', 2024, 7.10),

-- EPF/VPF (Historically high, safe returns)
('epf_vpf', 2015, 8.75), ('epf_vpf', 2016, 8.65), ('epf_vpf', 2017, 8.55),
('epf_vpf', 2018, 8.65), ('epf_vpf', 2019, 8.50), ('epf_vpf', 2020, 8.50),
('epf_vpf', 2021, 8.50), ('epf_vpf', 2022, 8.15), ('epf_vpf', 2023, 8.15),
('epf_vpf', 2024, 8.25),

-- NSC/SCSS (Government schemes for specific demographics)
('nsc_scss', 2015, 8.50), ('nsc_scss', 2016, 8.10), ('nsc_scss', 2017, 7.80),
('nsc_scss', 2018, 7.60), ('nsc_scss', 2019, 7.90), ('nsc_scss', 2020, 7.70),
('nsc_scss', 2021, 6.80), ('nsc_scss', 2022, 7.00), ('nsc_scss', 2023, 7.70),
('nsc_scss', 2024, 8.00),

-- Debt Mutual Funds (Market-linked, tax-efficient)
('debt_mutual_funds', 2015, 8.50), ('debt_mutual_funds', 2016, 7.80), ('debt_mutual_funds', 2017, 7.20),
('debt_mutual_funds', 2018, 6.90), ('debt_mutual_funds', 2019, 9.50), ('debt_mutual_funds', 2020, 8.20),
('debt_mutual_funds', 2021, 4.50), ('debt_mutual_funds', 2022, 3.80), ('debt_mutual_funds', 2023, 6.80),
('debt_mutual_funds', 2024, 7.50),

-- Bonds (Corporate/Government)
('bonds', 2015, 8.20), ('bonds', 2016, 7.90), ('bonds', 2017, 7.50),
('bonds', 2018, 7.30), ('bonds', 2019, 8.00), ('bonds', 2020, 7.50),
('bonds', 2021, 6.50), ('bonds', 2022, 6.80), ('bonds', 2023, 7.50),
('bonds', 2024, 8.00),

-- Sovereign Gold Bonds (Gold returns + 2.5% interest)
('sovereign_gold_bonds', 2015, -0.50), ('sovereign_gold_bonds', 2016, 10.50), ('sovereign_gold_bonds', 2017, 7.00),
('sovereign_gold_bonds', 2018, 7.50), ('sovereign_gold_bonds', 2019, 24.00), ('sovereign_gold_bonds', 2020, 28.00),
('sovereign_gold_bonds', 2021, -1.50), ('sovereign_gold_bonds', 2022, 12.50), ('sovereign_gold_bonds', 2023, 15.50),
('sovereign_gold_bonds', 2024, 9.50),

-- CASH SUB-CLASSES (Lowest risk, lowest returns)
-- Savings Account (Bank interest rates)
('savings_account', 2015, 4.00), ('savings_account', 2016, 4.00), ('savings_account', 2017, 4.00),
('savings_account', 2018, 3.50), ('savings_account', 2019, 3.50), ('savings_account', 2020, 3.00),
('savings_account', 2021, 2.70), ('savings_account', 2022, 2.70), ('savings_account', 2023, 2.70),
('savings_account', 2024, 2.70),

-- Liquid Funds (Slightly better than savings)
('liquid_funds', 2015, 7.50), ('liquid_funds', 2016, 7.00), ('liquid_funds', 2017, 6.50),
('liquid_funds', 2018, 6.30), ('liquid_funds', 2019, 6.80), ('liquid_funds', 2020, 4.50),
('liquid_funds', 2021, 3.50), ('liquid_funds', 2022, 4.20), ('liquid_funds', 2023, 6.50),
('liquid_funds', 2024, 7.00),

-- Short-Term FDs
('fd_short_term', 2015, 7.00), ('fd_short_term', 2016, 6.50), ('fd_short_term', 2017, 6.00),
('fd_short_term', 2018, 6.00), ('fd_short_term', 2019, 6.20), ('fd_short_term', 2020, 5.00),
('fd_short_term', 2021, 4.80), ('fd_short_term', 2022, 5.20), ('fd_short_term', 2023, 6.50),
('fd_short_term', 2024, 6.80),

-- REAL ESTATE SUB-CLASSES (Long-term appreciation)
-- Primary Residence (Conservative real estate appreciation)
('primary_residence', 2015, 6.00), ('primary_residence', 2016, 5.50), ('primary_residence', 2017, 7.00),
('primary_residence', 2018, 5.00), ('primary_residence', 2019, 6.00), ('primary_residence', 2020, 4.00),
('primary_residence', 2021, 5.50), ('primary_residence', 2022, 6.50), ('primary_residence', 2023, 7.50),
('primary_residence', 2024, 8.00),

-- Rental Property (Appreciation + rental yield ~2-3%)
('rental_property', 2015, 8.00), ('rental_property', 2016, 7.50), ('rental_property', 2017, 9.00),
('rental_property', 2018, 7.00), ('rental_property', 2019, 8.00), ('rental_property', 2020, 6.00),
('rental_property', 2021, 7.50), ('rental_property', 2022, 8.50), ('rental_property', 2023, 9.50),
('rental_property', 2024, 10.00),

-- REITs (Market-traded, dividend-paying)
('reits', 2015, 8.00), ('reits', 2016, 9.00), ('reits', 2017, 11.00),
('reits', 2018, 7.00), ('reits', 2019, 10.00), ('reits', 2020, -5.00),
('reits', 2021, 15.00), ('reits', 2022, 8.00), ('reits', 2023, 12.00),
('reits', 2024, 11.00),

-- OTHER SUB-CLASSES
-- Physical Gold (Based on gold price movements)
('physical_gold', 2015, -2.00), ('physical_gold', 2016, 8.00), ('physical_gold', 2017, 4.50),
('physical_gold', 2018, 5.00), ('physical_gold', 2019, 21.50), ('physical_gold', 2020, 25.50),
('physical_gold', 2021, -4.00), ('physical_gold', 2022, 10.00), ('physical_gold', 2023, 13.00),
('physical_gold', 2024, 7.00),

-- Gold ETF/Funds (Similar to physical gold, slightly lower due to expense ratio)
('gold_etf', 2015, -2.20), ('gold_etf', 2016, 7.80), ('gold_etf', 2017, 4.30),
('gold_etf', 2018, 4.80), ('gold_etf', 2019, 21.30), ('gold_etf', 2020, 25.30),
('gold_etf', 2021, -4.20), ('gold_etf', 2022, 9.80), ('gold_etf', 2023, 12.80),
('gold_etf', 2024, 6.80),

-- Crypto/Commodities (Extremely volatile, speculative)
('crypto_commodities', 2015, 35.00), ('crypto_commodities', 2016, 125.00), ('crypto_commodities', 2017, 1400.00),
('crypto_commodities', 2018, -73.00), ('crypto_commodities', 2019, 92.00), ('crypto_commodities', 2020, 305.00),
('crypto_commodities', 2021, 60.00), ('crypto_commodities', 2022, -64.00), ('crypto_commodities', 2023, 155.00),
('crypto_commodities', 2024, 45.00);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to calculate average return for a subclass over N years
CREATE OR REPLACE FUNCTION get_subclass_average_return(p_subclass_code TEXT, p_years INTEGER DEFAULT 10)
RETURNS NUMERIC AS $$
DECLARE
  v_avg_return NUMERIC;
BEGIN
  SELECT AVG(annual_return_percentage) INTO v_avg_return
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
-- Migration Complete!
-- ============================================================================
-- Run the verification queries from QUICK_START.md to confirm success
