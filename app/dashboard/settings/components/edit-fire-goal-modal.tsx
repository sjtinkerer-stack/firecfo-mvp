'use client';

import { useState, useEffect } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateLifestyleInflationAdjustment,
  calculateSafeWithdrawalRate,
  calculateFireMetrics,
} from '@/app/onboarding/utils/fire-calculations';
import { ImpactPreview } from './impact-preview';
import { cn } from '@/lib/utils';
import { calculateFireTargetDate, createDateFromYearMonth, getBirthYear, getBirthMonth } from '@/app/utils/date-helpers';

// Validation schema
const fireGoalSchema = z.object({
  fire_target_age: z.number().min(18).max(80),
  fire_lifestyle_type: z.enum(['lean', 'standard', 'fat']),
});

interface EditFireGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentData: {
    dateOfBirth: string;
    age: number;
    fireAge: number; // backwards compat (actually fire_target_age)
    fireTargetAge: number;
    fireTargetDate: string; // ISO date string
    fireLifestyleType: 'lean' | 'standard' | 'fat';
    monthlyExpenses: number;
    dependents: number;
    monthlyIncome: number;
    spouseIncome: number;
    currentNetWorth: number;
    currentSWR: number;
    currentRequiredCorpus: number;
    currentYearsToFire: number;
  };
  onSave: () => void;
}

export function EditFireGoalModal({
  open,
  onOpenChange,
  currentData,
  onSave,
}: EditFireGoalModalProps) {
  const [fireTargetAge, setFireTargetAge] = useState(currentData.fireTargetAge);
  const [lifestyleType, setLifestyleType] = useState<'lean' | 'standard' | 'fat'>(
    currentData.fireLifestyleType
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate preview metrics whenever fireTargetAge or lifestyleType changes
  const [previewMetrics, setPreviewMetrics] = useState<{
    safeWithdrawalRate: number;
    requiredCorpus: number;
    yearsToFire: number;
  } | null>(null);

  // Reset form state when modal opens
  useEffect(() => {
    if (open) {
      setFireTargetAge(currentData.fireTargetAge);
      setLifestyleType(currentData.fireLifestyleType);
      setErrors({});
    }
  }, [open, currentData]);

  useEffect(() => {
    // Calculate new metrics for preview
    const householdIncome = currentData.monthlyIncome + currentData.spouseIncome;
    const monthlySavings = householdIncome - currentData.monthlyExpenses;
    const savingsRate = householdIncome > 0 ? (monthlySavings / householdIncome) * 100 : 0;

    const newLIA = calculateLifestyleInflationAdjustment(
      currentData.age,
      currentData.dependents,
      savingsRate,
      lifestyleType
    );

    const newSWR = calculateSafeWithdrawalRate(fireTargetAge);
    const yearsToFire = fireTargetAge - currentData.age;

    const metrics = calculateFireMetrics(
      currentData.age,
      fireTargetAge,
      currentData.monthlyExpenses,
      currentData.currentNetWorth,
      monthlySavings,
      householdIncome,
      newLIA
    );

    setPreviewMetrics({
      safeWithdrawalRate: newSWR,
      requiredCorpus: metrics.requiredCorpus,
      yearsToFire,
    });
  }, [fireTargetAge, lifestyleType, currentData]);

  const handleSave = async () => {
    // Reset errors
    setErrors({});

    // Validate
    const result = fireGoalSchema.safeParse({
      fire_target_age: fireTargetAge,
      fire_lifestyle_type: lifestyleType,
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

    // Validate FIRE age is greater than current age
    if (fireTargetAge <= currentData.age) {
      setErrors({ fire_target_age: `FIRE age must be greater than your current age (${currentData.age})` });
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

      // Calculate fire_target_date from existing DOB + new fire_target_age
      const dateOfBirth = currentData.dateOfBirth;
      const birthYear = getBirthYear(dateOfBirth);
      const birthMonth = getBirthMonth(dateOfBirth);
      const dobDate = createDateFromYearMonth(birthYear, birthMonth);
      const fireTargetDate = calculateFireTargetDate(dobDate, fireTargetAge);
      const fire_target_date = fireTargetDate.toISOString().split('T')[0];

      // Recalculate all FIRE metrics with new goal
      const householdIncome = currentData.monthlyIncome + currentData.spouseIncome;
      const monthlySavings = householdIncome - currentData.monthlyExpenses;
      const savingsRate = householdIncome > 0 ? (monthlySavings / householdIncome) * 100 : 0;

      const LIA = calculateLifestyleInflationAdjustment(
        currentData.age,
        currentData.dependents,
        savingsRate,
        lifestyleType
      );

      const fireMetrics = calculateFireMetrics(
        currentData.age,
        fireTargetAge,
        currentData.monthlyExpenses,
        currentData.currentNetWorth,
        monthlySavings,
        householdIncome,
        LIA
      );

      // Update database
      const { error } = await supabase
        .from('user_profiles')
        .update({
          fire_target_age: fireTargetAge,
          fire_target_date,
          fire_lifestyle_type: lifestyleType,
          // Update all calculated metrics
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

      const lifestyleLabel = {
        lean: 'Lean',
        standard: 'Standard',
        fat: 'Fat',
      }[lifestyleType];

      toast.success('FIRE goal updated!', {
        description: `Target: ${lifestyleLabel} FIRE at age ${fireTargetAge}. Your plan has been recalculated.`,
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating FIRE goal:', error);
      toast.error('Failed to update FIRE goal', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const lifestyleOptions = [
    {
      value: 'lean' as const,
      label: 'Lean FIRE',
      description: 'Minimal expenses, frugal lifestyle',
    },
    {
      value: 'standard' as const,
      label: 'Standard FIRE',
      description: 'Current lifestyle maintained',
    },
    {
      value: 'fat' as const,
      label: 'Fat FIRE',
      description: 'Upgraded lifestyle with luxuries',
    },
  ];

  // Check if user has made any changes
  const anyFieldChanged =
    fireTargetAge !== currentData.fireTargetAge || lifestyleType !== currentData.fireLifestyleType;

  // Smart hasChanges: Only show preview if calculations meaningfully change
  const hasChanges = (() => {
    if (!anyFieldChanged) return false;
    if (!previewMetrics) return false;

    // Check if calculations meaningfully changed
    const corpusChangeMeaningful = Math.abs(previewMetrics.requiredCorpus - currentData.currentRequiredCorpus) > 50000; // >₹50K
    const swrChangeMeaningful = Math.abs(previewMetrics.safeWithdrawalRate - currentData.currentSWR) > 0.1; // >0.1%
    const yearsChangeMeaningful = Math.abs(previewMetrics.yearsToFire - currentData.currentYearsToFire) > 0; // Any year change

    return corpusChangeMeaningful || swrChangeMeaningful || yearsChangeMeaningful;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Edit FIRE Goal</DialogTitle>
          <DialogDescription>
            Adjust your target FIRE age and lifestyle. Preview shows how changes affect your plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* FIRE Age */}
          <div className="space-y-3">
            <Label htmlFor="fire_target_age">Target FIRE Age</Label>
            <div className="flex items-center gap-4">
              <Input
                id="fire_target_age"
                type="number"
                value={fireTargetAge}
                onChange={(e) => setFireTargetAge(Number(e.target.value))}
                className={cn(
                  'w-24 text-center text-2xl font-bold',
                  errors.fire_target_age && 'border-red-500'
                )}
              />
              <div className="flex-1">
                <Slider
                  value={[fireTargetAge]}
                  onValueChange={([value]) => setFireTargetAge(value)}
                  min={currentData.age + 1}
                  max={80}
                  step={1}
                  className="w-full"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>{currentData.age + 1}</span>
                  <span>80</span>
                </div>
              </div>
            </div>
            {errors.fire_target_age && <p className="text-sm text-red-500">{errors.fire_target_age}</p>}
            {previewMetrics && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {previewMetrics.yearsToFire} years from now (
                {new Date().getFullYear() + previewMetrics.yearsToFire})
              </p>
            )}
          </div>

          {/* Lifestyle Type */}
          <div className="space-y-3">
            <Label>FIRE Lifestyle Type</Label>
            <div className="grid gap-3">
              {lifestyleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLifestyleType(option.value)}
                  className={cn(
                    'rounded-lg border-2 p-4 text-left transition-all',
                    lifestyleType === option.value
                      ? 'border-orange-500 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {option.label}
                      </p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </p>
                    </div>
                    {lifestyleType === option.value && (
                      <div className="ml-3 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
                        ✓
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Impact Preview - Only show when changes are made */}
          <AnimatePresence mode="wait">
            {hasChanges && previewMetrics ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <ImpactPreview
                  before={{
                    fireAge: currentData.fireTargetAge,
                    yearsToFire: currentData.currentYearsToFire,
                    safeWithdrawalRate: currentData.currentSWR,
                    requiredCorpus: currentData.currentRequiredCorpus,
                  }}
                  after={{
                    fireAge: fireTargetAge,
                    yearsToFire: previewMetrics.yearsToFire,
                    safeWithdrawalRate: previewMetrics.safeWithdrawalRate,
                    requiredCorpus: previewMetrics.requiredCorpus,
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  💡 Adjust FIRE age or lifestyle type above to see how changes will impact your
                  plan
                </p>
              </motion.div>
            )}
          </AnimatePresence>
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
