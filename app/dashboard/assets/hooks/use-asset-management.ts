// Hook: Manage assets (save, list, update, delete)

'use client';

import { useState, useCallback } from 'react';
import { ClassifiedAsset, Asset, AssetSnapshot } from '@/app/lib/assets';

interface SaveAssetsResult {
  snapshot_id: string;
  assets_saved: number;
  snapshot: AssetSnapshot;
  message: string;
}

interface ListAssetsResult {
  assets: Asset[];
  snapshot?: AssetSnapshot;
  summary: {
    total_assets: number;
    total_value: number;
    by_class: Record<string, { count: number; value: number }>;
  };
}

export function useAssetManagement() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Save reviewed assets to database (with snapshot merging support)
   */
  const saveAssets = useCallback(
    async (
      assets: ClassifiedAsset[],
      sourceFiles: string[],
      notes?: string,
      targetSnapshotId?: string,
      mergeWithExisting?: boolean,
      statementDate?: string,
      snapshotName?: string
    ): Promise<SaveAssetsResult | null> => {
      setSaving(true);
      setError(null);

      try {
        const response = await fetch('/api/assets/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assets,
            source_files: sourceFiles,
            notes,
            target_snapshot_id: targetSnapshotId,
            merge_with_existing: mergeWithExisting,
            statement_date: statementDate,
            snapshot_name: snapshotName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save assets');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Save failed');
        }

        return data as SaveAssetsResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Save error:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  /**
   * List assets for user (optionally filtered by snapshot)
   */
  const listAssets = useCallback(
    async (snapshotId?: string, assetClass?: string): Promise<ListAssetsResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (snapshotId) params.append('snapshot_id', snapshotId);
        if (assetClass) params.append('asset_class', assetClass);

        const response = await fetch(`/api/assets?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch assets');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Fetch failed');
        }

        return data as ListAssetsResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('List error:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Rename snapshot
   */
  const renameSnapshot = useCallback(
    async (snapshotId: string, newName: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/assets/snapshots?id=${snapshotId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snapshot_name: newName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to rename snapshot');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Rename failed');
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Rename error:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete snapshot (cascade deletes all associated assets)
   */
  const deleteSnapshot = useCallback(
    async (snapshotId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/assets/snapshots?id=${snapshotId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete snapshot');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Delete failed');
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Delete error:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setSaving(false);
    setLoading(false);
    setError(null);
  }, []);

  return {
    saveAssets,
    listAssets,
    renameSnapshot,
    deleteSnapshot,
    saving,
    loading,
    error,
    reset,
  };
}
