// Hook: Upload and parse asset files

'use client';

import { useState } from 'react';
import { ReviewAsset } from '@/app/lib/assets';

interface UploadResult {
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
        const errorData = await response.json();
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
