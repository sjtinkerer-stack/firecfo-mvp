// Duplicate detection using fuzzy string matching

import * as fuzzball from 'fuzzball';
import {
  Asset,
  AssetForDuplicateCheck,
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
  nameWeight: 0.9, // Prioritize name matching over value
  valueWeight: 0.1, // Minimize impact of value differences
};

/**
 * Stopwords for Indian financial context
 * Common terms that should be filtered out before token matching to reduce false positives
 */
const STOPWORDS = new Set([
  // Geographic
  'india',
  'indian',
  'mumbai',
  'delhi',
  'bangalore',
  'bengaluru',

  // Corporate suffixes
  'limited',
  'ltd',
  'pvt',
  'private',
  'company',
  'co',
  'corp',
  'corporation',
  'incorporated',
  'inc',

  // Financial terms
  'fund',
  'funds',
  'mutual',
  'mf',
  'mutualfund',
  'etf',
  'exchange',
  'traded',
  'trust',
  'asset',
  'assets',
  'management',
  'amc',
  'securities',
  'finance',
  'financial',
  'investment',
  'investments',
  'equity',
  'debt',
  'bond',
  'bonds',

  // Plan types
  'growth',
  'dividend',
  'regular',
  'direct',
  'plan',
  'option',
  'scheme',

  // Common words
  'the',
  'and',
  'or',
  'of',
  'in',
  'at',
  'to',
  'for',
  'with',
  'from',
]);

/**
 * Filter out stopwords from a token array
 * @param tokens - Array of tokens to filter
 * @returns Filtered array with stopwords removed
 */
function filterStopwords(tokens: string[]): string[] {
  return tokens.filter(token => {
    const lowerToken = token.toLowerCase();
    return !STOPWORDS.has(lowerToken) && lowerToken.length > 0;
  });
}

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
 * Common abbreviations in Indian financial instruments
 */
const ABBREVIATION_MAP: Record<string, string> = {
  'nip': 'nippon',
  'mf': 'mutual fund',
  'mutualfund': 'mutual fund',
  'etf': 'exchange traded fund',
  'ltd': 'limited',
  'pvt': 'private',
  'co': 'company',
  'corp': 'corporation',
  'fin': 'finance',
  'finserv': 'financial services',
  'invt': 'investment',
  'inv': 'investment',
  'mgmt': 'management',
  'sec': 'securities',
  'svc': 'services',
  'svcs': 'services',
  'tech': 'technology',
  'hdfc': 'housing development finance corporation',
  'icici': 'industrial credit and investment corporation of india',
  'sbi': 'state bank of india',
  'lic': 'life insurance corporation',
  'pnb': 'punjab national bank',
  'uti': 'unit trust of india',
  'dsp': 'dsp',
  'amc': 'asset management company',
};

/**
 * Expand common abbreviations in text
 */
function expandAbbreviations(text: string): string {
  let expanded = text.toLowerCase();

  // Replace each abbreviation with its full form
  Object.entries(ABBREVIATION_MAP).forEach(([abbrev, full]) => {
    // Match whole words only (with word boundaries)
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    expanded = expanded.replace(regex, full);
  });

  return expanded;
}

/**
 * Calculate common token ratio between two strings
 * Returns percentage of common tokens relative to the smaller set
 * Now filters out stopwords and requires minimum unique token matches
 */
function calculateCommonTokenRatio(str1: string, str2: string): number {
  // Tokenize and filter stopwords
  const tokens1 = str1.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const tokens2 = str2.toLowerCase().split(/\s+/).filter(t => t.length > 0);

  // Remove stopwords from both token sets
  const filteredTokens1 = filterStopwords(tokens1);
  const filteredTokens2 = filterStopwords(tokens2);

  if (filteredTokens1.length === 0 || filteredTokens2.length === 0) return 0;

  // Find common tokens (after stopword filtering)
  const set1 = new Set(filteredTokens1);
  const set2 = new Set(filteredTokens2);
  const commonTokens = filteredTokens1.filter(token => set2.has(token));

  // Require at least 2 unique (non-stopword) tokens to match
  // This prevents false positives like "NIPPON INDIA..." matching "Polycab India"
  if (commonTokens.length < 2) {
    return 0;
  }

  // Calculate ratio relative to smaller set
  const minTokenCount = Math.min(filteredTokens1.length, filteredTokens2.length);
  const ratio = (commonTokens.length / minTokenCount) * 100;

  return ratio;
}

/**
 * Calculate similarity score between two asset names
 * Uses multiple strategies: token sort ratio + abbreviation expansion + common token ratio
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

  // Strategy 1: Direct token sort similarity
  const directSimilarity = tokenSortRatio(normalizedName1, normalizedName2);

  // Strategy 2: Token sort with abbreviation expansion
  const expandedName1 = expandAbbreviations(normalizedName1);
  const expandedName2 = expandAbbreviations(normalizedName2);
  const expandedSimilarity = tokenSortRatio(expandedName1, expandedName2);

  // Strategy 3: Common token ratio (good for different verbosity levels)
  const tokenRatio = calculateCommonTokenRatio(expandedName1, expandedName2);

  // Use the best score from all strategies
  const bestScore = Math.max(directSimilarity, expandedSimilarity, tokenRatio);

  // Debug logging with stopword filtering info
  const tokens1 = normalizedName1.split(/\s+/).filter(t => t.length > 0);
  const tokens2 = normalizedName2.split(/\s+/).filter(t => t.length > 0);
  const filteredTokens1 = filterStopwords(tokens1);
  const filteredTokens2 = filterStopwords(tokens2);

  console.log(`📊 Name similarity for "${name1}" vs "${name2}":`, {
    direct: directSimilarity.toFixed(1),
    expanded: expandedSimilarity.toFixed(1),
    tokenRatio: tokenRatio.toFixed(1),
    best: bestScore.toFixed(1),
    tokens1: filteredTokens1.join(' '),
    tokens2: filteredTokens2.join(' '),
  });

  return bestScore;
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
  existingAssets: AssetForDuplicateCheck[],
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
 *
 * @param newAssets - New assets to check for duplicates
 * @param existingAssets - Existing user assets to compare against
 * @param config - Detection configuration
 * @param targetSnapshotId - Optional: Only check against assets in this snapshot (for merge scenarios)
 */
export function detectDuplicatesBatch(
  newAssets: ClassifiedAsset[],
  existingAssets: AssetForDuplicateCheck[],
  config: DuplicateDetectionConfig = DEFAULT_CONFIG,
  targetSnapshotId?: string
): ReviewAsset[] {
  // Filter existing assets by snapshot if targetSnapshotId is provided
  const assetsToCheck = targetSnapshotId
    ? existingAssets.filter((asset) => asset.snapshot_id === targetSnapshotId)
    : existingAssets;

  console.log(
    `🔍 Duplicate detection: Checking ${newAssets.length} new assets against ${assetsToCheck.length} existing assets${targetSnapshotId ? ` (snapshot: ${targetSnapshotId})` : ' (all snapshots)'}`
  );

  // Step 1: Initialize all review assets with DB matches
  const reviewAssets: ReviewAsset[] = newAssets.map((newAsset, i) => {
    const matches = detectDuplicatesForAsset(newAsset, assetsToCheck, config);

    return {
      ...newAsset,
      id: `new-${i}`,
      is_duplicate: matches.length > 0,
      duplicate_matches: matches,
      is_selected: matches.length === 0,
    };
  });

  // Step 2: Detect intra-batch duplicates (bidirectional all-pairs comparison)
  for (let i = 0; i < newAssets.length; i++) {
    // Check against all subsequent assets (forward-looking)
    for (let j = i + 1; j < newAssets.length; j++) {
      const asset1 = newAssets[i];
      const asset2 = newAssets[j];

      const nameSimilarity = calculateNameSimilarity(
        asset1.asset_name,
        asset2.asset_name
      );

      if (nameSimilarity >= config.similarityThreshold) {
        const valueSimilarity = calculateValueSimilarity(
          asset1.current_value,
          asset2.current_value,
          config.valueTolerancePercentage
        );

        const overallScore = calculateDuplicateScore(
          asset1.asset_name,
          asset2.asset_name,
          asset1.current_value,
          asset2.current_value,
          config
        );

        if (overallScore >= config.similarityThreshold) {
          const matchType = getMatchType(nameSimilarity, valueSimilarity);

          // Add asset2 as a match to asset1
          if (!reviewAssets[i].duplicate_matches) {
            reviewAssets[i].duplicate_matches = [];
          }
          reviewAssets[i].duplicate_matches!.push({
            existing_asset_name: asset2.asset_name,
            existing_value: asset2.current_value,
            existing_source: asset2.source_file || 'Current upload',
            similarity_score: overallScore / 100,
            match_type: matchType,
          });

          // Add asset1 as a match to asset2 (bidirectional)
          if (!reviewAssets[j].duplicate_matches) {
            reviewAssets[j].duplicate_matches = [];
          }
          reviewAssets[j].duplicate_matches!.push({
            existing_asset_name: asset1.asset_name,
            existing_value: asset1.current_value,
            existing_source: asset1.source_file || 'Current upload',
            similarity_score: overallScore / 100,
            match_type: matchType,
          });

          // Flag both as duplicates
          reviewAssets[i].is_duplicate = true;
          reviewAssets[i].is_selected = false;
          reviewAssets[j].is_duplicate = true;
          reviewAssets[j].is_selected = false;
        }
      }
    }
  }

  const duplicatesFound = reviewAssets.filter((a) => a.is_duplicate).length;
  console.log(`✅ Found ${duplicatesFound} duplicates out of ${newAssets.length} assets`);

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
