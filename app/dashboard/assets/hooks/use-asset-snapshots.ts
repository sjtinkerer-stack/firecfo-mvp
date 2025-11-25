// Hook: Fetch and manage asset snapshots

'use client';

import { useState, useCallback, useEffect } from 'react';
import { AssetSnapshot } from '@/app/lib/assets';

interface EnrichedSnapshot extends AssetSnapshot {
  asset_count: number;
}

interface SnapshotsResult {
  snapshots: EnrichedSnapshot[];
  summary: {
    total_snapshots: number;
    latest_snapshot: EnrichedSnapshot | null;
    earliest_snapshot: EnrichedSnapshot | null;
    networth_change: {
      absolute: number;
      percentage: number;
    } | null;
  };
}

export function useAssetSnapshots(autoFetch = false) {
  const [snapshots, setSnapshots] = useState<EnrichedSnapshot[]>([]);
  const [summary, setSummary] = useState<SnapshotsResult['summary'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch snapshots from API
   */
  const fetchSnapshots = useCallback(
    async (limit = 50, sourceType?: string): Promise<SnapshotsResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        if (sourceType) params.append('source_type', sourceType);

        const response = await fetch(`/api/assets/snapshots?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch snapshots');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Fetch failed');
        }

        setSnapshots(data.snapshots);
        setSummary(data.summary);

        return data as SnapshotsResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Fetch snapshots error:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get latest snapshot
   */
  const getLatestSnapshot = useCallback((): EnrichedSnapshot | null => {
    return snapshots.length > 0 ? snapshots[0] : null;
  }, [snapshots]);

  /**
   * Refresh snapshots (refetch from API)
   */
  const refresh = useCallback(() => {
    return fetchSnapshots();
  }, [fetchSnapshots]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchSnapshots();
    }
  }, [autoFetch, fetchSnapshots]);

  return {
    snapshots,
    summary,
    loading,
    error,
    fetchSnapshots,
    getLatestSnapshot,
    refresh,
  };
}
