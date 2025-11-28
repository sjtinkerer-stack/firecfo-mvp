// Hook: Upload and parse asset files

'use client';

import { useState } from 'react';
import { ReviewAsset } from '@/app/lib/assets';

export interface StatementDateGroup {
  statement_date: string;
  suggested_snapshot_name: string;
  files: string[];
  match_type: 'exact' | 'close' | 'none';
  matched_snapshot: {
    id: string;
    snapshot_name?: string;
    statement_date?: string;
    total_networth: number;
  } | null;
  days_difference?: number;
  suggested_action: 'merge' | 'prompt' | 'create_new';
}

export interface UploadResult {
  assets: ReviewAsset[];
  summary: {
    total_files: number;
    successful_files: number;
    failed_files: number;
    total_assets: number;
    duplicates_found: number;
    processing_time_ms: number;
    file_details: {
      fileName: string;
      fileSize: string;
      assetsFound: number;
      status: 'success' | 'failed';
      error?: string;
    }[];
  };
  statement_date_groups?: StatementDateGroup[];
}

export function useAssetUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = async (files: File[]): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);
    setProgress({ current: 0, total: files.length });

    try {
      // Create form data with files
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Upload and parse files
      const response = await fetch('/api/assets/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          console.error('Response status:', response.status, response.statusText);
          throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`);
        }

        console.error('Upload API error:', errorData);

        // Include detailed error information if available
        let errorMessage = errorData.error || 'Failed to upload files';
        if (errorData.details && errorData.details.length > 0) {
          const fileErrors = errorData.details
            .map((d: any) => `${d.file}: ${d.error}`)
            .join(', ');
          errorMessage += `\n\nDetails: ${fileErrors}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setProgress({ current: files.length, total: files.length });
      return data as UploadResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Upload error:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setUploading(false);
    setProgress({ current: 0, total: 0 });
    setError(null);
  };

  return {
    uploadFiles,
    uploading,
    progress,
    error,
    reset,
  };
}
