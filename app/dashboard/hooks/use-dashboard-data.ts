/**
 * Dashboard Data Hook
 * Custom hook to fetch and transform user profile data for dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardData } from '../types';
import { calculateAge, calculateYearsToFire, calculateFireCountdown } from '@/app/utils/date-helpers';

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

      // Compute age from date_of_birth
      const age = profile.date_of_birth ? calculateAge(profile.date_of_birth) : 0;

      // Compute detailed countdown to FIRE from fire_target_date
      const fireCountdown = profile.fire_target_date
        ? calculateFireCountdown(profile.fire_target_date)
        : { years: 0, months: 0, days: 0, totalDays: 0 };

      // Compute years to FIRE as decimal for backwards compatibility
      const yearsToFire = fireCountdown.years + (fireCountdown.months / 12);

      // fireAge is the user's preferred target age (stored), for backwards compatibility
      const fireAge = profile.fire_target_age || 0;

      // Transform database row to DashboardData
      const dashboardData: DashboardData = {
        // User info
        userId: profile.id,
        userName: user.user_metadata?.full_name || user.user_metadata?.name || null,
        userEmail: user.email || '',
        dateOfBirth: profile.date_of_birth || '',
        age,
        city: profile.city || '',
        maritalStatus: profile.marital_status || 'Single',
        dependents: profile.dependents || 0,

        // FIRE goal
        fireTargetDate: profile.fire_target_date || '',
        fireTargetAge: profile.fire_target_age || 0,
        fireAge, // For backwards compatibility
        fireLifestyleType: profile.fire_lifestyle_type || 'standard',
        yearsToFire,
        fireCountdown,

        // Income & expenses
        monthlyIncome: profile.monthly_income || 0,
        spouseIncome: profile.spouse_income || 0,
        monthlyExpenses: profile.monthly_expenses || 0,
        monthlySavings: (profile.monthly_income || 0) + (profile.spouse_income || 0) - (profile.monthly_expenses || 0),
        // Calculate savings rate as percentage (0-100, matching onboarding calculation)
        savingsRate:
          (((profile.monthly_income || 0) + (profile.spouse_income || 0) - (profile.monthly_expenses || 0)) /
          ((profile.monthly_income || 0) + (profile.spouse_income || 0) || 1)) * 100,

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
        safeWithdrawalRate: profile.safe_withdrawal_rate || 0.04,

        // Timestamps
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        onboardingCompleted: profile.onboarding_completed || false,
      };

      setData(dashboardData);

      // Development-only validation: Check calculation consistency
      if (process.env.NODE_ENV === 'development' && dashboardData.requiredCorpus > 0) {
        const calculatedMultiplier = 1 / dashboardData.safeWithdrawalRate;
        const postFireAnnualExpense = dashboardData.postFireMonthlyExpense * 12;
        const inflationMultiplier = Math.pow(1.06, dashboardData.yearsToFire);
        const inflationAdjustedAnnualExpense = postFireAnnualExpense * inflationMultiplier;
        const expectedCorpus = inflationAdjustedAnnualExpense * calculatedMultiplier;

        const difference = Math.abs(expectedCorpus - dashboardData.requiredCorpus);
        const percentDiff = (difference / dashboardData.requiredCorpus) * 100;

        if (percentDiff > 1) { // More than 1% difference
          console.warn('⚠️ Required corpus calculation mismatch detected!', {
            stored: dashboardData.requiredCorpus,
            calculated: expectedCorpus,
            difference: difference,
            percentDiff: percentDiff.toFixed(2) + '%',
            breakdown: {
              postFireMonthlyExpense: dashboardData.postFireMonthlyExpense,
              postFireAnnualExpense,
              yearsToFire: dashboardData.yearsToFire,
              inflationMultiplier: inflationMultiplier.toFixed(4),
              inflationAdjustedAnnualExpense,
              safeWithdrawalRate: dashboardData.safeWithdrawalRate,
              corpusMultiplier: calculatedMultiplier.toFixed(2)
            }
          });
        } else {
          console.log('✅ Required corpus calculation validated:', {
            stored: dashboardData.requiredCorpus,
            calculated: expectedCorpus,
            difference: difference,
            match: 'OK'
          });
        }
      }
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
