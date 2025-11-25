// Duplicate detection using fuzzy string matching

import * as fuzzball from 'fuzzball';
import {
  Asset,
  ClassifiedAsset,
  ReviewAsset,
  DuplicateMatch,
  DuplicateDetectionError,
} from './types';

/**
 * Configuration for duplicate detection
 */
export interface DuplicateDetectionConfig {
  // Minimum similarity score (0-100) to consider as potential duplicate
  similarityThreshold: number; // Default: 85

  // If value difference is within this percentage, consider as stronger duplicate signal
  valueTolerancePercentage: number; // Default: 5 (5%)

  // Weight for name similarity vs value similarity
  nameWeight: number; // Default: 0.7
  valueWeight: number; // Default: 0.3
}

const DEFAULT_CONFIG: DuplicateDetectionConfig = {
  similarityThreshold: 85,
  valueTolerancePercentage: 5,
  nameWeight: 0.7,
  valueWeight: 0.3,
};

/**
 * Simple string similarity calculation
 * Uses Levenshtein distance ratio (0-100 scale)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 100;

  const distance = levenshteinDistance(longer, shorter);
  return ((longer.length - distance) / longer.length) * 100;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Token sort ratio - splits strings into words and sorts them
 * Better for matching reordered words (e.g., "HDFC Bank" vs "Bank HDFC")
 */
function tokenSortRatio(str1: string, str2: string): number {
  const sortTokens = (str: string) =>
    str
      .toLowerCase()
      .split(/\s+/)
      .sort()
      .join(' ');

  const sorted1 = sortTokens(str1);
  const sorted2 = sortTokens(str2);

  return calculateStringSimilarity(sorted1, sorted2);
}

/**
 * Calculate similarity score between two asset names
 * Uses token sort ratio for better matching of reordered words
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  // Normalize names: lowercase, remove special chars, trim
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

  const normalizedName1 = normalize(name1);
  const normalizedName2 = normalize(name2);

  // Use token sort ratio (handles word reordering)
  const similarity = tokenSortRatio(normalizedName1, normalizedName2);

  return similarity;
}

/**
 * Calculate value similarity between two asset values
 * Returns 100 if within tolerance, scales down based on difference
 */
function calculateValueSimilarity(
  value1: number,
  value2: number,
  tolerancePercentage: number
): number {
  if (value1 === 0 || value2 === 0) {
    return value1 === value2 ? 100 : 0;
  }

  const percentDifference =
    Math.abs(value1 - value2) / Math.max(value1, value2) * 100;

  if (percentDifference <= tolerancePercentage) {
    return 100;
  }

  // Scale down similarity based on difference
  // If difference is 2x tolerance, similarity is 50
  // If difference is 4x tolerance, similarity is 0
  const similarity = Math.max(
    0,
    100 - (percentDifference - tolerancePercentage) * 2
  );

  return similarity;
}

/**
 * Calculate overall duplicate score
 * Combines name similarity and value similarity with weights
 */
function calculateDuplicateScore(
  name1: string,
  name2: string,
  value1: number,
  value2: number,
  config: DuplicateDetectionConfig
): number {
  const nameSimilarity = calculateNameSimilarity(name1, name2);
  const valueSimilarity = calculateValueSimilarity(
    value1,
    value2,
    config.valueTolerancePercentage
  );

  const weightedScore =
    nameSimilarity * config.nameWeight + valueSimilarity * config.valueWeight;

  return weightedScore;
}

/**
 * Determine match type based on similarity scores
 */
function getMatchType(
  nameSimilarity: number,
  valueSimilarity: number
): DuplicateMatch['match_type'] {
  if (nameSimilarity === 100 && valueSimilarity === 100) {
    return 'exact';
  } else if (nameSimilarity >= 90 && valueSimilarity >= 90) {
    return 'name_and_value';
  } else {
    return 'name';
  }
}

/**
 * Detect duplicates for a single new asset against existing assets
 */
export function detectDuplicatesForAsset(
  newAsset: ClassifiedAsset,
  existingAssets: Asset[],
  config: DuplicateDetectionConfig = DEFAULT_CONFIG
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  for (const existingAsset of existingAssets) {
    const nameSimilarity = calculateNameSimilarity(
      newAsset.asset_name,
      existingAsset.asset_name
    );

    // Skip if name similarity is too low
    if (nameSimilarity < config.similarityThreshold) {
      continue;
    }

    const valueSimilarity = calculateValueSimilarity(
      newAsset.current_value,
      existingAsset.current_value,
      config.valueTolerancePercentage
    );

    const overallScore = calculateDuplicateScore(
      newAsset.asset_name,
      existingAsset.asset_name,
      newAsset.current_value,
      existingAsset.current_value,
      config
    );

    // Only add if overall score meets threshold
    if (overallScore >= config.similarityThreshold) {
      matches.push({
        existing_asset_id: existingAsset.id,
        existing_asset_name: existingAsset.asset_name,
        existing_value: existingAsset.current_value,
        existing_source: existingAsset.source_file || 'Unknown',
        similarity_score: overallScore / 100, // Convert to 0-1 range
        match_type: getMatchType(nameSimilarity, valueSimilarity),
      });
    }
  }

  // Sort by similarity score (highest first)
  matches.sort((a, b) => b.similarity_score - a.similarity_score);

  return matches;
}

/**
 * Detect duplicates across multiple new assets
 * Also checks for duplicates within the new assets batch
 */
export function detectDuplicatesBatch(
  newAssets: ClassifiedAsset[],
  existingAssets: Asset[],
  config: DuplicateDetectionConfig = DEFAULT_CONFIG
): ReviewAsset[] {
  const reviewAssets: ReviewAsset[] = [];

  // Check each new asset against existing assets
  for (let i = 0; i < newAssets.length; i++) {
    const newAsset = newAssets[i];
    const matches = detectDuplicatesForAsset(newAsset, existingAssets, config);

    // Also check against previously processed new assets (intra-batch duplicates)
    for (let j = 0; j < i; j++) {
      const otherNewAsset = reviewAssets[j];

      const nameSimilarity = calculateNameSimilarity(
        newAsset.asset_name,
        otherNewAsset.asset_name
      );

      if (nameSimilarity >= config.similarityThreshold) {
        const valueSimilarity = calculateValueSimilarity(
          newAsset.current_value,
          otherNewAsset.current_value,
          config.valueTolerancePercentage
        );

        const overallScore = calculateDuplicateScore(
          newAsset.asset_name,
          otherNewAsset.asset_name,
          newAsset.current_value,
          otherNewAsset.current_value,
          config
        );

        if (overallScore >= config.similarityThreshold) {
          matches.push({
            existing_asset_name: otherNewAsset.asset_name,
            existing_value: otherNewAsset.current_value,
            existing_source: otherNewAsset.source_file || 'Current upload',
            similarity_score: overallScore / 100,
            match_type: getMatchType(nameSimilarity, valueSimilarity),
          });
        }
      }
    }

    reviewAssets.push({
      ...newAsset,
      id: `new-${i}`, // Temporary ID for review UI
      is_duplicate: matches.length > 0,
      duplicate_matches: matches,
      is_selected: matches.length === 0, // Only select non-duplicates
    });
  }

  return reviewAssets;
}

/**
 * Detect duplicates within a single batch (no existing assets)
 * Useful for cleaning uploaded files before saving
 */
export function detectIntraBatchDuplicates(
  assets: ClassifiedAsset[],
  config: DuplicateDetectionConfig = DEFAULT_CONFIG
): ReviewAsset[] {
  const reviewAssets: ReviewAsset[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < assets.length; i++) {
    if (processed.has(i)) continue;

    const asset = assets[i];
    const matches: DuplicateMatch[] = [];

    // Check against all subsequent assets
    for (let j = i + 1; j < assets.length; j++) {
      if (processed.has(j)) continue;

      const otherAsset = assets[j];
      const nameSimilarity = calculateNameSimilarity(
        asset.asset_name,
        otherAsset.asset_name
      );

      if (nameSimilarity >= config.similarityThreshold) {
        const valueSimilarity = calculateValueSimilarity(
          asset.current_value,
          otherAsset.current_value,
          config.valueTolerancePercentage
        );

        const overallScore = calculateDuplicateScore(
          asset.asset_name,
          otherAsset.asset_name,
          asset.current_value,
          otherAsset.current_value,
          config
        );

        if (overallScore >= config.similarityThreshold) {
          matches.push({
            existing_asset_name: otherAsset.asset_name,
            existing_value: otherAsset.current_value,
            existing_source: otherAsset.source_file || 'Same file',
            similarity_score: overallScore / 100,
            match_type: getMatchType(nameSimilarity, valueSimilarity),
          });

          processed.add(j); // Mark as duplicate
        }
      }
    }

    reviewAssets.push({
      ...asset,
      id: `new-${i}`,
      is_duplicate: matches.length > 0,
      duplicate_matches: matches,
      is_selected: matches.length === 0, // Only select non-duplicates
    });
  }

  return reviewAssets;
}

/**
 * Filter out duplicates based on user selection
 * Returns only non-duplicate assets or assets user explicitly selected
 */
export function filterSelectedAssets(
  reviewAssets: ReviewAsset[]
): ClassifiedAsset[] {
  return reviewAssets
    .filter((asset) => asset.is_selected && !asset.is_duplicate)
    .map((asset) => {
      // Remove review-specific properties
      const { id, is_duplicate, duplicate_matches, is_selected, ...classifiedAsset } = asset;
      return classifiedAsset;
    });
}

/**
 * Get duplicate statistics for reporting
 */
export function getDuplicateStats(reviewAssets: ReviewAsset[]): {
  total_assets: number;
  duplicates_found: number;
  exact_duplicates: number;
  name_and_value_duplicates: number;
  name_only_duplicates: number;
} {
  const duplicates = reviewAssets.filter((a) => a.is_duplicate);

  const exactDuplicates = duplicates.filter(
    (a) => a.duplicate_matches?.[0]?.match_type === 'exact'
  ).length;

  const nameAndValueDuplicates = duplicates.filter(
    (a) => a.duplicate_matches?.[0]?.match_type === 'name_and_value'
  ).length;

  const nameOnlyDuplicates = duplicates.filter(
    (a) => a.duplicate_matches?.[0]?.match_type === 'name'
  ).length;

  return {
    total_assets: reviewAssets.length,
    duplicates_found: duplicates.length,
    exact_duplicates: exactDuplicates,
    name_and_value_duplicates: nameAndValueDuplicates,
    name_only_duplicates: nameOnlyDuplicates,
  };
}
