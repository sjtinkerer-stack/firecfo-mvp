// Component: Review Extracted Assets Modal

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Loader2,
  TrendingUp,
  Shield,
  Wallet,
  Sparkles,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ReviewAsset } from '@/app/lib/assets';
import { useAssetManagement } from '../hooks/use-asset-management';
import { toast } from 'sonner';
import { CancelConfirmationDialog } from './cancel-confirmation-dialog';
import { SnapshotDecisionModal } from './snapshot-decision-modal';
import { StatementDateTabs } from './statement-date-tabs';

interface StatementDateGroup {
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

interface ReviewAssetsModalProps {
  isOpen: boolean;
  assets: ReviewAsset[];
  summary: any;
  statementDateGroups?: StatementDateGroup[];
  onClose: () => void;
  onSuccess: () => void;
}

// Asset Card Component
function AssetCard({
  asset,
  onToggleSelect,
  formatCurrency,
  getConfidenceColor,
  getRiskIcon,
}: {
  asset: ReviewAsset;
  onToggleSelect: (id: string) => void;
  formatCurrency: (value: number) => string;
  getConfidenceColor: (confidence: number) => string;
  getRiskIcon: (riskLevel: string) => React.ReactNode;
}) {
  return (
    <div
      className={`
        border rounded-lg p-4 transition-all
        ${
          asset.is_duplicate
            ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700'
            : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'
        }
        ${asset.is_selected && asset.is_duplicate ? 'ring-2 ring-amber-500' : ''}
        ${asset.is_selected && !asset.is_duplicate ? 'ring-2 ring-emerald-500' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={asset.is_selected}
          onChange={() => onToggleSelect(asset.id)}
          className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
        />

        {/* Asset Details */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {asset.asset_name}
              </h4>
              <p className="text-lg text-gray-700 dark:text-gray-300 font-medium mt-1">
                ₹{asset.current_value.toLocaleString('en-IN')}
              </p>
              {asset.quantity && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Quantity: {asset.quantity}</p>
              )}
            </div>
            <button
              onClick={() => {
                toast.info('Edit mapping feature coming soon!');
              }}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          </div>

          {/* Classification Tags */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full font-medium">
              {asset.asset_class} → {asset.asset_subclass.replace(/_/g, ' ')}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${getConfidenceColor(
                asset.ai_confidence_score
              )}`}
            >
              {asset.verified_via === 'api_lookup' && <CheckCircle2 className="w-3 h-3" />}
              {(asset.ai_confidence_score * 100).toFixed(0)}% confidence
            </span>
            <span className="text-xs px-2 py-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded-full font-medium flex items-center gap-1">
              {getRiskIcon(asset.risk_level)}
              {asset.risk_level.replace(/_/g, ' ')} risk
            </span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full font-medium">
              {asset.expected_return_percentage}% return
            </span>
            {asset.verified_via === 'api_lookup' && (
              <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-full font-medium border border-emerald-200 dark:border-emerald-700">
                ✓ API Verified
              </span>
            )}
          </div>

          {/* Source File & Identifiers */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
            {asset.source_file && <p>From: {asset.source_file}</p>}
            {(asset.isin || asset.ticker_symbol) && (
              <p className="flex items-center gap-2 flex-wrap">
                {asset.isin && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono">
                    ISIN: {asset.isin}
                  </span>
                )}
                {asset.ticker_symbol && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono">
                    {asset.ticker_symbol}
                    {asset.exchange && ` (${asset.exchange})`}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Duplicate Matches */}
          {asset.is_duplicate && asset.duplicate_matches && asset.duplicate_matches.length > 0 && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                ⚠️ Similar assets found:
              </p>
              {asset.duplicate_matches.map((match, i) => (
                <div
                  key={i}
                  className="text-sm text-amber-800 dark:text-amber-300 mt-1 flex items-start gap-2"
                >
                  <span className="text-amber-600">•</span>
                  <span className="flex-1">
                    <span className="font-medium">{match.existing_asset_name}</span>{' '}
                    (₹{match.existing_value.toLocaleString('en-IN')})
                    {' — '}
                    <span className="text-xs">
                      {(match.similarity_score * 100).toFixed(0)}% match • {match.match_type}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReviewAssetsModal({
  isOpen,
  assets: initialAssets,
  summary,
  statementDateGroups,
  onClose,
  onSuccess,
}: ReviewAssetsModalProps) {
  const [assets, setAssets] = useState<ReviewAsset[]>(initialAssets);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [highConfidenceCollapsed, setHighConfidenceCollapsed] = useState(true);
  const { saveAssets, saving } = useAssetManagement();

  // Snapshot destination state
  const [mergeDecisions, setMergeDecisions] = useState<Record<string, {
    action: 'merge' | 'create_new' | 'edit_date';
    targetSnapshotId?: string;
    newSnapshotName?: string;
    editedStatementDate?: string;
  }>>(() => {
    // Initialize with default recommendations
    const initial: Record<string, any> = {};
    statementDateGroups?.forEach((group) => {
      if (group.suggested_action === 'merge' && group.matched_snapshot) {
        initial[group.statement_date] = {
          action: 'merge',
          targetSnapshotId: group.matched_snapshot.id,
        };
      } else if (group.suggested_action === 'prompt') {
        // Default to merge for close matches
        initial[group.statement_date] = {
          action: 'merge',
          targetSnapshotId: group.matched_snapshot?.id,
        };
      } else {
        initial[group.statement_date] = {
          action: 'create_new',
          newSnapshotName: group.suggested_snapshot_name,
        };
      }
    });
    return initial;
  });

  const duplicateCount = useMemo(
    () => assets.filter((a) => a.is_duplicate).length,
    [assets]
  );

  const selectedCount = useMemo(
    () => assets.filter((a) => a.is_selected).length,
    [assets]
  );

  const selectedDuplicatesCount = useMemo(
    () => assets.filter((a) => a.is_selected && a.is_duplicate).length,
    [assets]
  );

  // Sort assets: duplicates first, then non-duplicates
  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      // Duplicates first
      if (a.is_duplicate && !b.is_duplicate) return -1;
      if (!a.is_duplicate && b.is_duplicate) return 1;
      // Within each group, maintain original order
      return 0;
    });
  }, [assets]);

  // Separate high confidence from needs attention (for collapsible sections)
  const highConfidenceAssets = useMemo(() => {
    return sortedAssets.filter(
      (a) => !a.is_duplicate && a.ai_confidence_score >= 0.8 && a.verified_via === 'api_lookup'
    );
  }, [sortedAssets]);

  const needsAttentionAssets = useMemo(() => {
    return sortedAssets.filter(
      (a) => a.is_duplicate || a.ai_confidence_score < 0.8 || a.verified_via !== 'api_lookup'
    );
  }, [sortedAssets]);

  // Calculate total value of selected assets
  const selectedTotalValue = useMemo(() => {
    return assets.reduce((sum, a) => sum + (a.is_selected ? a.current_value : 0), 0);
  }, [assets]);

  // Auto-expand high confidence section if there are no "needs attention" assets
  useEffect(() => {
    if (needsAttentionAssets.length === 0 && highConfidenceAssets.length > 0) {
      setHighConfidenceCollapsed(false);
    }
  }, [needsAttentionAssets.length, highConfidenceAssets.length]);

  const handleToggleSelect = (assetId: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, is_selected: !a.is_selected } : a))
    );
  };

  const handleClose = () => {
    // Show confirmation if currently saving
    if (saving) {
      setShowCancelConfirmation(true);
      return;
    }
    // Close normally if not saving
    onClose();
  };

  const handleConfirmCancel = () => {
    // User confirmed they want to cancel
    setShowCancelConfirmation(false);
    onClose();
  };

  const handleCancelConfirmation = () => {
    // User wants to go back and continue
    setShowCancelConfirmation(false);
  };

  const handleSave = async () => {
    const assetsToSave = assets.filter((a) => a.is_selected);

    if (assetsToSave.length === 0) {
      toast.error('Please select at least one asset to save');
      return;
    }

    // Show warning if saving duplicates
    if (selectedDuplicatesCount > 0) {
      toast.warning(`Saving ${selectedDuplicatesCount} potential duplicate(s) - please verify manually`);
    }

    const sourceFiles = [...new Set(assets.map((a) => a.source_file).filter(Boolean))] as string[];

    // Determine merge options from first group (for now, support single group)
    const firstGroup = statementDateGroups?.[0];
    const decision = firstGroup ? mergeDecisions[firstGroup.statement_date] : null;

    const result = await saveAssets(
      assetsToSave,
      sourceFiles,
      `Uploaded ${summary.total_files} file(s) with AI classification`,
      decision?.action === 'merge' ? decision.targetSnapshotId : undefined,
      decision?.action === 'merge',
      firstGroup?.statement_date,
      decision?.newSnapshotName
    );

    if (result) {
      toast.success(result.message);
      onSuccess();
      handleClose();
    } else {
      toast.error('Failed to save assets. Please try again.');
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
    if (confidence >= 0.7) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
      case 'very_high':
        return <TrendingUp className="w-4 h-4" />;
      case 'low':
      case 'very_low':
        return <Shield className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Only allow closing via explicit user actions (Cancel/Save buttons)
        // Prevent closing by clicking outside or pressing Escape
        if (!open && !saving) {
          // User trying to close - ignore it
          return;
        }
      }}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            Review Extracted Assets ({assets.length} found)
          </DialogTitle>
        </DialogHeader>

        {/* Summary Banner */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Assets</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{assets.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Selected</p>
            <p className="text-2xl font-bold text-emerald-600">{selectedCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Duplicates</p>
            <p className="text-2xl font-bold text-amber-600">{duplicateCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Processing Time</p>
            <p className="text-2xl font-bold text-blue-600">
              {(summary.processing_time_ms / 1000).toFixed(1)}s
            </p>
          </div>
        </div>

        {/* Duplicate Warning */}
        {duplicateCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                {duplicateCount} potential duplicate{duplicateCount > 1 ? 's' : ''} detected
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Duplicates are automatically unselected. You can manually check them if you want to save anyway.
              </p>
            </div>
          </div>
        )}

        {/* Collapsed Snapshot Destination Section */}
        {(!statementDateGroups || statementDateGroups.length === 0) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    📁 Saving to: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} (new snapshot)
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {selectedCount} assets • {formatCurrency(selectedTotalValue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {statementDateGroups && statementDateGroups.length > 0 && (
          <div className="space-y-3">
            {/* Collapsed snapshot summary */}
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {statementDateGroups.length === 1 ? (
                      <>
                        {(() => {
                          const group = statementDateGroups[0];
                          const decision = mergeDecisions[group.statement_date];
                          if (decision?.action === 'merge' && group.matched_snapshot) {
                            return `📁 Merging into: ${group.matched_snapshot.snapshot_name || 'Unnamed'}`;
                          }
                          return `📁 Saving to: ${decision?.newSnapshotName || group.suggested_snapshot_name} (new snapshot)`;
                        })()}
                      </>
                    ) : (
                      `📁 Saving to: ${statementDateGroups.length} Snapshot Groups`
                    )}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {statementDateGroups.length === 1 ? (
                      <>
                        {new Date(statementDateGroups[0].statement_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        • {selectedCount} assets • {formatCurrency(selectedTotalValue)}
                      </>
                    ) : (
                      <>
                        {statementDateGroups.map((g, i) => (
                          <span key={i}>
                            {new Date(g.statement_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                            {i < statementDateGroups.length - 1 && ', '}
                          </span>
                        ))}
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowDecisionModal(true)}
                  className="text-xs px-3 py-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded transition-colors font-medium"
                >
                  Change...
                </button>
              </div>
            </div>

            {/* Tabs for multi-date uploads */}
            {statementDateGroups.length > 1 && (
              <StatementDateTabs
                groups={statementDateGroups}
                selectedIndex={selectedTabIndex}
                mergeDecisions={mergeDecisions}
                onSelectTab={setSelectedTabIndex}
              />
            )}
          </div>
        )}

        {/* Assets List with Collapsible Sections */}
        <div className="overflow-y-auto space-y-4 pr-2 max-h-[calc(85vh-520px)]">
          {/* High Confidence Section */}
          {highConfidenceAssets.length > 0 && (
            <div>
              <button
                onClick={() => setHighConfidenceCollapsed(!highConfidenceCollapsed)}
                className="w-full flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-emerald-900 dark:text-emerald-100">
                    {highConfidenceAssets.length} High Confidence Assets
                  </span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">
                    (Auto-selected, API verified)
                  </span>
                </div>
                {highConfidenceCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-emerald-600" />
                )}
              </button>

              {!highConfidenceCollapsed && (
                <div className="mt-3 space-y-3">
                  {highConfidenceAssets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      onToggleSelect={handleToggleSelect}
                      formatCurrency={formatCurrency}
                      getConfidenceColor={getConfidenceColor}
                      getRiskIcon={getRiskIcon}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Needs Attention Section */}
          {needsAttentionAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  {needsAttentionAssets.length} Need Your Attention
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  (Duplicates or low confidence)
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {needsAttentionAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onToggleSelect={handleToggleSelect}
                    formatCurrency={formatCurrency}
                    getConfidenceColor={getConfidenceColor}
                    getRiskIcon={getRiskIcon}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State - defensive check */}
          {highConfidenceAssets.length === 0 && needsAttentionAssets.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                No assets to review
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                This shouldn't happen. Please try uploading again or contact support.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Assets
          </button>
        </div>
      </DialogContent>
    </Dialog>

      <SnapshotDecisionModal
        isOpen={showDecisionModal}
        statementDateGroups={statementDateGroups || []}
        mergeDecisions={mergeDecisions}
        totalValue={selectedTotalValue}
        selectedCount={selectedCount}
        onClose={() => setShowDecisionModal(false)}
        onApply={(decisions) => {
          setMergeDecisions(decisions);
        }}
      />

      <CancelConfirmationDialog
        isOpen={showCancelConfirmation}
        processingType="save"
        onConfirm={handleConfirmCancel}
        onCancel={handleCancelConfirmation}
      />
    </>
  );
}
