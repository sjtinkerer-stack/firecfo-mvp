'use client';

import { use, useState } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReviewSession } from '@/app/dashboard/assets/hooks/use-review-session';
import { ReviewHeaderCard } from '@/app/dashboard/assets/components/review-header-card';
import { AssetTable } from '@/app/dashboard/assets/components/asset-table';
import { DuplicateReviewModal } from '@/app/dashboard/assets/components/duplicate-review-modal';
import { ConflictReviewModal } from '@/app/dashboard/assets/components/conflict-review-modal';
import type { DuplicateDecision } from '@/app/dashboard/assets/types/duplicate-resolution';
import type { ConflictDecision, ExistingAssetSummary } from '@/app/dashboard/assets/types/conflict-resolution';

interface PageProps {
  params: Promise<{
    uploadId: string;
  }>;
}

export default function ReviewAssetsPage({ params }: PageProps) {
  const { uploadId } = use(params);

  const {
    tempUpload,
    assets,
    selectedIds,
    isLoading,
    isSaving,
    error,
    updateAsset,
    setSelectedIds,
    applyDuplicateResolutions,
    applyConflictResolutions,
    finalize,
    cancel,
  } = useReviewSession({ uploadId });

  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  // Calculate summary stats
  const selectedAssets = assets.filter((a) => selectedIds.includes(a.id));
  const selectedValue = selectedAssets.reduce((sum, asset) => sum + asset.current_value, 0);

  // Count intra-upload duplicates (within this upload)
  const intraUploadDuplicates = assets.filter((a) => {
    if (!a.is_duplicate || !a.duplicate_matches) return false;
    // Check if any matches are from current upload (same temp_upload_id)
    return a.duplicate_matches.some(m =>
      assets.some(asset =>
        asset.asset_name === m.existing_asset_name &&
        Math.abs(asset.current_value - m.existing_value) < 1
      )
    );
  });
  const duplicatesCount = intraUploadDuplicates.length;

  // Count cross-upload conflicts (with existing snapshots)
  const crossUploadConflicts = assets.filter((a) => {
    if (!a.is_duplicate || !a.duplicate_matches) return false;
    // Check if any matches are from existing snapshots (not in current upload)
    return a.duplicate_matches.some(m =>
      !assets.some(asset =>
        asset.asset_name === m.existing_asset_name &&
        Math.abs(asset.current_value - m.existing_value) < 1
      )
    );
  });
  const conflictsCount = crossUploadConflicts.length;

  // TODO: Fetch existing assets from API for conflict resolution
  // For now, extract from duplicate_matches
  const existingAssets: ExistingAssetSummary[] = crossUploadConflicts.flatMap((asset) =>
    (asset.duplicate_matches || [])
      .filter(m =>
        !assets.some(a =>
          a.asset_name === m.existing_asset_name &&
          Math.abs(a.current_value - m.existing_value) < 1
        )
      )
      .map(m => ({
        id: m.existing_asset_id || `existing-${m.existing_asset_name}`,
        asset_name: m.existing_asset_name,
        current_value: m.existing_value,
        asset_class: 'equity', // TODO: Get from API
        source_snapshot_name: m.existing_source || 'Previous Snapshot',
        source_file: m.existing_source,
      }))
  );

  // Handlers
  const handleSave = async () => {
    await finalize();
  };

  const handleApplyDuplicateResolutions = (decisions: DuplicateDecision[]) => {
    applyDuplicateResolutions(decisions);
    setDuplicateModalOpen(false);
  };

  const handleApplyConflictResolutions = (decisions: ConflictDecision[]) => {
    applyConflictResolutions(decisions);
    setConflictModalOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading assets...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !tempUpload) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Failed to Load Review Session
          </h2>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            {error || 'Could not find upload session'}
          </p>
          <Button
            onClick={() => cancel()}
            variant="outline"
            className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancel}
                className="text-gray-600 dark:text-gray-400"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Review Extracted Assets
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Review, edit, and select assets before saving to snapshot
                </p>
              </div>
            </div>

            {/* Save button only */}
            <Button
              onClick={handleSave}
              disabled={selectedIds.length === 0 || isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save {selectedIds.length > 0 && `(${selectedIds.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Unified Header Card */}
        <ReviewHeaderCard
          detectedDate={tempUpload.statement_date || new Date().toISOString()}
          confidence={tempUpload.statement_date_confidence || undefined}
          snapshotName={tempUpload.suggested_snapshot_name || 'Unnamed Snapshot'}
          isNewSnapshot={tempUpload.merge_decision === 'create_new'}
          isMergeMode={tempUpload.merge_decision === 'merge'}
          totalAssets={assets.length}
          selectedAssets={selectedIds.length}
          duplicateCount={duplicatesCount}
          conflictCount={conflictsCount}
          onChangeDate={() => console.log('Change date')}
          onChangeSnapshot={() => console.log('Change snapshot')}
          onReviewDuplicates={() => setDuplicateModalOpen(true)}
          onReviewConflicts={() => setConflictModalOpen(true)}
          onClearAll={() => setSelectedIds([])}
        />

        {/* Assets table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Assets ({assets.length})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Click on any cell to edit. Changes are saved automatically.
            </p>
          </div>

          <div className="p-4">
            <AssetTable
              assets={assets}
              selectedIds={selectedIds}
              conflictIds={crossUploadConflicts.map((a) => a.id)}
              onSelectionChange={setSelectedIds}
              onUpdate={updateAsset}
            />
          </div>
        </div>
      </div>

      {/* Duplicate Review Modal */}
      <DuplicateReviewModal
        isOpen={duplicateModalOpen}
        assets={assets}
        onClose={() => setDuplicateModalOpen(false)}
        onApplyResolutions={handleApplyDuplicateResolutions}
      />

      {/* Conflict Review Modal */}
      <ConflictReviewModal
        isOpen={conflictModalOpen}
        newAssets={crossUploadConflicts}
        existingAssets={existingAssets}
        onClose={() => setConflictModalOpen(false)}
        onApplyResolutions={handleApplyConflictResolutions}
      />
    </div>
  );
}
