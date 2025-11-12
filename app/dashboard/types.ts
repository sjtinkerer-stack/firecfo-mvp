/**
 * Dashboard TypeScript Types
 * Interfaces for FIRE Dashboard data structures
 */

export interface DashboardData {
  // User info
  userId: string;
  userName: string | null;
  userEmail: string;
  dateOfBirth: string; // ISO date string (source of truth)
  age: number; // Computed from dateOfBirth
  city: string;
  maritalStatus: 'Single' | 'Married';
  dependents: number;

  // FIRE goal
  fireTargetDate: string; // ISO date string (source of truth)
  fireTargetAge: number; // User's preferred FIRE age (e.g., 45)
  fireAge: number; // Computed current FIRE age (for backwards compatibility)
  fireLifestyleType: 'lean' | 'standard' | 'fat';
  yearsToFire: number; // Computed from fireTargetDate
  fireCountdown: {
    years: number;
    months: number;
    days: number;
    totalDays: number;
  };

  // Income & expenses
  monthlyIncome: number;
  spouseIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;

  // Net worth breakdown
  currentNetworth: number;
  equity: number;
  debt: number;
  cash: number;
  realEstate: number;
  otherAssets: number;

  // FIRE calculations (auto-calculated from onboarding)
  postFireMonthlyExpense: number;
  requiredCorpus: number;
  projectedCorpusAtFire: number;
  monthlySavingsNeeded: number;
  isOnTrack: boolean;

  // Calculation metadata
  lifestyleInflationAdjustment: number;
  safeWithdrawalRate: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  onboardingCompleted: boolean;
}

export interface NetWorthChartDataPoint {
  year: number;
  age: number;
  label: string;
  currentNetworth?: number;
  projectedCorpus?: number;
  requiredCorpus?: number;
}

export interface AssetAllocation {
  name: string;
  value: number;
  percentage: number;
  color: string;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  colorTheme?: 'emerald' | 'violet' | 'orange' | 'blue' | 'amber' | 'slate' | 'indigo' | 'cyan' | 'sky';
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  badge?: React.ReactNode; // Semantic overlay (status, comparison, etc.)
  className?: string;
  onEdit?: () => void;
}

export interface FireStatusBannerProps {
  isOnTrack: boolean;
  fireAge: number; // For backwards compatibility
  fireTargetDate: string; // ISO date string for precise countdown
  fireLifestyleType: 'lean' | 'standard' | 'fat';
  yearsToFire: number;
  monthlySavingsNeeded: number;
  currentMonthlySavings: number;
}
