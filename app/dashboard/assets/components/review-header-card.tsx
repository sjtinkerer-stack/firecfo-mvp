'use client';

import { Calendar, FolderPlus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReviewHeaderCardProps {
  detectedDate: string;
  confidence?: string;
  snapshotName: string;
  isNewSnapshot: boolean;
  isMergeMode?: boolean; // NEW: Whether merging with existing snapshot
  totalAssets: number;
  selectedAssets: number;
  duplicateCount: number;
  conflictCount?: number; // NEW: Count of cross-upload conflicts
  onChangeDate?: () => void;
  onChangeSnapshot?: () => void;
  onReviewDuplicates?: () => void;
  onReviewConflicts?: () => void; // NEW: Handler for conflict review
  onClearAll?: () => void;
  className?: string;
}

export function ReviewHeaderCard({
  detectedDate,
  confidence,
  snapshotName,
  isNewSnapshot,
  isMergeMode = false,
  totalAssets,
  selectedAssets,
  duplicateCount,
  conflictCount = 0,
  onChangeDate,
  onChangeSnapshot,
  onReviewDuplicates,
  onReviewConflicts,
  onClearAll,
  className,
}: ReviewHeaderCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg',
        className
      )}
    >
      {/* Top row: Date and Snapshot */}
      <div className="grid grid-cols-2 gap-6 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        {/* Date Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Date detected</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {formatDate(detectedDate)}
            </span>
            {confidence && (
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {confidence} confidence
              </span>
            )}
          </div>
          {onChangeDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onChangeDate}
              className="h-7 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Change Date
            </Button>
          )}
        </div>

        {/* Snapshot Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FolderPlus className="w-4 h-4" />
            <span>Snapshot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {snapshotName}
            </span>
            {isNewSnapshot && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                new
              </span>
            )}
            {isMergeMode && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                merge
              </span>
            )}
          </div>
          {onChangeSnapshot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onChangeSnapshot}
              className="h-7 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Change Snapshot
            </Button>
          )}
        </div>
      </div>

      {/* Bottom row: Stats and Actions */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">{selectedAssets}</span> of {totalAssets} assets
          </span>
          {duplicateCount > 0 && (
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 animate-in fade-in slide-in-from-left-2 duration-300">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">{duplicateCount} possible duplicates</span>
            </div>
          )}
          {conflictCount > 0 && (
            <div className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400 animate-in fade-in slide-in-from-left-2 duration-300">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">{conflictCount} {conflictCount === 1 ? 'conflict' : 'conflicts'} with existing</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {duplicateCount > 0 && onReviewDuplicates && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReviewDuplicates}
              className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all duration-200"
            >
              Review duplicates
            </Button>
          )}
          {conflictCount > 0 && onReviewConflicts && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReviewConflicts}
              className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200"
            >
              Review conflicts
            </Button>
          )}
          {onClearAll && selectedAssets > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-gray-600 dark:text-gray-400 transition-colors duration-200"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
