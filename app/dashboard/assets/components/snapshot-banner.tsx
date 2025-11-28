'use client';

import { useState } from 'react';
import { Calendar, FolderPlus, FolderOpen, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TempUpload } from '@/app/lib/assets/temp-storage-types';
import type { StatementDateConfidence } from '@/app/lib/assets/types';

interface SnapshotBannerProps {
  tempUpload: TempUpload;
  selectedAssetCount: number;
  selectedAssetValue: number;
  onChangeDecision?: () => void;
  className?: string;
}

const CONFIDENCE_COLORS: Record<StatementDateConfidence, string> = {
  high: 'text-green-700 dark:text-green-400',
  medium: 'text-yellow-700 dark:text-yellow-400',
  low: 'text-orange-700 dark:text-orange-400',
  manual: 'text-blue-700 dark:text-blue-400',
};

const CONFIDENCE_LABELS: Record<StatementDateConfidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
  manual: 'Manually set',
};

export function SnapshotBanner({
  tempUpload,
  selectedAssetCount,
  selectedAssetValue,
  onChangeDecision,
  className,
}: SnapshotBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isMerging = tempUpload.merge_decision === 'merge';
  const isCreatingNew = tempUpload.merge_decision === 'create_new';

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg',
        className
      )}
    >
      {/* Collapsed view - always visible */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {/* Statement Date */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(tempUpload.statement_date)}
                </p>
                {tempUpload.statement_date_confidence && (
                  <p
                    className={cn(
                      'text-xs',
                      CONFIDENCE_COLORS[tempUpload.statement_date_confidence]
                    )}
                  >
                    {CONFIDENCE_LABELS[tempUpload.statement_date_confidence]}
                  </p>
                )}
              </div>
            </div>

            {/* Snapshot Decision */}
            <div className="flex items-center gap-2">
              {isMerging ? (
                <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <FolderPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {isMerging
                    ? `📁 Merging into: ${tempUpload.suggested_snapshot_name}`
                    : `📁 Saving to: ${tempUpload.suggested_snapshot_name} (new snapshot)`}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedAssetCount} {selectedAssetCount === 1 ? 'asset' : 'assets'} · {formatCurrency(selectedAssetValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onChangeDecision && (
              <Button
                variant="outline"
                size="sm"
                onClick={onChangeDecision}
                className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
              >
                Change...
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 dark:text-gray-400"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded view - details */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 border-t border-emerald-200 dark:border-emerald-800">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Left column */}
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Upload ID</p>
                <p className="font-mono text-gray-900 dark:text-gray-100">{tempUpload.id}</p>
              </div>

              {tempUpload.file_names && tempUpload.file_names.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Source Files</p>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                    {tempUpload.file_names.map((fileName, index) => (
                      <li key={index} className="truncate">
                        {fileName}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tempUpload.statement_date_source && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Date Source</p>
                  <p className="text-gray-700 dark:text-gray-300 capitalize">
                    {tempUpload.statement_date_source.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Assets</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{tempUpload.total_assets}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Value</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(tempUpload.total_value)}
                </p>
              </div>

              {tempUpload.duplicates_found > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Duplicates Found</p>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    {tempUpload.duplicates_found}
                  </p>
                </div>
              )}

              {tempUpload.processing_time_ms && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Processing Time</p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {(tempUpload.processing_time_ms / 1000).toFixed(2)}s
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info box */}
          {isMerging && tempUpload.matched_snapshot_id && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                These assets will be added to the existing snapshot. The snapshot's total value will be
                updated automatically.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
