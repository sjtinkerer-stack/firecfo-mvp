'use client';

import { X, Trash2, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TempAsset } from '@/app/lib/assets/temp-storage-types';

interface BulkActionsToolbarProps {
  assets: TempAsset[];
  selectedIds: string[];
  onClearSelection: () => void;
  onDeleteSelected?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  className?: string;
}

export function BulkActionsToolbar({
  assets,
  selectedIds,
  onClearSelection,
  onDeleteSelected,
  onSelectAll,
  onDeselectAll,
  className,
}: BulkActionsToolbarProps) {
  const selectedAssets = assets.filter((a) => selectedIds.includes(a.id));
  const selectedCount = selectedAssets.length;
  const totalCount = assets.length;

  if (selectedCount === 0) {
    return null;
  }

  const selectedValue = selectedAssets.reduce((sum, asset) => sum + asset.current_value, 0);
  const duplicatesCount = selectedAssets.filter((a) => a.is_duplicate).length;
  const allSelected = selectedCount === totalCount;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Selection summary */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedCount} {selectedCount === 1 ? 'asset' : 'assets'} selected
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Total value: {formatCurrency(selectedValue)}
            </p>
          </div>
        </div>

        {/* Duplicate warning */}
        {duplicatesCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {duplicatesCount} {duplicatesCount === 1 ? 'duplicate' : 'duplicates'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Select/Deselect all */}
        {!allSelected && onSelectAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          >
            Select all ({totalCount})
          </Button>
        )}

        {allSelected && onDeselectAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          >
            Deselect all
          </Button>
        )}

        {/* Delete selected */}
        {onDeleteSelected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteSelected}
            className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        )}

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="w-4 h-4 mr-1.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}
