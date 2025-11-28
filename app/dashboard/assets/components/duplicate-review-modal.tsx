'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, Trash2, GitMerge, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TempAsset } from '@/app/lib/assets/temp-storage-types';
import type {
  DuplicateGroup,
  DuplicateDecision,
  DuplicateResolutionAction,
} from '../types/duplicate-resolution';
import { groupDuplicates } from '../types/duplicate-resolution';

interface DuplicateReviewModalProps {
  isOpen: boolean;
  assets: TempAsset[];
  onClose: () => void;
  onApplyResolutions: (decisions: DuplicateDecision[]) => void;
}

export function DuplicateReviewModal({
  isOpen,
  assets,
  onClose,
  onApplyResolutions,
}: DuplicateReviewModalProps) {
  const [groups] = useState<DuplicateGroup[]>(() => groupDuplicates(assets));
  const [decisions, setDecisions] = useState<Map<string, DuplicateDecision>>(new Map());

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

  const handleAction = (groupId: string, action: DuplicateResolutionAction, assetIds?: string[]) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const decision: DuplicateDecision = {
      groupId,
      action,
      assetIdsToKeep: assetIds,
      mergedValue: action === 'merge'
        ? group.assets.reduce((sum, a) => sum + a.current_value, 0)
        : undefined,
      groupAssets: group.assets, // Pass full group assets to hook
    };

    setDecisions(prev => new Map(prev).set(groupId, decision));
  };

  const handleApply = () => {
    const decisionsArray = Array.from(decisions.values());
    onApplyResolutions(decisionsArray);
    onClose();
  };

  const getRecommendationBadge = (recommendation: string, assetCount: number) => {
    switch (recommendation) {
      case 'merge':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <GitMerge className="w-3 h-3" />
            Recommended: Merge
          </span>
        );
      case 'keep_both':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Check className="w-3 h-3" />
            Recommended: {assetCount === 2 ? 'Keep both' : 'Keep all'}
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

  const getDecisionStatus = (groupId: string) => {
    const decision = decisions.get(groupId);
    if (!decision) return null;

    const labels = {
      keep_both: 'Will keep all',
      merge: 'Will merge',
      delete_one: 'Will delete selected',
      ignore: 'Will ignore warning',
    };

    return (
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
        ✓ {labels[decision.action]}
      </span>
    );
  };

  if (groups.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in zoom-in-95 duration-200">
          <div className="text-center">
            <Check className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Duplicates Found
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              All assets appear to be unique. You can proceed with saving.
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
              Review Duplicates
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {groups.length} {groups.length === 1 ? 'group' : 'groups'} of possible duplicates found
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {groups.map((group, index) => (
            <div
              key={group.id}
              className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
            >
              {/* Group Header */}
              <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Group {index + 1}
                    </span>
                    {getRecommendationBadge(group.recommendation, group.assets.length)}
                    {getDecisionStatus(group.id)}
                  </div>
                </div>
              </div>

              {/* Assets in Group */}
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {group.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {asset.asset_name}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <span>Source: {asset.source_file || 'Current upload'}</span>
                          <span>Value: {formatCurrency(asset.current_value)}</span>
                          <span className="capitalize">{asset.asset_class}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="bg-gray-50 dark:bg-gray-800/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(group.id, 'keep_both')}
                    className={cn(
                      'transition-all duration-200',
                      decisions.get(group.id)?.action === 'keep_both' &&
                        'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
                    )}
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    {group.assets.length === 2 ? 'Keep both' : 'Keep all'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(group.id, 'merge')}
                    className={cn(
                      'transition-all duration-200',
                      decisions.get(group.id)?.action === 'merge' &&
                        'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400'
                    )}
                  >
                    <GitMerge className="w-4 h-4 mr-1.5" />
                    Merge
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(group.id, 'ignore')}
                    className={cn(
                      'transition-all duration-200',
                      decisions.get(group.id)?.action === 'ignore' &&
                        'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    )}
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Ignore warning
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {decisions.size} of {groups.length} groups resolved
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
