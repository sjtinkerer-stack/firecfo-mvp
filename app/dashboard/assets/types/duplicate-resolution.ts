// Types for duplicate resolution workflow

import type { TempAsset } from '@/app/lib/assets/temp-storage-types';

/**
 * A group of assets that are suspected to be duplicates
 */
export interface DuplicateGroup {
  id: string; // Unique identifier for this group
  assets: TempAsset[]; // All assets in this group
  recommendation: DuplicateRecommendation;
}

/**
 * System recommendation for how to handle a duplicate group
 */
export type DuplicateRecommendation =
  | 'keep_both'      // Assets are clearly different (different values, sources)
  | 'merge'          // Assets are likely the same (exact match or very close)
  | 'ask_user';      // Ambiguous case, user needs to decide

/**
 * User's decision for a duplicate group
 */
export type DuplicateResolutionAction =
  | 'keep_both'      // Select all assets in group
  | 'merge'          // Sum values, keep first, deselect others
  | 'delete_one'     // Deselect specific asset(s)
  | 'ignore';        // Mark as not duplicate, keep all selected

/**
 * Decision record for a specific duplicate group
 */
export interface DuplicateDecision {
  groupId: string;
  action: DuplicateResolutionAction;
  assetIdsToKeep?: string[]; // For 'delete_one' action
  mergedValue?: number; // For 'merge' action
  groupAssets?: TempAsset[]; // Actual assets in this group (passed from modal to hook)
}

/**
 * Helper to determine recommendation based on duplicate similarity
 */
export function getDuplicateRecommendation(assets: TempAsset[]): DuplicateRecommendation {
  if (assets.length < 2) return 'keep_both';

  // Check if all values are identical or very close
  const values = assets.map(a => a.current_value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue;
  const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
  const rangePercentage = (valueRange / avgValue) * 100;

  // If values are within 5%, likely same asset → suggest merge
  if (rangePercentage <= 5) {
    return 'merge';
  }

  // If values differ by more than 50%, likely different assets → keep both
  if (rangePercentage > 50) {
    return 'keep_both';
  }

  // Ambiguous case → ask user
  return 'ask_user';
}

/**
 * Group duplicates by their similarity (based on duplicate_matches)
 */
export function groupDuplicates(assets: TempAsset[]): DuplicateGroup[] {
  const duplicateAssets = assets.filter(a => a.is_duplicate && a.duplicate_matches && a.duplicate_matches.length > 0);

  if (duplicateAssets.length === 0) return [];

  // Build a map of asset relationships
  const groups: Map<string, Set<string>> = new Map();

  duplicateAssets.forEach(asset => {
    // Find all assets this one matches with
    const relatedIds = new Set<string>([asset.id]);

    // Add all assets mentioned in duplicate_matches that exist in current batch
    asset.duplicate_matches?.forEach(match => {
      const matchedAsset = assets.find(
        a => a.asset_name === match.existing_asset_name &&
             Math.abs(a.current_value - match.existing_value) < 1
      );
      if (matchedAsset) {
        relatedIds.add(matchedAsset.id);
      }
    });

    // Check if this asset belongs to an existing group
    let merged = false;
    for (const [groupId, existingGroup] of groups.entries()) {
      // If any asset in relatedIds is already in this group, merge
      const hasOverlap = Array.from(relatedIds).some(id => existingGroup.has(id));
      if (hasOverlap) {
        relatedIds.forEach(id => existingGroup.add(id));
        merged = true;
        break;
      }
    }

    // Create new group if not merged
    if (!merged) {
      groups.set(asset.id, relatedIds);
    }
  });

  // Convert groups to DuplicateGroup objects
  const result: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  for (const [groupId, assetIds] of groups.entries()) {
    // Skip if already processed in another group
    if (processedIds.has(groupId)) continue;

    const groupAssets = assets.filter(a => assetIds.has(a.id));
    if (groupAssets.length < 2) continue; // Skip single-asset groups

    result.push({
      id: `group-${result.length}`,
      assets: groupAssets,
      recommendation: getDuplicateRecommendation(groupAssets),
    });

    // Mark all assets in this group as processed
    groupAssets.forEach(a => processedIds.add(a.id));
  }

  return result;
}
