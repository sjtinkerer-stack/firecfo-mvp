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
import { Loader2, TrendingUp, Shield, Wallet, Home, Gem } from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateLifestyleInflationAdjustment,
  calculateFireMetrics,
} from '@/app/onboarding/utils/fire-calculations';

// Validation schema
const assetsSchema = z.object({
  equity: z.number().min(0, 'Equity cannot be negative'),
  debt: z.number().min(0, 'Debt cannot be negative'),
  cash: z.number().min(0, 'Cash cannot be negative'),
  real_estate: z.number().min(0, 'Real estate cannot be negative'),
  other_assets: z.number().min(0, 'Other assets cannot be negative'),
});

interface EditAssetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentData: {
    equity: number;
    debt: number;
    cash: number;
    realEstate: number;
    otherAssets: number;
    age: number;
    dependents: number;
    fireAge: number;
    fireLifestyleType: 'lean' | 'standard' | 'fat';
    monthlyIncome: number;
    spouseIncome: number;
    monthlyExpenses: number;
  };
  onSave: () => void;
}

export function EditAssetsModal({
  open,
  onOpenChange,
  currentData,
  onSave,
}: EditAssetsModalProps) {
  const [equity, setEquity] = useState(currentData.equity);
  const [debt, setDebt] = useState(currentData.debt);
  const [cash, setCash] = useState(currentData.cash);
  const [realEstate, setRealEstate] = useState(currentData.realEstate);
  const [otherAssets, setOtherAssets] = useState(currentData.otherAssets);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    // Reset errors
    setErrors({});

    // Validate
    const result = assetsSchema.safeParse({
      equity,
      debt,
      cash,
      real_estate: realEstate,
      other_assets: otherAssets,
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

    setIsLoading(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Calculate new net worth
      const newNetWorth = equity + debt + cash + realEstate + otherAssets;

      // Recalculate FIRE metrics
      const householdIncome = currentData.monthlyIncome + currentData.spouseIncome;
      const monthlySavings = householdIncome - currentData.monthlyExpenses;
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
        currentData.monthlyExpenses,
        newNetWorth,
        monthlySavings,
        householdIncome,
        LIA
      );

      // Update database
      const { error } = await supabase
        .from('user_profiles')
        .update({
          equity,
          debt,
          cash,
          real_estate: realEstate,
          other_assets: otherAssets,
          // Update ALL calculated metrics (not just projected corpus)
          lifestyle_inflation_adjustment: fireMetrics.lifestyleInflationAdjustment,
          safe_withdrawal_rate: fireMetrics.safeWithdrawalRate,
          post_fire_monthly_expense: fireMetrics.postFireMonthlyExpense,
          required_corpus: fireMetrics.requiredCorpus,
          projected_corpus_at_fire: fireMetrics.projectedCorpusAtFire,
          is_on_track: fireMetrics.isOnTrack,
          monthly_savings_needed: fireMetrics.monthlySavingsNeeded,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Assets updated successfully!', {
        description: `Your net worth is now ${formatCurrency(newNetWorth)}`,
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating assets:', error);
      toast.error('Failed to update assets', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)} L`;
    } else {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(value);
    }
  };

  const totalNetWorth = equity + debt + cash + realEstate + otherAssets;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Assets</DialogTitle>
          <DialogDescription>
            Update your asset allocation. FIRE projections will be recalculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Equity */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <Label htmlFor="equity">Equity</Label>
            </div>
            <Input
              id="equity"
              type="number"
              value={equity}
              onChange={(e) => setEquity(Number(e.target.value))}
              placeholder="Stocks, mutual funds, index funds"
              className={errors.equity ? 'border-red-500' : ''}
            />
            {errors.equity && <p className="text-sm text-red-500">{errors.equity}</p>}
            <p className="text-sm text-gray-500">{formatCurrency(equity)}</p>
          </div>

          {/* Debt */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Label htmlFor="debt">Debt</Label>
            </div>
            <Input
              id="debt"
              type="number"
              value={debt}
              onChange={(e) => setDebt(Number(e.target.value))}
              placeholder="FDs, PPF, EPF, bonds"
              className={errors.debt ? 'border-red-500' : ''}
            />
            {errors.debt && <p className="text-sm text-red-500">{errors.debt}</p>}
            <p className="text-sm text-gray-500">{formatCurrency(debt)}</p>
          </div>

          {/* Cash */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-950">
                <Wallet className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <Label htmlFor="cash">Cash</Label>
            </div>
            <Input
              id="cash"
              type="number"
              value={cash}
              onChange={(e) => setCash(Number(e.target.value))}
              placeholder="Savings accounts, liquid funds"
              className={errors.cash ? 'border-red-500' : ''}
            />
            {errors.cash && <p className="text-sm text-red-500">{errors.cash}</p>}
            <p className="text-sm text-gray-500">{formatCurrency(cash)}</p>
          </div>

          {/* Real Estate */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950">
                <Home className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <Label htmlFor="real_estate">Real Estate</Label>
            </div>
            <Input
              id="real_estate"
              type="number"
              value={realEstate}
              onChange={(e) => setRealEstate(Number(e.target.value))}
              placeholder="Property values"
              className={errors.real_estate ? 'border-red-500' : ''}
            />
            {errors.real_estate && <p className="text-sm text-red-500">{errors.real_estate}</p>}
            <p className="text-sm text-gray-500">{formatCurrency(realEstate)}</p>
          </div>

          {/* Other Assets */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950">
                <Gem className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <Label htmlFor="other_assets">Other Assets</Label>
            </div>
            <Input
              id="other_assets"
              type="number"
              value={otherAssets}
              onChange={(e) => setOtherAssets(Number(e.target.value))}
              placeholder="Gold, crypto, vehicles"
              className={errors.other_assets ? 'border-red-500' : ''}
            />
            {errors.other_assets && (
              <p className="text-sm text-red-500">{errors.other_assets}</p>
            )}
            <p className="text-sm text-gray-500">{formatCurrency(otherAssets)}</p>
          </div>

          {/* Total Net Worth */}
          <div className="rounded-lg bg-violet-50 p-4 dark:bg-violet-950/20">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Net Worth:
              </span>
              <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                {formatCurrency(totalNetWorth)}
              </span>
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
