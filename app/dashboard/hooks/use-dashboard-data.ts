/**
 * Dashboard Data Hook
 * Custom hook to fetch and transform user profile data for dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardData } from '../types';

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Transform database row to DashboardData
      const dashboardData: DashboardData = {
        // User info
        userId: profile.id,
        age: profile.age || 0,
        city: profile.city || '',
        maritalStatus: profile.marital_status || 'Single',
        dependents: profile.dependents || 0,

        // FIRE goal
        fireAge: profile.fire_age || 0,
        fireLifestyleType: profile.fire_lifestyle_type || 'standard',
        yearsToFire: (profile.fire_age || 0) - (profile.age || 0),

        // Income & expenses
        monthlyIncome: profile.monthly_income || 0,
        spouseIncome: profile.spouse_income || 0,
        monthlyExpenses: profile.monthly_expenses || 0,
        monthlySavings: (profile.monthly_income || 0) + (profile.spouse_income || 0) - (profile.monthly_expenses || 0),
        savingsRate:
          ((profile.monthly_income || 0) + (profile.spouse_income || 0) - (profile.monthly_expenses || 0)) /
          ((profile.monthly_income || 0) + (profile.spouse_income || 0) || 1),

        // Net worth breakdown
        currentNetworth:
          (profile.equity || 0) +
          (profile.debt || 0) +
          (profile.cash || 0) +
          (profile.real_estate || 0) +
          (profile.other_assets || 0),
        equity: profile.equity || 0,
        debt: profile.debt || 0,
        cash: profile.cash || 0,
        realEstate: profile.real_estate || 0,
        otherAssets: profile.other_assets || 0,

        // FIRE calculations
        postFireMonthlyExpense: profile.post_fire_monthly_expense || 0,
        requiredCorpus: profile.required_corpus || 0,
        projectedCorpusAtFire: profile.projected_corpus_at_fire || 0,
        monthlySavingsNeeded: profile.monthly_savings_needed || 0,
        isOnTrack: profile.is_on_track || false,

        // Calculation metadata
        lifestyleInflationAdjustment: profile.lifestyle_inflation_adjustment || 0,
        safeWithdrawalRate: profile.safe_withdrawal_rate || 4.0,

        // Timestamps
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        onboardingCompleted: profile.onboarding_completed || false,
      };

      setData(dashboardData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
