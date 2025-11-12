/**
 * DashboardOverview Component
 * Main dashboard orchestrator - displays FIRE status, metrics, and charts
 */

'use client';

import { useState } from 'react';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { MetricCard } from './metric-card';
import { NetWorthChart } from './networth-chart';
import { EditIncomeExpensesModal } from './edit-income-expenses-modal';
import { EditAssetsModal } from './edit-assets-modal';
import { FireGapAnalysisCard } from './fire-gap-analysis-card';
import { IntegratedNetworthCard } from './integrated-networth-card';
import {
  generateNetWorthChartData,
  formatIndianCurrency,
  formatFullIndianCurrency,
} from '../utils/dashboard-calculations';
import {
  PiggyBank,
  IndianRupee,
  TrendingDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export function DashboardOverview() {
  const { data, loading, error, refetch } = useDashboardData();
  const [isIncomeExpensesModalOpen, setIsIncomeExpensesModalOpen] = useState(false);
  const [isAssetsModalOpen, setIsAssetsModalOpen] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-600" />
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-lg border-2 border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
          <h3 className="mt-4 text-xl font-bold text-red-900 dark:text-red-100">
            Failed to Load Dashboard
          </h3>
          <p className="mt-2 text-red-700 dark:text-red-300">{error || 'Unknown error occurred'}</p>
        </div>
      </div>
    );
  }

  // Generate chart data
  const networthChartData = generateNetWorthChartData(data);

  // Calculate household income
  const householdIncome = data.monthlyIncome + data.spouseIncome;

  return (
    <div className="space-y-8">
      {/* Row 1: FIRE Gap Analysis (Full Width) */}
      <FireGapAnalysisCard
        requiredCorpus={data.requiredCorpus}
        projectedCorpusAtFire={data.projectedCorpusAtFire}
        isOnTrack={data.isOnTrack}
        monthlySavings={data.monthlySavings}
        monthlySavingsNeeded={data.monthlySavingsNeeded}
        postFireMonthlyExpense={data.postFireMonthlyExpense}
        currentMonthlyExpense={data.monthlyExpenses}
        lifestyleInflationAdjustment={data.lifestyleInflationAdjustment}
        yearsToFire={data.yearsToFire}
        safeWithdrawalRate={data.safeWithdrawalRate}
        fireAge={data.fireAge}
        currentAge={data.age}
        dependents={data.dependents}
        savingsRate={data.savingsRate}
        fireLifestyleType={data.fireLifestyleType}
        fireTargetDate={data.fireTargetDate}
        fireCountdown={data.fireCountdown}
        currentNetworth={data.currentNetworth}
      />

      {/* Row 2: Wealth Tracking (2 columns) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Integrated Net Worth Card */}
        <IntegratedNetworthCard
          currentNetworth={data.currentNetworth}
          assets={{
            equity: data.equity,
            debt: data.debt,
            cash: data.cash,
            realEstate: data.realEstate,
            otherAssets: data.otherAssets,
          }}
          currentAge={data.age}
          onEdit={() => setIsAssetsModalOpen(true)}
        />

        {/* Net Worth Growth Chart */}
        <NetWorthChart data={networthChartData} />
      </div>

      {/* Row 3: Cash Flow (3 columns) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        {/* Monthly Income */}
        <MetricCard
          title="Monthly Household Income"
          value={formatIndianCurrency(householdIncome)}
          subtitle={formatFullIndianCurrency(householdIncome)}
          icon={<IndianRupee className="h-6 w-6" />}
          colorTheme="emerald"
          onEdit={() => setIsIncomeExpensesModalOpen(true)}
        />

        {/* Monthly Expenses */}
        <MetricCard
          title="Monthly Expenses"
          value={formatIndianCurrency(data.monthlyExpenses)}
          subtitle={formatFullIndianCurrency(data.monthlyExpenses)}
          icon={<TrendingDown className="h-6 w-6" />}
          colorTheme="orange"
          onEdit={() => setIsIncomeExpensesModalOpen(true)}
        />

        {/* Savings Rate */}
        <MetricCard
          title="Savings Rate"
          value={`${data.savingsRate.toFixed(1)}%`}
          subtitle={`${formatIndianCurrency(data.monthlySavings)}/month`}
          icon={<PiggyBank className="h-6 w-6" />}
          colorTheme="emerald"
          badge={
            data.savingsRate >= 40 ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <span>🚀</span>
                <span>Excellent - Fast track to FIRE</span>
              </div>
            ) : data.savingsRate >= 20 ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
                <span>✓</span>
                <span>Good progress</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm font-medium text-orange-600 dark:text-orange-400">
                <span>💡</span>
                <span>Consider increasing savings</span>
              </div>
            )
          }
        />
      </div>

      {/* Edit Modals */}
      <EditIncomeExpensesModal
        open={isIncomeExpensesModalOpen}
        onOpenChange={setIsIncomeExpensesModalOpen}
        currentData={{
          monthlyIncome: data.monthlyIncome,
          spouseIncome: data.spouseIncome,
          monthlyExpenses: data.monthlyExpenses,
          age: data.age,
          dependents: data.dependents,
          fireAge: data.fireAge,
          fireLifestyleType: data.fireLifestyleType,
          currentNetWorth: data.currentNetworth,
          maritalStatus: data.maritalStatus,
        }}
        onSave={refetch}
      />

      <EditAssetsModal
        open={isAssetsModalOpen}
        onOpenChange={setIsAssetsModalOpen}
        currentData={{
          equity: data.equity,
          debt: data.debt,
          cash: data.cash,
          realEstate: data.realEstate,
          otherAssets: data.otherAssets,
          age: data.age,
          dependents: data.dependents,
          fireAge: data.fireAge,
          fireLifestyleType: data.fireLifestyleType,
          monthlyIncome: data.monthlyIncome,
          spouseIncome: data.spouseIncome,
          monthlyExpenses: data.monthlyExpenses,
        }}
        onSave={refetch}
      />
    </div>
  );
}
