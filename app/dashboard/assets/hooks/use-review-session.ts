'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  TempUpload,
  TempAsset,
  GetTempUploadResponse,
  UpdateTempAssetsRequest,
  UpdateTempAssetsResponse,
  FinalizeTempUploadRequest,
  FinalizeTempUploadResponse,
} from '@/app/lib/assets/temp-storage-types';
import { smartMergeAssets } from '../utils/smart-merge';

interface UseReviewSessionOptions {
  uploadId: string;
  autoSaveDelay?: number; // Debounce delay for auto-save (default 1000ms)
}

export function useReviewSession({ uploadId, autoSaveDelay = 1000 }: UseReviewSessionOptions) {
  const router = useRouter();

  // State
  const [tempUpload, setTempUpload] = useState<TempUpload | null>(null);
  const [assets, setAssets] = useState<TempAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, Partial<TempAsset>>>(new Map());

  // Fetch temp upload and assets
  const fetchReviewSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/assets/review/${uploadId}`);
      const data: GetTempUploadResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load review session');
      }

      setTempUpload(data.upload);
      setAssets(data.assets);

      // Auto-select all assets initially
      setSelectedIds(data.assets.map((a) => a.id));

      console.log(`✅ Loaded review session: ${data.assets.length} assets`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load review session';
      setError(message);
      toast.error(message);
      console.error('❌ Failed to fetch review session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [uploadId]);

  // Initial load
  useEffect(() => {
    fetchReviewSession();
  }, [fetchReviewSession]);

  // Auto-save pending updates
  const flushPendingUpdates = useCallback(async () => {
    if (pendingUpdatesRef.current.size === 0) return;

    const updates = Array.from(pendingUpdatesRef.current.entries()).map(([id, updates]) => ({
      id,
      ...updates,
    }));

    pendingUpdatesRef.current.clear();

    try {
      setIsSaving(true);

      const request: UpdateTempAssetsRequest = { assets: updates };
      const response = await fetch(`/api/assets/review/${uploadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data: UpdateTempAssetsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save changes');
      }

      console.log(`✅ Auto-saved ${data.updated_count} asset updates`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes';
      toast.error(message);
      console.error('❌ Auto-save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [uploadId]);

  // Update asset (with debounced auto-save)
  const updateAsset = useCallback(
    (assetId: string, updates: Partial<TempAsset>) => {
      // Update local state immediately (optimistic)
      setAssets((prev) =>
        prev.map((asset) => (asset.id === assetId ? { ...asset, ...updates } : asset))
      );

      // Queue update for auto-save
      const existing = pendingUpdatesRef.current.get(assetId) || {};
      pendingUpdatesRef.current.set(assetId, { ...existing, ...updates });

      // Debounce auto-save
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        flushPendingUpdates();
      }, autoSaveDelay);
    },
    [autoSaveDelay, flushPendingUpdates]
  );

  // Delete asset
  const deleteAsset = useCallback(
    async (assetId: string) => {
      // Optimistic update
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      setSelectedIds((prev) => prev.filter((id) => id !== assetId));

      // Update server
      try {
        const request: UpdateTempAssetsRequest = {
          assets: [{ id: assetId, is_selected: false }],
        };

        const response = await fetch(`/api/assets/review/${uploadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error('Failed to delete asset');
        }

        toast.success('Asset removed');
      } catch (err) {
        // Revert on error
        await fetchReviewSession();
        toast.error('Failed to remove asset');
        console.error('❌ Delete asset failed:', err);
      }
    },
    [uploadId, fetchReviewSession]
  );

  // Delete multiple assets
  const deleteSelected = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      // Optimistic update
      setAssets((prev) => prev.filter((a) => !ids.includes(a.id)));
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));

      // Update server
      try {
        const request: UpdateTempAssetsRequest = {
          assets: ids.map((id) => ({ id, is_selected: false })),
        };

        const response = await fetch(`/api/assets/review/${uploadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error('Failed to delete assets');
        }

        toast.success(`${ids.length} ${ids.length === 1 ? 'asset' : 'assets'} removed`);
      } catch (err) {
        // Revert on error
        await fetchReviewSession();
        toast.error('Failed to remove assets');
        console.error('❌ Delete assets failed:', err);
      }
    },
    [uploadId, fetchReviewSession]
  );

  // Apply duplicate resolutions from modal
  const applyDuplicateResolutions = useCallback(
    async (decisions: any[]) => {
      console.log('Applying duplicate resolutions:', decisions);

      // Collect all updates to batch them
      const updates: Array<{ id: string; updates: Partial<TempAsset> }> = [];
      const idsToRemove: string[] = []; // Assets to remove from state entirely

      for (const decision of decisions) {
        // Get assets from the decision (now passed from modal)
        const groupAssets = decision.groupAssets ||
          assets.filter((a: TempAsset) =>
            decision.assetIdsToKeep?.includes(a.id) ||
            a.duplicate_matches?.some((m: any) =>
              decision.assetIdsToKeep?.includes(m.existing_asset_id)
            )
          );

        switch (decision.action) {
          case 'keep_both':
            // All assets in group remain selected, clear duplicate flag
            groupAssets.forEach((asset: TempAsset) => {
              updates.push({
                id: asset.id,
                updates: { is_duplicate: false, duplicate_matches: [] },
              });
            });
            break;

          case 'merge':
            // Smart merge: Use best attributes from all assets
            if (groupAssets.length >= 2) {
              // Apply smart merge to get optimal combination
              const mergedAttributes = smartMergeAssets(groupAssets);

              // Find asset with highest confidence (will be the base)
              const baseAsset = groupAssets.reduce((best: TempAsset, current: TempAsset) => {
                const bestScore = best.ai_confidence_score || 0;
                const currentScore = current.ai_confidence_score || 0;
                return currentScore > bestScore ? current : best;
              });

              // Update base asset with merged attributes
              updates.push({
                id: baseAsset.id,
                updates: mergedAttributes,
              });

              // Remove all other assets in the group from state
              const otherIds = groupAssets
                .filter((a: TempAsset) => a.id !== baseAsset.id)
                .map((a: TempAsset) => a.id);
              idsToRemove.push(...otherIds);
            }
            break;

          case 'delete_one':
            // Remove specific assets from state
            if (decision.assetIdsToKeep) {
              const toRemove = groupAssets
                .map((a: TempAsset) => a.id)
                .filter((id: string) => !decision.assetIdsToKeep.includes(id));
              idsToRemove.push(...toRemove);

              // Clear duplicate flag from kept assets
              decision.assetIdsToKeep.forEach((id: string) => {
                updates.push({
                  id,
                  updates: { is_duplicate: false, duplicate_matches: [] },
                });
              });
            }
            break;

          case 'ignore':
            // Mark assets as not duplicate
            groupAssets.forEach((asset: TempAsset) => {
              updates.push({
                id: asset.id,
                updates: { is_duplicate: false, duplicate_matches: [] },
              });
            });
            break;
        }
      }

      // Apply all updates to remaining assets
      updates.forEach(({ id, updates: assetUpdates }) => {
        updateAsset(id, assetUpdates);
      });

      // Remove merged/deleted assets from state entirely
      if (idsToRemove.length > 0) {
        setAssets((prev) => prev.filter((asset) => !idsToRemove.includes(asset.id)));
        setSelectedIds((prev) => prev.filter((id) => !idsToRemove.includes(id)));
      }

      toast.success('Duplicate resolutions applied');
    },
    [assets, updateAsset, setSelectedIds]
  );

  // Apply conflict resolutions from modal (cross-upload conflicts)
  const applyConflictResolutions = useCallback(
    async (decisions: any[]) => {
      console.log('Applying conflict resolutions:', decisions);

      // Collect all updates and deselections
      const updates: Array<{ id: string; updates: Partial<TempAsset> }> = [];
      const idsToDeselect: string[] = [];

      for (const decision of decisions) {
        const newAsset = assets.find((a) => a.id === decision.newAssetId);
        if (!newAsset) continue;

        switch (decision.action) {
          case 'replace_old':
            // Mark new asset to replace old (will be handled during finalize)
            // Clear duplicate flag and keep selected
            updates.push({
              id: newAsset.id,
              updates: {
                is_duplicate: false,
                duplicate_matches: [],
                notes: newAsset.notes
                  ? `${newAsset.notes} | Replaces ${decision.existingAssetId}`
                  : `Replaces ${decision.existingAssetId}`,
              },
            });
            break;

          case 'merge_values':
            // TODO: For cross-upload merge, we need to fetch existing asset and merge
            // For now, just sum the values and update new asset
            // In production, this would require API call to get existing asset data
            const existingValue = 0; // TODO: Fetch from API
            updates.push({
              id: newAsset.id,
              updates: {
                current_value: newAsset.current_value + existingValue,
                is_duplicate: false,
                duplicate_matches: [],
                notes: newAsset.notes
                  ? `${newAsset.notes} | Merged with ${decision.existingAssetId}`
                  : `Merged with ${decision.existingAssetId}`,
              },
            });
            break;

          case 'keep_both':
            // Mark as distinct (clear duplicate flag)
            updates.push({
              id: newAsset.id,
              updates: {
                is_duplicate: false,
                duplicate_matches: [],
              },
            });
            break;

          case 'skip_new':
            // Deselect new asset (keep existing)
            idsToDeselect.push(newAsset.id);
            updates.push({
              id: newAsset.id,
              updates: {
                is_duplicate: false,
                duplicate_matches: [],
              },
            });
            break;
        }
      }

      // Apply all updates
      updates.forEach(({ id, updates: assetUpdates }) => {
        updateAsset(id, assetUpdates);
      });

      // Deselect assets that need to be skipped
      if (idsToDeselect.length > 0) {
        setSelectedIds((prev) => prev.filter((id) => !idsToDeselect.includes(id)));
      }

      toast.success('Conflict resolutions applied');
    },
    [assets, updateAsset, setSelectedIds]
  );

  // Finalize review and save to snapshot
  const finalize = useCallback(
    async (options?: {
      snapshotName?: string;
      mergeWithSnapshotId?: string;
      mergeMode?: boolean;
    }) => {
      if (selectedIds.length === 0) {
        toast.error('Please select at least one asset to save');
        return null;
      }

      try {
        setIsSaving(true);

        // Flush any pending updates first
        await flushPendingUpdates();

        const request: FinalizeTempUploadRequest = {
          selected_asset_ids: selectedIds,
          merge_mode: options?.mergeMode || tempUpload?.merge_decision === 'merge' || false,
          merge_with_snapshot_id: options?.mergeWithSnapshotId || tempUpload?.matched_snapshot_id || undefined,
          snapshot_name: options?.snapshotName || tempUpload?.suggested_snapshot_name,
        };

        // Debug logging for merge params
        console.log('🔍 Finalize request:', {
          merge_mode: request.merge_mode,
          merge_with_snapshot_id: request.merge_with_snapshot_id,
          has_matched_snapshot: !!tempUpload?.matched_snapshot_id,
          merge_decision: tempUpload?.merge_decision,
          selected_count: selectedIds.length,
        });

        const response = await fetch(`/api/assets/finalize/${uploadId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        const data: FinalizeTempUploadResponse = await response.json();

        if (!response.ok || !data.success) {
          // Log detailed error info from API
          console.error('❌ API Error:', {
            error: data.error,
            details: (data as any).details,
            code: (data as any).code,
          });

          // Show detailed error message
          const errorMessage = (data as any).details
            ? `${data.error}: ${(data as any).details}`
            : data.error || 'Failed to save assets';

          throw new Error(errorMessage);
        }

        console.log(`✅ Finalized review: ${data.assets_saved} assets saved`);
        toast.success(data.message);

        // Redirect to dashboard after successful save
        router.push('/dashboard/assets');

        return data.snapshot_id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save assets';
        toast.error(message);
        console.error('❌ Finalize failed:', err);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [uploadId, selectedIds, tempUpload, flushPendingUpdates, router]
  );

  // Cancel review
  const cancel = useCallback(() => {
    router.push('/dashboard/assets');
  }, [router]);

  return {
    // State
    tempUpload,
    assets,
    selectedIds,
    isLoading,
    isSaving,
    error,

    // Actions
    updateAsset,
    deleteAsset,
    deleteSelected,
    setSelectedIds,
    applyDuplicateResolutions,
    applyConflictResolutions,
    finalize,
    cancel,
    refetch: fetchReviewSession,
  };
}
