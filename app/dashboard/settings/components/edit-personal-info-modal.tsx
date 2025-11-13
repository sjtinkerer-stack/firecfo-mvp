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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateLifestyleInflationAdjustment,
  calculateFireMetrics,
} from '@/app/onboarding/utils/fire-calculations';
import { INDIAN_CITIES, MONTHS } from '@/app/onboarding/types';
import { ImpactPreview } from './impact-preview';
import { cn } from '@/lib/utils';
import {
  calculateAge,
  createDateFromYearMonth,
  calculateFireTargetDate,
  getBirthYear,
  getBirthMonth,
} from '@/app/utils/date-helpers';
import { parseISO } from 'date-fns';

// Validation schema
const currentYear = new Date().getFullYear();
const personalInfoSchema = z.object({
  birth_year: z.number().min(currentYear - 65).max(currentYear - 18),
  birth_month: z.number().min(1).max(12),
  city: z.string().min(1, 'Please select a city'),
  marital_status: z.enum(['Single', 'Married']),
  dependents: z.number().min(0).max(10),
});

interface EditPersonalInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentData: {
    dateOfBirth: string;
    age: number;
    city: string;
    maritalStatus: 'Single' | 'Married';
    dependents: number;
    fireTargetAge: number;
    fireAge: number; // backwards compat
    spouseIncome: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    fireLifestyleType: 'lean' | 'standard' | 'fat';
    currentNetWorth: number;
    currentSWR: number;
    currentRequiredCorpus: number;
  };
  onSave: () => void;
}

export function EditPersonalInfoModal({
  open,
  onOpenChange,
  currentData,
  onSave,
}: EditPersonalInfoModalProps) {
  // Initialize birth year and month from dateOfBirth
  const initialBirthYear = currentData.dateOfBirth && currentData.dateOfBirth.trim()
    ? getBirthYear(currentData.dateOfBirth)
    : new Date().getFullYear() - 30;
  const initialBirthMonth = currentData.dateOfBirth && currentData.dateOfBirth.trim()
    ? getBirthMonth(currentData.dateOfBirth)
    : 1;

  const [birthYear, setBirthYear] = useState(initialBirthYear);
  const [birthMonth, setBirthMonth] = useState(initialBirthMonth);
  const [city, setCity] = useState(currentData.city);
  const [maritalStatus, setMaritalStatus] = useState<'Single' | 'Married'>(
    currentData.maritalStatus
  );
  const [dependents, setDependents] = useState(currentData.dependents);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMaritalWarning, setShowMaritalWarning] = useState(false);

  // Calculate age from birth year/month
  const age = calculateAge(createDateFromYearMonth(birthYear, birthMonth));

  // Calculate preview metrics whenever inputs change
  const [previewMetrics, setPreviewMetrics] = useState<{
    safeWithdrawalRate: number;
    requiredCorpus: number;
    yearsToFire: number;
  } | null>(null);

  // Reset form state when modal opens
  useEffect(() => {
    if (open) {
      const newBirthYear = currentData.dateOfBirth && currentData.dateOfBirth.trim()
        ? getBirthYear(currentData.dateOfBirth)
        : new Date().getFullYear() - 30;
      const newBirthMonth = currentData.dateOfBirth && currentData.dateOfBirth.trim()
        ? getBirthMonth(currentData.dateOfBirth)
        : 1;
      setBirthYear(newBirthYear);
      setBirthMonth(newBirthMonth);
      setCity(currentData.city);
      setMaritalStatus(currentData.maritalStatus);
      setDependents(currentData.dependents);
      setErrors({});
      setShowMaritalWarning(false);
    }
  }, [open, currentData]);

  // Check if marital status is changing from Married to Single
  const isChangingToSingle =
    currentData.maritalStatus === 'Married' && maritalStatus === 'Single';

  // Calculate preview metrics whenever inputs change
  useEffect(() => {
    // Account for spouse income changes based on marital status
    const effectiveSpouseIncome = maritalStatus === 'Single' ? 0 : currentData.spouseIncome;
    const householdIncome = currentData.monthlyIncome + effectiveSpouseIncome;
    const monthlySavings = householdIncome - currentData.monthlyExpenses;
    const savingsRate = householdIncome > 0 ? (monthlySavings / householdIncome) * 100 : 0;

    const newLIA = calculateLifestyleInflationAdjustment(
      age,
      dependents,
      savingsRate,
      currentData.fireLifestyleType
    );

    const yearsToFire = currentData.fireTargetAge - age;

    const metrics = calculateFireMetrics(
      age,
      currentData.fireTargetAge,
      yearsToFire,
      currentData.monthlyExpenses,
      currentData.currentNetWorth,
      monthlySavings,
      householdIncome,
      newLIA
    );

    setPreviewMetrics({
      safeWithdrawalRate: metrics.safeWithdrawalRate, // Use duration-based SWR from metrics
      requiredCorpus: metrics.requiredCorpus,
      yearsToFire,
    });
  }, [birthYear, birthMonth, age, dependents, maritalStatus, currentData]);

  // Update warning visibility when marital status changes
  const handleMaritalStatusChange = (value: 'Single' | 'Married') => {
    setMaritalStatus(value);
    if (currentData.maritalStatus === 'Married' && value === 'Single' && currentData.spouseIncome > 0) {
      setShowMaritalWarning(true);
    } else {
      setShowMaritalWarning(false);
    }
  };

  const handleSave = async () => {
    // Reset errors
    setErrors({});

    // Validate
    const result = personalInfoSchema.safeParse({
      birth_year: birthYear,
      birth_month: birthMonth,
      city,
      marital_status: maritalStatus,
      dependents,
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

    // Validate age is less than FIRE target age
    if (age >= currentData.fireTargetAge) {
      setErrors({ birth_year: `Age must be less than your FIRE age (${currentData.fireTargetAge})` });
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

      // Transform birth year/month to date_of_birth
      const dateOfBirth = createDateFromYearMonth(birthYear, birthMonth);
      const date_of_birth = dateOfBirth.toISOString().split('T')[0];

      // Recalculate fire_target_date from new DOB + existing fire_target_age
      const fireTargetDate = calculateFireTargetDate(dateOfBirth, currentData.fireTargetAge);
      const fire_target_date = fireTargetDate.toISOString().split('T')[0];

      // Prepare data to update
      const updateData: any = {
        date_of_birth,
        fire_target_date,
        city,
        marital_status: maritalStatus,
        dependents,
        updated_at: new Date().toISOString(),
      };

      // If changing to Single, reset spouse income
      if (isChangingToSingle) {
        updateData.spouse_income = 0;
      }

      // Recalculate FIRE metrics
      const householdIncome =
        currentData.monthlyIncome + (isChangingToSingle ? 0 : currentData.spouseIncome);
      const monthlySavings = householdIncome - currentData.monthlyExpenses;
      const savingsRate = householdIncome > 0 ? (monthlySavings / householdIncome) * 100 : 0;

      const LIA = calculateLifestyleInflationAdjustment(
        age,
        dependents,
        savingsRate,
        currentData.fireLifestyleType
      );

      const yearsToFire = currentData.fireTargetAge - age;

      const fireMetrics = calculateFireMetrics(
        age,
        currentData.fireTargetAge,
        yearsToFire,
        currentData.monthlyExpenses,
        currentData.currentNetWorth,
        monthlySavings,
        householdIncome,
        LIA
      );

      // Update calculated metrics
      updateData.lifestyle_inflation_adjustment = fireMetrics.lifestyleInflationAdjustment;
      updateData.post_fire_monthly_expense = fireMetrics.postFireMonthlyExpense;
      updateData.required_corpus = fireMetrics.requiredCorpus;
      updateData.projected_corpus_at_fire = fireMetrics.projectedCorpusAtFire;
      updateData.monthly_savings_needed = fireMetrics.monthlySavingsNeeded;
      updateData.is_on_track = fireMetrics.isOnTrack;

      // Update database
      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Personal information updated!', {
        description: isChangingToSingle
          ? 'Spouse income has been reset to ₹0. FIRE plan recalculated.'
          : 'Your FIRE plan has been recalculated with updated information.',
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating personal info:', error);
      toast.error('Failed to update personal information', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has made any changes
  const initialYear = currentData.dateOfBirth && currentData.dateOfBirth.trim()
    ? getBirthYear(currentData.dateOfBirth)
    : new Date().getFullYear() - 30;
  const initialMonth = currentData.dateOfBirth && currentData.dateOfBirth.trim()
    ? getBirthMonth(currentData.dateOfBirth)
    : 1;

  // Calculate if changes actually affect calculations
  const anyFieldChanged =
    birthYear !== initialYear ||
    birthMonth !== initialMonth ||
    dependents !== currentData.dependents ||
    maritalStatus !== currentData.maritalStatus;

  // Smart hasChanges: Only show preview if calculations actually change
  const hasChanges = (() => {
    if (!anyFieldChanged) return false;
    if (!previewMetrics) return false;

    // Calculate effective spouse income for both states
    const oldEffectiveSpouseIncome = currentData.maritalStatus === 'Single' ? 0 : currentData.spouseIncome;
    const newEffectiveSpouseIncome = maritalStatus === 'Single' ? 0 : currentData.spouseIncome;

    // If spouse income actually changes, show preview
    if (oldEffectiveSpouseIncome !== newEffectiveSpouseIncome) return true;

    // Check if calculations meaningfully changed
    const corpusChangeMeaningful = Math.abs(previewMetrics.requiredCorpus - currentData.currentRequiredCorpus) > 50000; // >₹50K
    const swrChangeMeaningful = Math.abs(previewMetrics.safeWithdrawalRate - currentData.currentSWR) > 0.001; // >10 bps in decimal

    return corpusChangeMeaningful || swrChangeMeaningful;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Personal Information</DialogTitle>
          <DialogDescription>
            Update your profile details. Changes will recalculate your FIRE plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Marital Status Warning */}
          {showMaritalWarning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    Important: Spouse Income Will Be Reset
                  </p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                    Changing your marital status to Single will set spouse income to ₹0 and
                    recalculate your household income and FIRE plan accordingly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Date of Birth */}
          <div className="space-y-3">
            <Label>Date of Birth</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="birth-year" className="text-xs text-gray-600 dark:text-gray-400">
                  Birth Year
                </Label>
                <Select
                  value={birthYear.toString()}
                  onValueChange={(value) => setBirthYear(Number(value))}
                >
                  <SelectTrigger
                    id="birth-year"
                    className={errors.birth_year ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 48 }, (_, i) => {
                      const year = currentYear - 65 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth-month" className="text-xs text-gray-600 dark:text-gray-400">
                  Birth Month
                </Label>
                <Select
                  value={birthMonth.toString()}
                  onValueChange={(value) => setBirthMonth(Number(value))}
                >
                  <SelectTrigger
                    id="birth-month"
                    className={errors.birth_month ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(errors.birth_year || errors.birth_month) && (
              <p className="text-sm text-red-500">
                {errors.birth_year || errors.birth_month}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your age: <span className="font-semibold">{age} years</span> (must be less than FIRE age: {currentData.fireTargetAge})
            </p>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className={errors.city ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_CITIES.map((cityName) => (
                  <SelectItem key={cityName} value={cityName}>
                    {cityName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
          </div>

          {/* Marital Status */}
          <div className="space-y-2">
            <Label>Marital Status</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={maritalStatus === 'Single' ? 'default' : 'outline'}
                onClick={() => handleMaritalStatusChange('Single')}
                className="h-12"
              >
                Single
              </Button>
              <Button
                type="button"
                variant={maritalStatus === 'Married' ? 'default' : 'outline'}
                onClick={() => handleMaritalStatusChange('Married')}
                className="h-12"
              >
                Married
              </Button>
            </div>
          </div>

          {/* Dependents */}
          <div className="space-y-2">
            <Label>Dependents</Label>
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant={dependents === num ? 'default' : 'outline'}
                  onClick={() => setDependents(num)}
                  className="h-12"
                >
                  {num === 3 ? '3+' : num}
                </Button>
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
                    fireAge: currentData.fireAge,
                    yearsToFire: currentData.fireAge - currentData.age,
                    safeWithdrawalRate: currentData.currentSWR,
                    requiredCorpus: currentData.currentRequiredCorpus,
                  }}
                  after={{
                    fireAge: currentData.fireAge,
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
                  💡 Adjust age, marital status, or dependents to see how changes will impact your
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
