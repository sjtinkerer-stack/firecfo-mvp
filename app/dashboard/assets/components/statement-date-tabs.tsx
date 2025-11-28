// Component: Statement Date Tabs - Navigate between date groups

'use client';

interface StatementDateGroup {
  statement_date: string;
  suggested_snapshot_name: string;
  files: string[];
  match_type: 'exact' | 'close' | 'none';
  matched_snapshot: any;
  days_difference?: number;
  suggested_action: 'merge' | 'prompt' | 'create_new';
}

interface MergeDecision {
  action: 'merge' | 'create_new' | 'edit_date';
  targetSnapshotId?: string;
  newSnapshotName?: string;
}

interface StatementDateTabsProps {
  groups: StatementDateGroup[];
  selectedIndex: number;
  mergeDecisions: Record<string, MergeDecision>;
  onSelectTab: (index: number) => void;
}

export function StatementDateTabs({
  groups,
  selectedIndex,
  mergeDecisions,
  onSelectTab,
}: StatementDateTabsProps) {
  if (groups.length <= 1) {
    return null; // Don't show tabs for single group
  }

  const getTabColor = (group: StatementDateGroup, decision: MergeDecision) => {
    if (decision.action === 'merge') {
      return 'emerald'; // Merge = emerald
    }
    return 'blue'; // Create new = blue
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {groups.map((group, index) => {
        const decision = mergeDecisions[group.statement_date] || { action: 'create_new' };
        const color = getTabColor(group, decision);
        const isSelected = index === selectedIndex;

        return (
          <button
            key={index}
            onClick={() => onSelectTab(index)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${
                isSelected
                  ? color === 'emerald'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <span className="block">
              Group {index + 1}
            </span>
            <span className="block text-xs opacity-75">
              {new Date(group.statement_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
