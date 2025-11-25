// Page: Asset Hub - Main asset tracking interface

'use client';

import { useState, useEffect } from 'react';
import { Upload, TrendingUp, Loader2 } from 'lucide-react';
import { UploadModal } from './components/upload-modal';
import { ReviewAssetsModal } from './components/review-assets-modal';
import { useAssetSnapshots } from './hooks/use-asset-snapshots';
import { useAssetManagement } from './hooks/use-asset-management';
import { ReviewAsset } from '@/app/lib/assets';
import { toast } from 'sonner';

export default function AssetsPage() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAssets, setReviewAssets] = useState<ReviewAsset[]>([]);
  const [reviewSummary, setReviewSummary] = useState<any>(null);

  const { snapshots, summary, loading, fetchSnapshots } = useAssetSnapshots(true);
  const { listAssets, loading: assetsLoading } = useAssetManagement();
  const [assetsData, setAssetsData] = useState<any>(null);

  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  // Fetch assets for latest snapshot
  useEffect(() => {
    if (latestSnapshot) {
      listAssets(latestSnapshot.id).then((data) => {
        if (data) {
          setAssetsData(data);
        }
      });
    }
  }, [latestSnapshot, listAssets]);

  const handleUploadSuccess = (assets: ReviewAsset[], uploadSummary: any) => {
    setReviewAssets(assets);
    setReviewSummary(uploadSummary);
    setReviewModalOpen(true);
  };

  const handleReviewSuccess = () => {
    // Refresh snapshots and assets
    fetchSnapshots();
    toast.success('Assets saved successfully! Refreshing...');
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
                  Last updated:{' '}
                  {new Date(latestSnapshot.snapshot_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
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
                  {assetsData.assets.slice(0, 10).map((asset: any) => (
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
                {assetsData.assets.length > 10 && (
                  <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Showing 10 of {assetsData.assets.length} assets
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
                  {snapshots.slice(0, 5).map((snapshot) => (
                    <div key={snapshot.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(snapshot.snapshot_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {snapshot.asset_count} asset{snapshot.asset_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(snapshot.total_networth)}
                      </p>
                    </div>
                  ))}
                </div>
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
          onClose={() => setReviewModalOpen(false)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}
