// Page: Asset Hub - Main asset tracking interface

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, TrendingUp, Loader2, Pencil, Trash2, Check, X } from 'lucide-react';
import { UploadModal } from './components/upload-modal';
import { ReviewAssetsModal } from './components/review-assets-modal';
import { useAssetSnapshots } from './hooks/use-asset-snapshots';
import { useAssetManagement } from './hooks/use-asset-management';
import { UploadResult, StatementDateGroup } from './hooks/use-asset-upload';
import { ReviewAsset } from '@/app/lib/assets';
import { toast } from 'sonner';

export default function AssetsPage() {
  const router = useRouter();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAssets, setReviewAssets] = useState<ReviewAsset[]>([]);
  const [reviewSummary, setReviewSummary] = useState<any>(null);
  const [statementDateGroups, setStatementDateGroups] = useState<StatementDateGroup[] | undefined>(undefined);

  // Snapshot management state
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Infinite scroll state
  const [displayedAssetCount, setDisplayedAssetCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const { snapshots, summary, loading, fetchSnapshots } = useAssetSnapshots(true);
  const { listAssets, renameSnapshot, deleteSnapshot, loading: assetsLoading } = useAssetManagement();
  const [assetsData, setAssetsData] = useState<any>(null);

  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  // Fetch assets for latest snapshot
  useEffect(() => {
    if (latestSnapshot) {
      listAssets(latestSnapshot.id).then((data) => {
        if (data) {
          setAssetsData(data);
          setDisplayedAssetCount(10); // Reset to 10 when new data loads
        }
      });
    }
  }, [latestSnapshot, listAssets]);

  // Infinite scroll: Load more assets when user scrolls to bottom
  const loadMoreAssets = useCallback(() => {
    if (!assetsData || loadingMore) return;

    const totalAssets = assetsData.assets.length;
    if (displayedAssetCount >= totalAssets) return; // All loaded

    setLoadingMore(true);

    // Simulate async loading (in real app, this would be an API call)
    setTimeout(() => {
      setDisplayedAssetCount((prev) => Math.min(prev + 10, totalAssets));
      setLoadingMore(false);
    }, 300);
  }, [assetsData, displayedAssetCount, loadingMore]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreAssets();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMoreAssets]);

  const handleUploadSuccess = async (result: UploadResult) => {
    try {
      // Create temporary upload session for review
      const response = await fetch('/api/assets/review/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: result.assets,
          file_names: result.summary.file_details?.map((f) => f.fileName) || [],
          statement_date: result.statement_date_groups?.[0]?.statement_date,
          statement_date_confidence: 'high', // TODO: Extract from API response
          statement_date_source: 'document_content', // TODO: Extract from API response
          suggested_snapshot_name: result.statement_date_groups?.[0]?.suggested_snapshot_name,
          matched_snapshot_id: result.statement_date_groups?.[0]?.matched_snapshot?.id,
          merge_decision: result.statement_date_groups?.[0]?.suggested_action === 'merge' ? 'merge' : 'create_new',
          processing_time_ms: result.summary.processing_time_ms,
          duplicates_found: result.summary.duplicates_found || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create review session');
      }

      // Redirect to review route
      router.push(`/dashboard/assets/review/${data.upload_id}`);
    } catch (error) {
      console.error('❌ Failed to create review session:', error);
      toast.error('Failed to start review. Please try again.');

      // Fallback: open modal if API fails
      setReviewAssets(result.assets);
      setReviewSummary(result.summary);
      setStatementDateGroups(result.statement_date_groups);
      setReviewModalOpen(true);
    }
  };

  const handleReviewSuccess = () => {
    // Refresh snapshots and assets
    fetchSnapshots();
    toast.success('Assets saved successfully! Refreshing...');
  };

  const handleStartEdit = (snapshotId: string, currentName: string) => {
    setEditingSnapshotId(snapshotId);
    setEditValue(currentName);
  };

  const handleCancelEdit = () => {
    setEditingSnapshotId(null);
    setEditValue('');
  };

  const handleSaveEdit = async (snapshotId: string) => {
    if (!editValue.trim()) {
      toast.error('Snapshot name cannot be empty');
      return;
    }

    if (editValue.trim().length < 3) {
      toast.error('Snapshot name must be at least 3 characters');
      return;
    }

    const success = await renameSnapshot(snapshotId, editValue.trim());
    if (success) {
      toast.success('Snapshot renamed successfully');
      fetchSnapshots();
      setEditingSnapshotId(null);
      setEditValue('');
    } else {
      toast.error('Failed to rename snapshot');
    }
  };

  const handleDeleteClick = (snapshotId: string) => {
    setDeleteConfirmId(snapshotId);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleConfirmDelete = async (snapshotId: string) => {
    const success = await deleteSnapshot(snapshotId);
    if (success) {
      toast.success('Snapshot deleted successfully');
      fetchSnapshots();
      setDeleteConfirmId(null);
      // If we deleted the latest snapshot, clear assets data
      if (latestSnapshot?.id === snapshotId) {
        setAssetsData(null);
      }
    } else {
      toast.error('Failed to delete snapshot');
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)} L`;
    } else {
      return `₹${value.toLocaleString('en-IN')}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Asset Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track your portfolio with AI-powered statement analysis
              </p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Upload className="w-5 h-5" />
              Upload Statements
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading your assets...</span>
          </div>
        ) : latestSnapshot ? (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Net Worth</span>
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(latestSnapshot.total_networth)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {latestSnapshot.statement_date ? (
                    <>
                      Statement date:{' '}
                      {new Date(latestSnapshot.statement_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </>
                  ) : (
                    <>
                      Last updated:{' '}
                      {new Date(latestSnapshot.snapshot_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </>
                  )}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Equity</span>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(latestSnapshot.equity_total)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {((latestSnapshot.equity_total / latestSnapshot.total_networth) * 100).toFixed(1)}% of portfolio
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Debt</span>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(latestSnapshot.debt_total)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {((latestSnapshot.debt_total / latestSnapshot.total_networth) * 100).toFixed(1)}% of portfolio
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Total Assets</span>
                <p className="text-2xl font-bold text-violet-600">
                  {latestSnapshot.asset_count || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Across {Object.keys(assetsData?.summary?.by_class || {}).length} categories
                </p>
              </div>
            </div>

            {/* Assets Breakdown */}
            {assetsData && assetsData.assets.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Your Assets
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {assetsData.assets.length} asset{assetsData.assets.length !== 1 ? 's' : ''} tracked
                  </p>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {assetsData.assets.slice(0, displayedAssetCount).map((asset: any) => (
                    <div key={asset.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {asset.asset_name}
                          </h4>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded">
                              {asset.asset_class}
                            </span>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                              {asset.asset_subclass.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            ₹{asset.current_value.toLocaleString('en-IN')}
                          </p>
                          {asset.quantity && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Qty: {asset.quantity}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Infinite scroll: Observer target + loading/complete indicator */}
                {displayedAssetCount < assetsData.assets.length && (
                  <div ref={observerTarget} className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
                    {loadingMore ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Loading more assets...
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {displayedAssetCount} of {assetsData.assets.length} assets
                      </p>
                    )}
                  </div>
                )}

                {/* All assets loaded indicator */}
                {displayedAssetCount >= assetsData.assets.length && assetsData.assets.length > 10 && (
                  <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ All {assetsData.assets.length} assets loaded
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Snapshot History */}
            {snapshots.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Net Worth History
                </h2>
                <div className="space-y-3">
                  {snapshots.slice(0, 5).map((snapshot) => {
                    const isEditing = editingSnapshotId === snapshot.id;
                    const snapshotName =
                      snapshot.snapshot_name ||
                      new Date(snapshot.snapshot_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      });

                    return (
                      <div
                        key={snapshot.id}
                        className="group flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          {/* Snapshot Name or Edit Input */}
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 px-3 py-1.5 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                placeholder="Enter snapshot name"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(snapshot.id)}
                                className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4 text-emerald-600" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {snapshotName}
                              </p>
                              {/* Action Buttons (visible on hover) */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEdit(snapshot.id, snapshotName)}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                  title="Rename"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(snapshot.id)}
                                  className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Statement Date (if different from snapshot_date) */}
                          {!isEditing &&
                            snapshot.statement_date &&
                            snapshot.statement_date !== snapshot.snapshot_date.split('T')[0] && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Statement date:{' '}
                                {new Date(snapshot.statement_date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            )}

                          {/* Asset count and upload info */}
                          {!isEditing && (
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {snapshot.asset_count} asset{snapshot.asset_count !== 1 ? 's' : ''}
                              </p>
                              {snapshot.source_files && snapshot.source_files.length > 0 && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {snapshot.source_files.length} file
                                    {snapshot.source_files.length !== 1 ? 's' : ''}
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Net Worth */}
                        {!isEditing && (
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-4">
                            {formatCurrency(snapshot.total_networth)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {snapshots.length > 5 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
                    Showing 5 of {snapshots.length} snapshots
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                No Assets Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Upload your broker statements, bank statements, or mutual fund reports to get started with AI-powered asset tracking.
              </p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-medium inline-flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Your First Statement
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {reviewModalOpen && (
        <ReviewAssetsModal
          isOpen={reviewModalOpen}
          assets={reviewAssets}
          summary={reviewSummary}
          statementDateGroups={statementDateGroups}
          onClose={() => setReviewModalOpen(false)}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Delete Snapshot?
              </h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to delete this snapshot? This will permanently remove:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                <li>
                  {snapshots.find((s) => s.id === deleteConfirmId)?.asset_count || 0} asset
                  {snapshots.find((s) => s.id === deleteConfirmId)?.asset_count !== 1 ? 's' : ''}
                </li>
                <li>All associated data and files</li>
                <li>Historical record of this snapshot</li>
              </ul>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                  ⚠️ This action cannot be undone
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
