// Utility: Calculate weighted portfolio return based on actual asset allocation

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface PortfolioReturn {
  weighted_return: number; // Percentage (e.g., 11.5 for 11.5%)
  total_value: number;
  breakdown: {
    asset_class: string;
    asset_subclass: string;
    value: number;
    allocation_percentage: number;
    expected_return: number;
    contribution_to_return: number; // Percentage points
  }[];
}

/**
 * Calculate weighted portfolio return for a user based on their latest snapshot
 * Uses actual asset allocation and historical return data per sub-class
 */
export async function calculateUserPortfolioReturn(
  userId: string
): Promise<PortfolioReturn | null> {
  try {
    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // 1. Get user's latest snapshot
    const { data: snapshots, error: snapshotError } = await supabase
      .from('asset_snapshots')
      .select('id, total_networth')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1);

    if (snapshotError || !snapshots || snapshots.length === 0) {
      console.log('No snapshots found for user, using default 12% return');
      return null; // No snapshots means new user, use default
    }

    const latestSnapshot = snapshots[0];

    if (latestSnapshot.total_networth === 0) {
      console.log('Net worth is 0, using default 12% return');
      return null;
    }

    // 2. Get assets for that snapshot (excluding duplicates)
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('current_value, asset_class, asset_subclass, expected_return_percentage')
      .eq('snapshot_id', latestSnapshot.id)
      .eq('is_duplicate', false);

    if (assetsError || !assets || assets.length === 0) {
      console.log('No assets found in snapshot, using default 12% return');
      return null;
    }

    // 3. Calculate weighted return
    let weightedReturn = 0;
    const breakdown: PortfolioReturn['breakdown'] = [];

    for (const asset of assets) {
      const allocation = asset.current_value / latestSnapshot.total_networth;
      const returnContribution = allocation * asset.expected_return_percentage;
      weightedReturn += returnContribution;

      breakdown.push({
        asset_class: asset.asset_class,
        asset_subclass: asset.asset_subclass,
        value: asset.current_value,
        allocation_percentage: allocation * 100, // Convert to percentage
        expected_return: asset.expected_return_percentage,
        contribution_to_return: returnContribution,
      });
    }

    // 4. Round to 1 decimal place
    weightedReturn = Math.round(weightedReturn * 10) / 10;

    // Sanity check: If weighted return is outside reasonable bounds, use default
    if (weightedReturn < 0 || weightedReturn > 30) {
      console.warn(
        `Calculated weighted return ${weightedReturn}% is outside reasonable bounds. Using default 12%.`
      );
      return null;
    }

    return {
      weighted_return: weightedReturn,
      total_value: latestSnapshot.total_networth,
      breakdown: breakdown.sort((a, b) => b.allocation_percentage - a.allocation_percentage), // Sort by allocation
    };
  } catch (error) {
    console.error('Error calculating portfolio return:', error);
    return null;
  }
}

/**
 * Get portfolio return for display (with fallback to default)
 * Returns a formatted object ready for UI display
 */
export async function getPortfolioReturnForDisplay(userId: string): Promise<{
  return_percentage: number;
  is_calculated: boolean; // true if calculated from assets, false if using default
  breakdown?: PortfolioReturn['breakdown'];
  message: string;
}> {
  const calculated = await calculateUserPortfolioReturn(userId);

  if (calculated) {
    return {
      return_percentage: calculated.weighted_return,
      is_calculated: true,
      breakdown: calculated.breakdown,
      message: `Based on your actual asset allocation across ${calculated.breakdown.length} assets`,
    };
  }

  // Fallback to default 12%
  return {
    return_percentage: 12.0,
    is_calculated: false,
    message: 'Using default 12% return (upload statements for personalized calculation)',
  };
}

/**
 * Calculate age-adjusted portfolio return
 * As user approaches FIRE, expected return decreases due to risk reduction
 */
export async function calculateAgeAdjustedReturn(
  userId: string,
  currentAge: number,
  fireTargetAge: number
): Promise<number> {
  // Get current portfolio return
  const portfolioReturn = await calculateUserPortfolioReturn(userId);
  const baseReturn = portfolioReturn?.weighted_return || 12.0;

  // Years until FIRE
  const yearsToFire = fireTargetAge - currentAge;

  if (yearsToFire <= 0) {
    // Already at or past FIRE age, use conservative post-FIRE return
    return 8.0; // Conservative post-retirement return
  }

  // Gradual de-risking as user approaches FIRE
  // Reduce return by 0.2% per year in the last 10 years before FIRE
  if (yearsToFire <= 10) {
    const reduction = (10 - yearsToFire) * 0.2;
    const adjustedReturn = baseReturn - reduction;
    return Math.max(adjustedReturn, 8.0); // Min 8% (post-FIRE return)
  }

  // More than 10 years away, use current portfolio return
  return baseReturn;
}

/**
 * Get recommended allocation based on age (for comparison with actual allocation)
 */
export function getRecommendedAllocation(age: number): {
  equity: number;
  debt: number;
  cash: number;
} {
  // Rule of thumb: Equity% = 100 - Age (clamped between 30-70%)
  const equityPercentage = Math.max(30, Math.min(70, 100 - age));
  const debtPercentage = Math.max(20, Math.min(50, age));
  const cashPercentage = 100 - equityPercentage - debtPercentage;

  return {
    equity: equityPercentage,
    debt: debtPercentage,
    cash: cashPercentage,
  };
}

/**
 * Compare actual allocation vs recommended allocation
 * Returns suggestions for rebalancing
 */
export async function getRebalancingSuggestions(
  userId: string,
  age: number
): Promise<{
  needs_rebalancing: boolean;
  suggestions: string[];
  deviation: {
    equity: number; // Percentage points difference
    debt: number;
    cash: number;
  };
} | null> {
  const portfolioReturn = await calculateUserPortfolioReturn(userId);

  if (!portfolioReturn || !portfolioReturn.breakdown) {
    return null; // Can't provide suggestions without asset data
  }

  // Calculate actual allocation by class
  const actualAllocation = portfolioReturn.breakdown.reduce(
    (acc, item) => {
      const assetClass = item.asset_class as string;
      if (!acc[assetClass]) {
        acc[assetClass] = 0;
      }
      acc[assetClass] += item.allocation_percentage;
      return acc;
    },
    {} as Record<string, number>
  );

  const recommended = getRecommendedAllocation(age);

  // Calculate deviations
  const deviation = {
    equity: (actualAllocation['equity'] || 0) - recommended.equity,
    debt: (actualAllocation['debt'] || 0) - recommended.debt,
    cash: (actualAllocation['cash'] || 0) - recommended.cash,
  };

  // Threshold for rebalancing suggestion: >10% deviation
  const needsRebalancing =
    Math.abs(deviation.equity) > 10 ||
    Math.abs(deviation.debt) > 10 ||
    Math.abs(deviation.cash) > 10;

  const suggestions: string[] = [];

  if (deviation.equity > 10) {
    suggestions.push(
      `Your equity allocation is ${deviation.equity.toFixed(1)}% higher than recommended. Consider shifting ${Math.abs(deviation.equity).toFixed(0)}% to debt or cash for better risk balance.`
    );
  } else if (deviation.equity < -10) {
    suggestions.push(
      `Your equity allocation is ${Math.abs(deviation.equity).toFixed(1)}% lower than recommended. Consider increasing equity exposure for better growth potential.`
    );
  }

  if (deviation.debt > 10) {
    suggestions.push(
      `Your debt allocation is ${deviation.debt.toFixed(1)}% higher than recommended. This might limit your growth potential.`
    );
  } else if (deviation.debt < -10) {
    suggestions.push(
      `Your debt allocation is ${Math.abs(deviation.debt).toFixed(1)}% lower than recommended. Consider adding more stable assets for risk management.`
    );
  }

  if (deviation.cash > 10) {
    suggestions.push(
      `You have ${deviation.cash.toFixed(1)}% more cash than recommended. Consider deploying it to equity or debt for better returns.`
    );
  }

  return {
    needs_rebalancing: needsRebalancing,
    suggestions,
    deviation,
  };
}
