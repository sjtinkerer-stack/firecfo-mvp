// Types for Asset Tracking System

export type AssetClass = 'equity' | 'debt' | 'cash' | 'real_estate' | 'other';

export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export type UploadStatus = 'processing' | 'completed' | 'failed';

export type SourceType = 'upload' | 'manual' | 'system';

export type SecurityType = 'equity' | 'mutual_fund' | 'bond' | 'etf' | 'commodity' | 'unknown';

export type VerificationSource = 'api_lookup' | 'ai_classification' | 'manual' | 'none';

// Raw extracted asset (before classification)
export interface RawAsset {
  asset_name: string;
  current_value: number;
  quantity?: number;
  purchase_price?: number;
  purchase_date?: string;
  source_file?: string;
  notes?: string;
  // Financial identifiers (NEW)
  isin?: string; // International Securities Identification Number
  ticker_symbol?: string; // NSE/BSE ticker code
  exchange?: string; // NSE, BSE, NASDAQ, etc.
}

// Classified asset (after AI classification)
export interface ClassifiedAsset extends RawAsset {
  asset_class: AssetClass;
  asset_subclass: string; // References subclass_code
  risk_level: RiskLevel;
  expected_return_percentage: number;
  ai_confidence_score: number; // 0-1
  security_type?: SecurityType; // Type of financial instrument
  verified_via?: VerificationSource; // How classification was verified
}

// Asset with duplicate detection
export interface ReviewAsset extends ClassifiedAsset {
  id: string; // Temporary ID for review UI
  is_duplicate?: boolean;
  duplicate_matches?: DuplicateMatch[];
  is_selected: boolean; // User selection in review UI
}

// Duplicate match information
export interface DuplicateMatch {
  existing_asset_id?: string;
  existing_asset_name: string;
  existing_value: number;
  existing_source: string;
  similarity_score: number; // 0-1
  match_type: 'name' | 'name_and_value' | 'exact';
}

// Sub-class definition
export interface SubClassMapping {
  id: string;
  asset_class: AssetClass;
  subclass_code: string;
  subclass_display_name: string;
  risk_level: RiskLevel;
  expected_return_range: string;
  expected_return_midpoint: number;
  keyword_patterns: string[];
  description: string;
  sort_order: number;
  is_active: boolean;
}

// Asset snapshot
export interface AssetSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_networth: number;
  equity_total: number;
  debt_total: number;
  cash_total: number;
  real_estate_total: number;
  other_assets_total: number;
  source_type: SourceType;
  source_files?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Individual asset
export interface Asset {
  id: string;
  user_id: string;
  snapshot_id: string;
  asset_name: string;
  asset_class: AssetClass;
  asset_subclass: string;
  current_value: number;
  quantity?: number;
  purchase_price?: number;
  purchase_date?: string;
  risk_level: RiskLevel;
  expected_return_percentage: number;
  source_file?: string;
  ai_confidence_score?: number;
  is_manually_verified: boolean;
  is_duplicate: boolean;
  notes?: string;
  // Financial identifiers (NEW)
  isin?: string;
  ticker_symbol?: string;
  exchange?: string;
  security_type?: SecurityType;
  verified_via?: VerificationSource;
  created_at: string;
  updated_at: string;
}

// File upload result
export interface FileUploadResult {
  file_name: string;
  file_type: 'pdf' | 'csv' | 'xlsx' | 'other';
  status: UploadStatus;
  assets_extracted: number;
  error_message?: string;
  processing_time_ms?: number;
}

// AI classification result
export interface ClassificationResult {
  asset_class: AssetClass;
  asset_subclass: string;
  confidence: number; // 0-1
  reasoning?: string; // Optional: why AI made this choice
}

// Duplicate detection result
export interface DuplicateDetectionResult {
  is_duplicate: boolean;
  matches: DuplicateMatch[];
}

// Upload log entry
export interface UploadLog {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  status: UploadStatus;
  assets_extracted: number;
  duplicates_found: number;
  processing_time_ms: number;
  ai_model_used: string;
  total_tokens_used: number;
  api_cost: number;
  error_message?: string;
  created_at: string;
}

// Historical return data
export interface SubClassReturn {
  subclass_code: string;
  year: number;
  annual_return_percentage: number;
  data_source: string;
  notes?: string;
}

// Weighted portfolio return calculation
export interface PortfolioReturn {
  total_value: number;
  weighted_return: number; // Percentage
  breakdown: {
    asset_class: AssetClass;
    asset_subclass: string;
    value: number;
    allocation_percentage: number;
    expected_return: number;
    contribution_to_return: number;
  }[];
}

// Snapshot comparison
export interface SnapshotComparison {
  snapshot_1: AssetSnapshot;
  snapshot_2: AssetSnapshot;
  total_change: number;
  total_change_percentage: number;
  days_between: number;
  class_changes: {
    asset_class: AssetClass;
    value_1: number;
    value_2: number;
    change: number;
    change_percentage: number;
  }[];
  assets_added: Asset[];
  assets_removed: Asset[];
  assets_changed: {
    asset: Asset;
    old_value: number;
    new_value: number;
    change: number;
  }[];
}

// API request/response types

export interface ParseFileRequest {
  file: File;
  file_name: string;
  file_type: 'pdf' | 'csv' | 'xlsx';
}

export interface ParseFileResponse {
  success: boolean;
  assets: ReviewAsset[];
  file_info: FileUploadResult;
  error?: string;
}

export interface SaveAssetsRequest {
  assets: ClassifiedAsset[];
  snapshot_date?: string;
  source_type: SourceType;
  source_files: string[];
  notes?: string;
}

export interface SaveAssetsResponse {
  success: boolean;
  snapshot_id: string;
  assets_saved: number;
  snapshot: AssetSnapshot;
  error?: string;
}

export interface GetSnapshotsResponse {
  success: boolean;
  snapshots: AssetSnapshot[];
  error?: string;
}

export interface GetAssetsResponse {
  success: boolean;
  assets: Asset[];
  snapshot?: AssetSnapshot;
  error?: string;
}

export interface UpdateAssetRequest {
  asset_name?: string;
  asset_class?: AssetClass;
  asset_subclass?: string;
  current_value?: number;
  quantity?: number;
  purchase_price?: number;
  purchase_date?: string;
  notes?: string;
  is_manually_verified?: boolean;
}

export interface DeleteAssetRequest {
  asset_id: string;
}

export interface CompareSnapshotsRequest {
  snapshot_id_1: string;
  snapshot_id_2: string;
}

export interface CompareSnapshotsResponse {
  success: boolean;
  comparison: SnapshotComparison;
  error?: string;
}

// Error types
export class AssetParsingError extends Error {
  constructor(message: string, public file_name: string, public original_error?: Error) {
    super(message);
    this.name = 'AssetParsingError';
  }
}

export class AssetClassificationError extends Error {
  constructor(message: string, public asset_name: string, public original_error?: Error) {
    super(message);
    this.name = 'AssetClassificationError';
  }
}

export class DuplicateDetectionError extends Error {
  constructor(message: string, public original_error?: Error) {
    super(message);
    this.name = 'DuplicateDetectionError';
  }
}
