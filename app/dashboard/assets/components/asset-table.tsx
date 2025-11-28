'use client';

import { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TempAsset } from '@/app/lib/assets/temp-storage-types';
import type { AssetClass } from '@/app/lib/assets/types';

interface AssetTableProps {
  assets: TempAsset[];
  selectedIds: string[];
  conflictIds?: string[]; // IDs of assets that are cross-upload conflicts
  onSelectionChange: (ids: string[]) => void;
  onUpdate: (assetId: string, updates: Partial<TempAsset>) => void;
  readOnly?: boolean;
}

type SortField = 'asset_name' | 'current_value' | 'asset_class' | 'ai_confidence_score';
type SortDirection = 'asc' | 'desc';

const ASSET_CLASS_OPTIONS: { value: AssetClass; label: string }[] = [
  { value: 'equity', label: 'Equity' },
  { value: 'debt', label: 'Debt' },
  { value: 'cash', label: 'Cash' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];


export function AssetTable({
  assets,
  selectedIds,
  conflictIds = [],
  onSelectionChange,
  onUpdate,
  readOnly = false,
}: AssetTableProps) {
  const [sortField, setSortField] = useState<SortField>('asset_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  // Sort assets - warnings/conflicts first, then by selected field
  const sortedAssets = useMemo(() => {
    const sorted = [...assets].sort((a, b) => {
      // First, sort by duplicate/conflict status (warnings on top)
      const aHasWarning = a.is_duplicate ? 1 : 0;
      const bHasWarning = b.is_duplicate ? 1 : 0;

      if (aHasWarning !== bHasWarning) {
        return bHasWarning - aHasWarning; // Warnings first
      }

      // Within warnings, conflicts before duplicates
      if (a.is_duplicate && b.is_duplicate) {
        const aIsConflict = conflictIds.includes(a.id) ? 1 : 0;
        const bIsConflict = conflictIds.includes(b.id) ? 1 : 0;
        if (aIsConflict !== bIsConflict) {
          return bIsConflict - aIsConflict; // Conflicts before duplicates
        }
      }

      // Then sort by user-selected field
      let comparison = 0;
      if (sortField === 'asset_name') {
        comparison = a.asset_name.localeCompare(b.asset_name);
      } else if (sortField === 'current_value') {
        comparison = a.current_value - b.current_value;
      } else if (sortField === 'asset_class') {
        comparison = a.asset_class.localeCompare(b.asset_class);
      } else if (sortField === 'ai_confidence_score') {
        comparison = (a.ai_confidence_score || 0) - (b.ai_confidence_score || 0);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [assets, sortField, sortDirection, conflictIds]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(assets.map((a) => a.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (assetId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, assetId]);
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== assetId));
    }
  };

  const handleCellEdit = (assetId: string, field: keyof TempAsset, value: any) => {
    onUpdate(assetId, { [field]: value });
    setEditingCell(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const allSelected = assets.length > 0 && selectedIds.length === assets.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < assets.length;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {/* Checkbox column */}
              <th className="w-12 px-4 py-3 text-left">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all assets"
                  className={someSelected ? 'data-[state=checked]:bg-emerald-600' : ''}
                />
              </th>

              {/* Asset Name */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('asset_name')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Asset Name
                  {sortField === 'asset_name' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    ))}
                </button>
              </th>

              {/* Asset Class */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('asset_class')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Class
                  {sortField === 'asset_class' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    ))}
                </button>
              </th>

              {/* Current Value */}
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('current_value')}
                  className="flex items-center justify-end gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 ml-auto"
                >
                  Value
                  {sortField === 'current_value' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    ))}
                </button>
              </th>

              {/* Duplicate Warning */}
              <th className="w-12 px-4 py-3 text-center">
                <span className="sr-only">Duplicate warning</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedAssets.map((asset) => {
              const isSelected = selectedIds.includes(asset.id);
              const isDuplicate = asset.is_duplicate;
              const isConflict = conflictIds.includes(asset.id);

              return (
                <tr
                  key={asset.id}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all duration-150',
                    isSelected && 'bg-emerald-50/50 dark:bg-emerald-900/10',
                    isDuplicate && !isConflict && 'bg-amber-50/50 dark:bg-amber-900/10',
                    isConflict && 'bg-orange-50/50 dark:bg-orange-900/10'
                  )}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(asset.id, checked as boolean)}
                      aria-label={`Select ${asset.asset_name}`}
                    />
                  </td>

                  {/* Asset Name (editable) */}
                  <td className="px-4 py-3">
                    {editingCell?.id === asset.id && editingCell?.field === 'asset_name' ? (
                      <Input
                        autoFocus
                        defaultValue={asset.asset_name}
                        onBlur={(e) => handleCellEdit(asset.id, 'asset_name', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCellEdit(asset.id, 'asset_name', e.currentTarget.value);
                          } else if (e.key === 'Escape') {
                            setEditingCell(null);
                          }
                        }}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <button
                        onClick={() => !readOnly && setEditingCell({ id: asset.id, field: 'asset_name' })}
                        className="flex items-center gap-2 group text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded px-1 -ml-1"
                        disabled={readOnly}
                        title="Click to edit"
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {asset.asset_name}
                        </span>
                        {!readOnly && (
                          <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
                        )}
                      </button>
                    )}
                  </td>

                  {/* Asset Class (editable) */}
                  <td className="px-4 py-3">
                    {editingCell?.id === asset.id && editingCell?.field === 'asset_class' ? (
                      <Select
                        defaultValue={asset.asset_class}
                        onValueChange={(value) => handleCellEdit(asset.id, 'asset_class', value)}
                      >
                        <SelectTrigger className="h-8 text-sm w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_CLASS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        onClick={() => !readOnly && setEditingCell({ id: asset.id, field: 'asset_class' })}
                        className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded px-1 -ml-1"
                        disabled={readOnly}
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {asset.asset_class}
                        </span>
                        {!readOnly && (
                          <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
                        )}
                      </button>
                    )}
                  </td>

                  {/* Current Value (editable) */}
                  <td className="px-4 py-3 text-right">
                    {editingCell?.id === asset.id && editingCell?.field === 'current_value' ? (
                      <Input
                        type="number"
                        autoFocus
                        defaultValue={asset.current_value}
                        onBlur={(e) => handleCellEdit(asset.id, 'current_value', parseFloat(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCellEdit(asset.id, 'current_value', parseFloat(e.currentTarget.value));
                          } else if (e.key === 'Escape') {
                            setEditingCell(null);
                          }
                        }}
                        className="h-8 text-sm text-right w-32 ml-auto"
                      />
                    ) : (
                      <button
                        onClick={() => !readOnly && setEditingCell({ id: asset.id, field: 'current_value' })}
                        className="flex items-center gap-2 group ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded px-1 -mr-1"
                        disabled={readOnly}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(asset.current_value)}
                        </span>
                        {!readOnly && (
                          <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
                        )}
                      </button>
                    )}
                  </td>

                  {/* Duplicate Warning */}
                  <td className="px-4 py-3 text-center">
                    {isDuplicate && isConflict && (
                      <span
                        className="inline-block"
                        title="Conflict with existing asset. Click 'Review conflicts' to resolve."
                      >
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mx-auto animate-pulse" />
                      </span>
                    )}
                    {isDuplicate && !isConflict && (
                      <span
                        className="inline-block"
                        title="Possible duplicate. Click 'Review duplicates' to resolve."
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto animate-pulse" />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {assets.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No assets to display</p>
        </div>
      )}
    </div>
  );
}
