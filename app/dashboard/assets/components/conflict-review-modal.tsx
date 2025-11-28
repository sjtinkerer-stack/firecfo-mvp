'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, GitMerge, Eye, Replace, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TempAsset } from '@/app/lib/assets/temp-storage-types';
import type {
  AssetConflict,
  ConflictDecision,
  ConflictResolutionAction,
  ExistingAssetSummary,
} from '../types/conflict-resolution';
import { groupConflicts } from '../types/conflict-resolution';

interface ConflictReviewModalProps {
  isOpen: boolean;
  newAssets: TempAsset[];
  existingAssets: ExistingAssetSummary[];
  onClose: () => void;
  onApplyResolutions: (decisions: ConflictDecision[]) => void;
}

export function ConflictReviewModal({
  isOpen,
  newAssets,
  existingAssets,
  onClose,
  onApplyResolutions,
}: ConflictReviewModalProps) {
  const [conflicts] = useState<AssetConflict[]>(() => groupConflicts(newAssets, existingAssets));
  const [decisions, setDecisions] = useState<Map<string, ConflictDecision>>(new Map());

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleAction = (
    conflictId: string,
    action: ConflictResolutionAction,
    conflict: AssetConflict
  ) => {
    const decision: ConflictDecision = {
      conflictId,
      action,
      newAssetId: conflict.newAsset.id,
      existingAssetId: conflict.existingAsset.id,
    };

    setDecisions((prev) => new Map(prev).set(conflictId, decision));
  };

  const handleApply = () => {
    const decisionsArray = Array.from(decisions.values());
    onApplyResolutions(decisionsArray);
    onClose();
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'replace_old':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Replace className="w-3 h-3" />
            Recommended: Replace old
          </span>
        );
      case 'merge_values':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            <GitMerge className="w-3 h-3" />
            Recommended: Merge values
          </span>
        );
      case 'keep_both':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Check className="w-3 h-3" />
            Recommended: Keep both
          </span>
        );
      case 'skip_new':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            <SkipForward className="w-3 h-3" />
            Recommended: Skip new
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Review needed
          </span>
        );
    }
  };

  const getDecisionStatus = (conflictId: string) => {
    const decision = decisions.get(conflictId);
    if (!decision) return null;

    const labels = {
      replace_old: 'Will replace old',
      merge_values: 'Will merge values',
      keep_both: 'Will keep both',
      skip_new: 'Will skip new',
    };

    return (
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
        ✓ {labels[decision.action]}
      </span>
    );
  };

  if (conflicts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in zoom-in-95 duration-200">
          <div className="text-center">
            <Check className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Conflicts Found
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              All assets are unique or were auto-resolved.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Review Conflicts
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'} with existing
              assets
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {conflicts.map((conflict, index) => (
            <div
              key={conflict.id}
              className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
            >
              {/* Conflict Header */}
              <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Conflict {index + 1}
                    </span>
                    {getRecommendationBadge(conflict.recommendation)}
                    {getDecisionStatus(conflict.id)}
                  </div>
                </div>
              </div>

              {/* Assets Comparison */}
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {/* New Asset */}
                <div className="px-4 py-3 bg-blue-50/30 dark:bg-blue-900/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          New
                        </span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {conflict.newAsset.asset_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>Source: {conflict.newAsset.source_file || 'Current upload'}</span>
                        <span>Value: {formatCurrency(conflict.newAsset.current_value)}</span>
                        <span className="capitalize">{conflict.newAsset.asset_class}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Existing Asset */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          Existing
                        </span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {conflict.existingAsset.asset_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>Snapshot: {conflict.existingAsset.source_snapshot_name}</span>
                        <span>Value: {formatCurrency(conflict.existingAsset.current_value)}</span>
                        <span className="capitalize">{conflict.existingAsset.asset_class}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 dark:bg-gray-800/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(conflict.id, 'replace_old', conflict)}
                    className={cn(
                      'transition-all duration-200',
                      decisions.get(conflict.id)?.action === 'replace_old' &&
                        'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400'
                    )}
                  >
                    <Replace className="w-4 h-4 mr-1.5" />
                    Replace old
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(conflict.id, 'merge_values', conflict)}
                    className={cn(
                      'transition-all duration-200',
                      decisions.get(conflict.id)?.action === 'merge_values' &&
                        'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-400'
                    )}
                  >
                    <GitMerge className="w-4 h-4 mr-1.5" />
                    Merge values
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(conflict.id, 'keep_both', conflict)}
                    className={cn(
                      'transition-all duration-200',
                      decisions.get(conflict.id)?.action === 'keep_both' &&
                        'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
                    )}
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Keep both
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(conflict.id, 'skip_new', conflict)}
                    className={cn(
                      'transition-all duration-200',
                      decisions.get(conflict.id)?.action === 'skip_new' &&
                        'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    )}
                  >
                    <SkipForward className="w-4 h-4 mr-1.5" />
                    Skip new
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {decisions.size} of {conflicts.length} conflicts resolved
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={decisions.size === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Apply Resolutions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
