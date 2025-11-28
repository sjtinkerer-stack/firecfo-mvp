// Types for temporary asset storage during review workflow

import { ReviewAsset, StatementDateConfidence, StatementDateSource } from './types';

export interface TempUpload {
  id: string; // Format: tmp_YYYYMMDD_randomString
  user_id: string;
  file_names: string[];
  total_assets: number;
  total_value: number;
  statement_date?: string;
  statement_date_confidence?: StatementDateConfidence;
  statement_date_source?: StatementDateSource;
  suggested_snapshot_name?: string;
  matched_snapshot_id?: string | null;
  merge_decision?: 'merge' | 'create_new' | null;
  processing_time_ms?: number;
  duplicates_found: number;
  status: 'pending' | 'in_review' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface TempAsset extends ReviewAsset {
  temp_upload_id: string;
  user_id: string;
  is_edited: boolean; // Track if user edited
}

// API Request/Response types

export interface CreateTempUploadRequest {
  assets: ReviewAsset[];
  file_names: string[];
  statement_date?: string;
  statement_date_confidence?: StatementDateConfidence;
  statement_date_source?: StatementDateSource;
  suggested_snapshot_name?: string;
  matched_snapshot_id?: string | null;
  merge_decision?: 'merge' | 'create_new';
  processing_time_ms?: number;
  duplicates_found: number;
}

export interface CreateTempUploadResponse {
  success: boolean;
  upload_id: string;
  error?: string;
}

export interface GetTempUploadResponse {
  success: boolean;
  upload: TempUpload;
  assets: TempAsset[];
  error?: string;
}

export interface UpdateTempAssetsRequest {
  assets: Partial<TempAsset>[]; // Array of asset updates (id + changed fields)
}

export interface UpdateTempAssetsResponse {
  success: boolean;
  updated_count: number;
  error?: string;
}

export interface FinalizeTempUploadRequest {
  snapshot_name?: string;
  merge_with_snapshot_id?: string;
  merge_mode: boolean;
  selected_asset_ids: string[]; // Only save selected assets
}

export interface FinalizeTempUploadResponse {
  success: boolean;
  snapshot_id: string;
  assets_saved: number;
  message: string;
  error?: string;
}

// Helper to generate temp upload ID
export function generateTempUploadId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const random = Math.random().toString(36).substring(2, 9); // 7 char random
  return `tmp_${dateStr}_${random}`;
}

// Helper to generate temp asset ID
export function generateTempAssetId(): string {
  const random = Math.random().toString(36).substring(2, 15); // 13 char random
  return `tmp_asset_${random}`;
}
