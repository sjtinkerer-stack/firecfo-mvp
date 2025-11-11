/**
 * Settings Page
 * User profile and FIRE goal management
 * Does NOT include income/expenses/assets (those stay on dashboard)
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ChevronLeft, User, Target } from 'lucide-react';
import { SettingsSection } from './components/settings-section';
import { EditPersonalInfoModal } from './components/edit-personal-info-modal';
import { EditFireGoalModal } from './components/edit-fire-goal-modal';
import { format, parseISO } from 'date-fns';
import { formatFireTargetDate } from '@/app/utils/date-helpers';

export default function SettingsPage() {
  const router = useRouter();
  const { data, loading, error, refetch } = useDashboardData();
  const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);
  const [isFireGoalModalOpen, setIsFireGoalModalOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (hasChecked) return;

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setHasChecked(true);
    };

    checkUser();
  }, [router, hasChecked]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-600" />
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
        <div className="max-w-md rounded-lg border-2 border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
          <h3 className="mt-4 text-xl font-bold text-red-900 dark:text-red-100">
            Failed to Load Settings
          </h3>
          <p className="mt-2 text-red-700 dark:text-red-300">{error || 'Unknown error occurred'}</p>
        </div>
      </div>
    );
  }

  // Format lifestyle type for display
  const lifestyleTypeDisplay = {
    lean: 'Lean FIRE',
    standard: 'Standard FIRE',
    fat: 'Fat FIRE',
  }[data.fireLifestyleType];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Manage your profile and FIRE goals
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            ℹ️ Any changes to your settings will automatically recalculate your FIRE plan. Use the
            preview in each modal to see how changes will impact your goals.
          </p>
        </div>

        <div className="space-y-6">
          {/* Personal Information Section */}
          <SettingsSection
            title="Personal Information"
            icon={<User className="h-5 w-5" />}
            onEdit={() => setIsPersonalInfoModalOpen(true)}
            colorTheme="blue"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data.dateOfBirth ? format(parseISO(data.dateOfBirth), 'dd MMMM yyyy') : 'Not set'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Age: {data.age} years
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">City</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data.city}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Marital Status</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data.maritalStatus}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Dependents</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data.dependents} {data.dependents === 1 ? 'person' : 'people'}
                </p>
              </div>
            </div>
          </SettingsSection>

          {/* FIRE Goal Section */}
          <SettingsSection
            title="FIRE Goal"
            icon={<Target className="h-5 w-5" />}
            onEdit={() => setIsFireGoalModalOpen(true)}
            colorTheme="orange"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Target FIRE Age</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data.fireTargetAge} years
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {data.fireTargetDate ? formatFireTargetDate(data.fireTargetDate) : `${data.yearsToFire} years from now`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Lifestyle Type</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {lifestyleTypeDisplay}
                </p>
              </div>
            </div>
          </SettingsSection>
        </div>

        {/* Edit Modals */}
        <EditPersonalInfoModal
          open={isPersonalInfoModalOpen}
          onOpenChange={setIsPersonalInfoModalOpen}
          currentData={{
            dateOfBirth: data.dateOfBirth,
            age: data.age,
            city: data.city,
            maritalStatus: data.maritalStatus,
            dependents: data.dependents,
            fireTargetAge: data.fireTargetAge,
            fireAge: data.fireAge,
            spouseIncome: data.spouseIncome,
            monthlyIncome: data.monthlyIncome,
            monthlyExpenses: data.monthlyExpenses,
            fireLifestyleType: data.fireLifestyleType,
            currentNetWorth: data.currentNetworth,
            currentSWR: data.safeWithdrawalRate,
            currentRequiredCorpus: data.requiredCorpus,
          }}
          onSave={refetch}
        />

        <EditFireGoalModal
          open={isFireGoalModalOpen}
          onOpenChange={setIsFireGoalModalOpen}
          currentData={{
            dateOfBirth: data.dateOfBirth,
            age: data.age,
            fireAge: data.fireAge,
            fireTargetAge: data.fireTargetAge,
            fireTargetDate: data.fireTargetDate,
            fireLifestyleType: data.fireLifestyleType,
            monthlyExpenses: data.monthlyExpenses,
            dependents: data.dependents,
            monthlyIncome: data.monthlyIncome,
            spouseIncome: data.spouseIncome,
            currentNetWorth: data.currentNetworth,
            currentSWR: data.safeWithdrawalRate,
            currentRequiredCorpus: data.requiredCorpus,
            currentYearsToFire: data.yearsToFire,
          }}
          onSave={refetch}
        />
      </div>
    </div>
  );
}
