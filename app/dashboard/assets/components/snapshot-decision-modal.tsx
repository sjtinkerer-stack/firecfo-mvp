// Component: Snapshot Decision Modal - Change merge/create decisions

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, AlertTriangle, Edit3 } from 'lucide-react';

interface MatchedSnapshot {
  id: string;
  snapshot_name?: string;
  statement_date?: string;
  total_networth: number;
}

interface StatementDateGroup {
  statement_date: string;
  suggested_snapshot_name: string;
  files: string[];
  match_type: 'exact' | 'close' | 'none';
  matched_snapshot: MatchedSnapshot | null;
  days_difference?: number;
  suggested_action: 'merge' | 'prompt' | 'create_new';
}

interface MergeDecision {
  action: 'merge' | 'create_new' | 'edit_date';
  targetSnapshotId?: string;
  newSnapshotName?: string;
  editedStatementDate?: string;
}

interface SnapshotDecisionModalProps {
  isOpen: boolean;
  statementDateGroups: StatementDateGroup[];
  mergeDecisions: Record<string, MergeDecision>;
  totalValue: number;
  selectedCount: number;
  onClose: () => void;
  onApply: (decisions: Record<string, MergeDecision>) => void;
}

export function SnapshotDecisionModal({
  isOpen,
  statementDateGroups,
  mergeDecisions: initialDecisions,
  totalValue,
  selectedCount,
  onClose,
  onApply,
}: SnapshotDecisionModalProps) {
  const [localDecisions, setLocalDecisions] = useState(initialDecisions);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)} L`;
    } else {
      return `₹${value.toLocaleString('en-IN')}`;
    }
  };

  const handleApply = () => {
    onApply(localDecisions);
    onClose();
  };

  // Single group scenario
  if (statementDateGroups.length === 1) {
    const group = statementDateGroups[0];
    const decision = localDecisions[group.statement_date] || { action: 'create_new' };
    const estimatedTotal = group.matched_snapshot
      ? group.matched_snapshot.total_networth + totalValue
      : totalValue;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change Snapshot Destination</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Statement date: {new Date(group.statement_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {selectedCount} assets • {formatCurrency(totalValue)} total value
              </p>
            </div>

            <div className="space-y-3">
              {/* Merge option (if matched snapshot exists) */}
              {group.matched_snapshot && (
                <label
                  className={`block cursor-pointer rounded-lg p-4 border-2 transition-all ${
                    decision.action === 'merge'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="snapshot-decision"
                      checked={decision.action === 'merge'}
                      onChange={() => {
                        setLocalDecisions({
                          ...localDecisions,
                          [group.statement_date]: {
                            action: 'merge',
                            targetSnapshotId: group.matched_snapshot!.id,
                          },
                        });
                      }}
                      className="mt-1 w-4 h-4 text-emerald-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        Merge with "{group.matched_snapshot.snapshot_name || 'Unnamed Snapshot'}"
                        {group.match_type === 'exact' && (
                          <span className="ml-2 text-xs text-emerald-600">(Exact match)</span>
                        )}
                        {group.match_type === 'close' && (
                          <span className="ml-2 text-xs text-amber-600">
                            ({Math.abs(group.days_difference || 0)} days {(group.days_difference || 0) > 0 ? 'later' : 'earlier'})
                          </span>
                        )}
                      </p>
                      {group.matched_snapshot.statement_date && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(group.matched_snapshot.statement_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                        {formatCurrency(group.matched_snapshot.total_networth)} → {formatCurrency(estimatedTotal)} (after merge)
                      </p>
                    </div>
                  </div>
                </label>
              )}

              {/* Create new option */}
              <label
                className={`block cursor-pointer rounded-lg p-4 border-2 transition-all ${
                  decision.action === 'create_new'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="snapshot-decision"
                    checked={decision.action === 'create_new'}
                    onChange={() => {
                      setLocalDecisions({
                        ...localDecisions,
                        [group.statement_date]: {
                          action: 'create_new',
                          newSnapshotName: group.suggested_snapshot_name,
                        },
                      });
                    }}
                    className="mt-1 w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Create new snapshot
                    </p>
                    <input
                      type="text"
                      value={decision.newSnapshotName || group.suggested_snapshot_name}
                      onChange={(e) => {
                        setLocalDecisions({
                          ...localDecisions,
                          [group.statement_date]: {
                            ...localDecisions[group.statement_date],
                            action: 'create_new',
                            newSnapshotName: e.target.value,
                          },
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Snapshot name"
                    />
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg transition-all"
            >
              Apply Changes
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Multiple groups scenario
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Snapshot Decisions</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {statementDateGroups.map((group, groupIndex) => {
            const decision = localDecisions[group.statement_date] || { action: 'create_new' };
            const groupAssetCount = Math.floor(selectedCount / statementDateGroups.length); // Simplified
            const groupValue = Math.floor(totalValue / statementDateGroups.length); // Simplified
            const estimatedTotal = group.matched_snapshot
              ? group.matched_snapshot.total_networth + groupValue
              : groupValue;

            return (
              <div key={groupIndex} className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Group {groupIndex + 1}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Statement date: {new Date(group.statement_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {groupAssetCount} assets • {formatCurrency(groupValue)}
                  </p>
                </div>

                <div className="space-y-2 pl-4">
                  {/* Merge option (if matched snapshot exists) */}
                  {group.matched_snapshot && (
                    <label
                      className={`block cursor-pointer rounded-lg p-3 border transition-all ${
                        decision.action === 'merge'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name={`snapshot-decision-${groupIndex}`}
                          checked={decision.action === 'merge'}
                          onChange={() => {
                            setLocalDecisions({
                              ...localDecisions,
                              [group.statement_date]: {
                                action: 'merge',
                                targetSnapshotId: group.matched_snapshot!.id,
                              },
                            });
                          }}
                          className="mt-0.5 w-4 h-4 text-emerald-600"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Merge with "{group.matched_snapshot.snapshot_name || 'Unnamed'}"
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {formatCurrency(group.matched_snapshot.total_networth)} → {formatCurrency(estimatedTotal)}
                          </p>
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Create new option */}
                  <label
                    className={`block cursor-pointer rounded-lg p-3 border transition-all ${
                      decision.action === 'create_new'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name={`snapshot-decision-${groupIndex}`}
                        checked={decision.action === 'create_new'}
                        onChange={() => {
                          setLocalDecisions({
                            ...localDecisions,
                            [group.statement_date]: {
                              action: 'create_new',
                              newSnapshotName: group.suggested_snapshot_name,
                            },
                          });
                        }}
                        className="mt-0.5 w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Create new snapshot
                        </p>
                        <input
                          type="text"
                          value={decision.newSnapshotName || group.suggested_snapshot_name}
                          onChange={(e) => {
                            setLocalDecisions({
                              ...localDecisions,
                              [group.statement_date]: {
                                ...localDecisions[group.statement_date],
                                action: 'create_new',
                                newSnapshotName: e.target.value,
                              },
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </label>
                </div>

                {groupIndex < statementDateGroups.length - 1 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 my-4" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg transition-all"
          >
            Apply Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
