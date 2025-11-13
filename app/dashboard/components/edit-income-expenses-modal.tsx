'use client';

import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateLifestyleInflationAdjustment,
  calculateFireMetrics,
} from '@/app/onboarding/utils/fire-calculations';

// Validation schemas
const incomeExpensesSchema = z.object({
  monthly_income: z
    .number()
    .min(10000, 'Income must be at least ₹10,000')
    .max(5000000, 'Income cannot exceed ₹50,00,000'),
  spouse_income: z
    .number()
    .min(0, 'Spouse income cannot be negative')
    .max(5000000, 'Income cannot exceed ₹50,00,000'),
  monthly_expenses: z
    .number()
    .min(5000, 'Expenses must be at least ₹5,000')
    .max(10000000, 'Expenses cannot exceed ₹1,00,00,000'),
});

interface EditIncomeExpensesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentData: {
    monthlyIncome: number;
    spouseIncome: number;
    monthlyExpenses: number;
    age: number;
    dependents: number;
    fireAge: number;
    fireLifestyleType: 'lean' | 'standard' | 'fat';
    currentNetWorth: number;
    maritalStatus: 'Single' | 'Married';
  };
  onSave: () => void;
}

export function EditIncomeExpensesModal({
  open,
  onOpenChange,
  currentData,
  onSave,
}: EditIncomeExpensesModalProps) {
  const [monthlyIncome, setMonthlyIncome] = useState(currentData.monthlyIncome);
  const [spouseIncome, setSpouseIncome] = useState(currentData.spouseIncome);
  const [monthlyExpenses, setMonthlyExpenses] = useState(currentData.monthlyExpenses);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    // Reset errors
    setErrors({});

    // Validate
    const result = incomeExpensesSchema.safeParse({
      monthly_income: monthlyIncome,
      spouse_income: spouseIncome,
      monthly_expenses: monthlyExpenses,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    // Additional validation: expenses cannot exceed income
    const totalIncome = monthlyIncome + spouseIncome;
    if (monthlyExpenses >= totalIncome) {
      setErrors({
        monthly_expenses: 'Expenses cannot exceed or equal your household income',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Force spouse income to 0 if user is single
      const effectiveSpouseIncome = currentData.maritalStatus === 'Single' ? 0 : spouseIncome;

      // Recalculate FIRE metrics
      const householdIncome = monthlyIncome + effectiveSpouseIncome;
      const monthlySavings = householdIncome - monthlyExpenses;
      const savingsRate = (monthlySavings / householdIncome) * 100;

      const LIA = calculateLifestyleInflationAdjustment(
        currentData.age,
        currentData.dependents,
        savingsRate,
        currentData.fireLifestyleType
      );

      const yearsToFire = currentData.fireAge - currentData.age;

      const fireMetrics = calculateFireMetrics(
        currentData.age,
        currentData.fireAge,
        yearsToFire,
        monthlyExpenses,
        currentData.currentNetWorth,
        monthlySavings,
        householdIncome,
        LIA
      );

      // Update database
      const { error } = await supabase
        .from('user_profiles')
        .update({
          monthly_income: monthlyIncome,
          spouse_income: effectiveSpouseIncome,
          monthly_expenses: monthlyExpenses,
          // Update calculated metrics
          lifestyle_inflation_adjustment: fireMetrics.lifestyleInflationAdjustment,
          safe_withdrawal_rate: fireMetrics.safeWithdrawalRate,
          post_fire_monthly_expense: fireMetrics.postFireMonthlyExpense,
          required_corpus: fireMetrics.requiredCorpus,
          projected_corpus_at_fire: fireMetrics.projectedCorpusAtFire,
          monthly_savings_needed: fireMetrics.monthlySavingsNeeded,
          is_on_track: fireMetrics.isOnTrack,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Profile updated successfully!', {
        description: 'Your income and expenses have been updated.',
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalIncome = monthlyIncome + spouseIncome;
  const totalSavings = Math.max(0, totalIncome - monthlyExpenses);
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Income & Expenses</DialogTitle>
          <DialogDescription>
            Update your monthly income and expenses. FIRE metrics will be recalculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Monthly Income */}
          <div className="space-y-2">
            <Label htmlFor="monthly_income">Your Monthly Income</Label>
            <Input
              id="monthly_income"
              type="number"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(Number(e.target.value))}
              placeholder="Enter amount"
              className={errors.monthly_income ? 'border-red-500' : ''}
            />
            {errors.monthly_income && (
              <p className="text-sm text-red-500">{errors.monthly_income}</p>
            )}
            <p className="text-sm text-gray-500">{formatCurrency(monthlyIncome)}</p>
          </div>

          {/* Spouse Income - Only show if married */}
          {currentData.maritalStatus === 'Married' && (
            <div className="space-y-2">
              <Label htmlFor="spouse_income">Spouse Monthly Income (Optional)</Label>
              <Input
                id="spouse_income"
                type="number"
                value={spouseIncome}
                onChange={(e) => setSpouseIncome(Number(e.target.value))}
                placeholder="Enter amount"
                className={errors.spouse_income ? 'border-red-500' : ''}
              />
              {errors.spouse_income && (
                <p className="text-sm text-red-500">{errors.spouse_income}</p>
              )}
              <p className="text-sm text-gray-500">{formatCurrency(spouseIncome)}</p>
            </div>
          )}

          {/* Monthly Expenses */}
          <div className="space-y-2">
            <Label htmlFor="monthly_expenses">Monthly Expenses</Label>
            <Input
              id="monthly_expenses"
              type="number"
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
              placeholder="Enter amount"
              className={errors.monthly_expenses ? 'border-red-500' : ''}
            />
            {errors.monthly_expenses && (
              <p className="text-sm text-red-500">{errors.monthly_expenses}</p>
            )}
            <p className="text-sm text-gray-500">{formatCurrency(monthlyExpenses)}</p>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/20">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Household Income:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalIncome)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Monthly Savings:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalSavings)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Savings Rate:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {savingsRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
