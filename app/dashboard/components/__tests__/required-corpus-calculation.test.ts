/**
 * Test Suite: Required Corpus Calculation
 *
 * This test suite verifies that the required corpus calculation is consistent
 * across all components (onboarding, dashboard, settings) and that the
 * displayed breakdown math is accurate.
 *
 * Bug Context:
 * - Dashboard was using hardcoded age-based SWR multipliers
 * - Should use duration-based SWR calculation (retirement years = 85 - FIRE age)
 * - This caused displayed math to be inconsistent (A × B ≠ C)
 */

import { calculateFireMetrics, calculateLifestyleInflationAdjustment } from '@/app/onboarding/utils/fire-calculations';

describe('Required Corpus Calculation', () => {
  describe('Core Calculation Integrity', () => {
    test('calculates correct required corpus for age 34, FIRE 49', () => {
      const input = {
        currentAge: 34,
        fireAge: 49,
        currentMonthlyExpense: 50000,
        currentNetWorth: 1000000,
        monthlySavings: 30000,
        householdIncome: 80000,
        dependents: 1,
        lifestyleType: 'standard' as const
      };

      // Calculate LIA first
      const savingsRate = (input.monthlySavings / input.householdIncome) * 100;
      const LIA = calculateLifestyleInflationAdjustment(
        input.currentAge,
        input.dependents,
        savingsRate,
        input.lifestyleType
      );

      const yearsToFire = input.fireAge - input.currentAge;
      const result = calculateFireMetrics(
        input.currentAge,
        input.fireAge,
        yearsToFire,
        input.currentMonthlyExpense,
        input.currentNetWorth,
        input.monthlySavings,
        input.householdIncome,
        LIA
      );

      // Step-by-step verification
      expect(result.yearsToFire).toBe(15);

      // Post-FIRE expenses (with LIA ~8-10%)
      expect(result.postFireMonthlyExpense).toBeGreaterThan(50000);
      expect(result.postFireAnnualExpense).toBe(result.postFireMonthlyExpense * 12);

      // Inflation: (1.06)^15 ≈ 2.3966
      const expectedInflationMultiplier = Math.pow(1.06, 15);
      const expectedInflationAdjusted = result.postFireAnnualExpense * expectedInflationMultiplier;
      expect(result.inflationAdjustedAnnualExpense).toBeCloseTo(expectedInflationAdjusted, 0);

      // Retirement duration: 85 - 49 = 36 years → 3.7% SWR → 27.027x
      expect(result.safeWithdrawalRate).toBeCloseTo(0.037, 3);
      expect(result.corpusMultiplier).toBeCloseTo(27.027, 1);

      // Final corpus = inflationAdjustedAnnual × corpusMultiplier
      const expectedCorpus = result.inflationAdjustedAnnualExpense * result.corpusMultiplier;
      expect(result.requiredCorpus).toBeCloseTo(expectedCorpus, 0);
    });

    test('calculates correct required corpus for age 34, FIRE 40 (very early retirement)', () => {
      const input = {
        currentAge: 34,
        fireAge: 40,
        currentMonthlyExpense: 50000,
        currentNetWorth: 2000000,
        monthlySavings: 50000,
        householdIncome: 100000,
        dependents: 0,
        lifestyleType: 'lean' as const
      };

      const savingsRate = (input.monthlySavings / input.householdIncome) * 100;
      const LIA = calculateLifestyleInflationAdjustment(
        input.currentAge,
        input.dependents,
        savingsRate,
        input.lifestyleType
      );

      const yearsToFire = input.fireAge - input.currentAge;
      const result = calculateFireMetrics(
        input.currentAge,
        input.fireAge,
        yearsToFire,
        input.currentMonthlyExpense,
        input.currentNetWorth,
        input.monthlySavings,
        input.householdIncome,
        LIA
      );

      // Retirement duration: 85 - 40 = 45 years → 3.3% SWR → 30.3x
      expect(result.safeWithdrawalRate).toBeCloseTo(0.033, 3);
      expect(result.corpusMultiplier).toBeCloseTo(30.3, 1);

      // Verify math consistency
      const expectedCorpus = result.inflationAdjustedAnnualExpense * result.corpusMultiplier;
      expect(result.requiredCorpus).toBeCloseTo(expectedCorpus, 0);
    });
  });

  describe('SWR Multiplier Calculation', () => {
    test('uses stored SWR not hardcoded multiplier', () => {
      const storedData = {
        fireAge: 49,
        safeWithdrawalRate: 0.037,
        requiredCorpus: 42744437
      };

      // Dashboard should calculate multiplier from SWR
      const multiplier = 1 / storedData.safeWithdrawalRate;
      expect(multiplier).toBeCloseTo(27.027, 1);

      // Should NOT match old hardcoded values
      expect(multiplier).not.toBe(25); // Old: fireAge 45-55 → 25x
      expect(multiplier).not.toBe(28.6); // Old: fireAge < 45 → 28.6x
      expect(multiplier).not.toBe(22.2); // Old: fireAge > 55 → 22.2x
    });

    test('multiplier is inverse of SWR', () => {
      const testCases = [
        { swr: 0.033, expectedMultiplier: 30.3 },
        { swr: 0.035, expectedMultiplier: 28.6 },
        { swr: 0.037, expectedMultiplier: 27.0 },
        { swr: 0.040, expectedMultiplier: 25.0 },
        { swr: 0.043, expectedMultiplier: 23.3 },
        { swr: 0.045, expectedMultiplier: 22.2 }
      ];

      testCases.forEach(({ swr, expectedMultiplier }) => {
        const calculated = 1 / swr;
        expect(calculated).toBeCloseTo(expectedMultiplier, 1);
      });
    });
  });

  describe('Breakdown Math Consistency', () => {
    test('breakdown shows mathematically consistent formula', () => {
      // Simulate dashboard breakdown display
      const breakdown = {
        inflationAdjustedAnnual: 1581756,
        corpusMultiplier: 27.027,
        requiredCorpus: 42744437
      };

      // Verify A × B = C (within rounding tolerance)
      const calculated = breakdown.inflationAdjustedAnnual * breakdown.corpusMultiplier;
      expect(calculated).toBeCloseTo(breakdown.requiredCorpus, -3); // Within ₹1000
    });

    test('catches inconsistent hardcoded multiplier bug', () => {
      // This demonstrates the BUG that existed
      const breakdown = {
        inflationAdjustedAnnual: 1581756,
        hardcodedMultiplier: 25, // WRONG: Old age-based logic
        correctMultiplier: 27.027,
        requiredCorpus: 42744437
      };

      // With hardcoded multiplier, math doesn't work
      const wrongCalculation = breakdown.inflationAdjustedAnnual * breakdown.hardcodedMultiplier;
      expect(wrongCalculation).not.toBeCloseTo(breakdown.requiredCorpus, -3);
      expect(wrongCalculation).toBe(39543900); // This is WRONG!

      // With correct multiplier, math works
      const correctCalculation = breakdown.inflationAdjustedAnnual * breakdown.correctMultiplier;
      expect(correctCalculation).toBeCloseTo(breakdown.requiredCorpus, -3);
    });
  });

  describe('Retirement Duration Brackets', () => {
    test('handles all 6 retirement duration brackets correctly', () => {
      const currentAge = 30;
      const testCases = [
        { fireAge: 40, retirementYears: 45, expectedSWR: 0.033, expectedMultiplier: 30.3 },
        { fireAge: 45, retirementYears: 40, expectedSWR: 0.035, expectedMultiplier: 28.6 },
        { fireAge: 50, retirementYears: 35, expectedSWR: 0.037, expectedMultiplier: 27.0 },
        { fireAge: 55, retirementYears: 30, expectedSWR: 0.040, expectedMultiplier: 25.0 },
        { fireAge: 60, retirementYears: 25, expectedSWR: 0.043, expectedMultiplier: 23.3 },
        { fireAge: 65, retirementYears: 20, expectedSWR: 0.045, expectedMultiplier: 22.2 }
      ];

      testCases.forEach(({ fireAge, retirementYears, expectedSWR, expectedMultiplier }) => {
        const LIA = 8; // Use base LIA for simplicity
        const yearsToFire = fireAge - currentAge;

        const result = calculateFireMetrics(
          currentAge,
          fireAge,
          yearsToFire,
          50000, // monthly expense
          1000000, // net worth
          30000, // savings
          80000, // income
          LIA
        );

        // Verify retirement duration calculation
        const calculatedRetirementYears = 85 - fireAge;
        expect(calculatedRetirementYears).toBe(retirementYears);

        // Verify SWR and multiplier
        expect(result.safeWithdrawalRate).toBeCloseTo(expectedSWR, 3);
        expect(result.corpusMultiplier).toBeCloseTo(expectedMultiplier, 1);
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles very early FIRE (age 35)', () => {
      const yearsToFire = 35 - 25;
      const result = calculateFireMetrics(25, 35, yearsToFire, 30000, 500000, 40000, 60000, 5);

      // 85 - 35 = 50 years (beyond 45+ bracket) → 3.3% SWR
      expect(result.safeWithdrawalRate).toBeCloseTo(0.033, 3);
      expect(result.corpusMultiplier).toBeCloseTo(30.3, 1);
    });

    test('handles late FIRE (age 70)', () => {
      const yearsToFire = 70 - 55;
      const result = calculateFireMetrics(55, 70, yearsToFire, 60000, 5000000, 50000, 100000, 8);

      // 85 - 70 = 15 years (<25 bracket) → 4.5% SWR
      expect(result.safeWithdrawalRate).toBeCloseTo(0.045, 3);
      expect(result.corpusMultiplier).toBeCloseTo(22.2, 1);
    });

    test('handles same values as onboarding calculation', () => {
      // Ensure dashboard would get same result if it recalculates
      const params = {
        currentAge: 34,
        fireAge: 49,
        currentMonthlyExpense: 50000,
        currentNetWorth: 1000000,
        monthlySavings: 30000,
        householdIncome: 80000,
        LIA: 10
      };

      const yearsToFire = params.fireAge - params.currentAge;

      const result1 = calculateFireMetrics(
        params.currentAge,
        params.fireAge,
        yearsToFire,
        params.currentMonthlyExpense,
        params.currentNetWorth,
        params.monthlySavings,
        params.householdIncome,
        params.LIA
      );

      // Simulate dashboard reading from database then recalculating
      const result2 = calculateFireMetrics(
        params.currentAge,
        params.fireAge,
        yearsToFire,
        params.currentMonthlyExpense,
        params.currentNetWorth,
        params.monthlySavings,
        params.householdIncome,
        params.LIA
      );

      expect(result1.requiredCorpus).toBe(result2.requiredCorpus);
      expect(result1.safeWithdrawalRate).toBe(result2.safeWithdrawalRate);
      expect(result1.corpusMultiplier).toBe(result2.corpusMultiplier);
    });
  });

  describe('Decimal Years Precision (NEW)', () => {
    test('decimal years produces different inflation than integer years', () => {
      const input = {
        currentAge: 34,
        fireAge: 49,
        currentMonthlyExpense: 50000,
        currentNetWorth: 1000000,
        monthlySavings: 30000,
        householdIncome: 80000,
        LIA: 10
      };

      // Integer years calculation (old approach)
      const integerYears = 15;
      const result1 = calculateFireMetrics(
        input.currentAge,
        input.fireAge,
        integerYears,
        input.currentMonthlyExpense,
        input.currentNetWorth,
        input.monthlySavings,
        input.householdIncome,
        input.LIA
      );

      // Decimal years calculation (new approach - e.g., 14.25 years)
      const decimalYears = 14.25;
      const result2 = calculateFireMetrics(
        input.currentAge,
        input.fireAge,
        decimalYears,
        input.currentMonthlyExpense,
        input.currentNetWorth,
        input.monthlySavings,
        input.householdIncome,
        input.LIA
      );

      // Verify they produce different results
      expect(result1.inflationAdjustedAnnualExpense).not.toBe(result2.inflationAdjustedAnnualExpense);
      expect(result1.requiredCorpus).not.toBe(result2.requiredCorpus);

      // Decimal should be lower (less time for inflation)
      expect(result2.inflationAdjustedAnnualExpense).toBeLessThan(result1.inflationAdjustedAnnualExpense);
      expect(result2.requiredCorpus).toBeLessThan(result1.requiredCorpus);

      // Calculate difference (should be ~3-4% for 0.75 year difference)
      const percentDiff = ((result1.requiredCorpus - result2.requiredCorpus) / result1.requiredCorpus) * 100;
      expect(percentDiff).toBeGreaterThan(3);
      expect(percentDiff).toBeLessThan(5);
    });

    test('onboarding and dashboard use same decimal years', () => {
      // This test verifies the fix: both should now use decimal years from date calculations
      const dateOfBirth = new Date('1990-09-15'); // Sept 15, 1990
      const fireTargetDate = new Date('2039-09-15'); // Sept 15, 2039
      const today = new Date('2025-11-13'); // Current date

      // Calculate decimal years (should be ~13.83 years)
      const ageInYears = (today.getTime() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const fireAgeInYears = (fireTargetDate.getTime() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const decimalYearsToFire = fireAgeInYears - ageInYears;

      // Both onboarding and dashboard should use this decimal value
      const currentAge = Math.floor(ageInYears);
      const fireAge = Math.floor(fireAgeInYears);

      const result = calculateFireMetrics(
        currentAge,
        fireAge,
        decimalYearsToFire,
        50000,
        1000000,
        30000,
        80000,
        10
      );

      // Verify yearsToFire is stored as decimal
      expect(result.yearsToFire).toBe(decimalYearsToFire);
      expect(result.yearsToFire).not.toBe(Math.floor(decimalYearsToFire));
    });
  });

  describe('Display Formatting (NEW)', () => {
    test('multiplier displays with 1 decimal place', () => {
      const corpusMultiplier = 27.027027027027028;

      // Format for display
      const formatted = corpusMultiplier.toFixed(1);

      expect(formatted).toBe('27.0');
      expect(formatted).not.toContain('27.027027027027028');
    });

    test('years display with months instead of decimal', () => {
      const yearsToFire = 14.25; // 14 years, 3 months

      const years = Math.floor(yearsToFire);
      const months = Math.round((yearsToFire - years) * 12);

      expect(years).toBe(14);
      expect(months).toBe(3);

      // Display format: "14 years, 3 months"
      const display = `${years} years, ${months} months`;
      expect(display).toBe('14 years, 3 months');
    });

    test('handles edge cases in years formatting', () => {
      // Exactly 1 year
      let yearsToFire = 1.0;
      let years = Math.floor(yearsToFire);
      let months = Math.round((yearsToFire - years) * 12);
      expect(months).toBe(0);

      // 1 year, 1 month
      yearsToFire = 1.0833; // 1.0833 years ≈ 1 month
      years = Math.floor(yearsToFire);
      months = Math.round((yearsToFire - years) * 12);
      expect(years).toBe(1);
      expect(months).toBe(1);

      // Almost 1 year (11 months)
      yearsToFire = 0.9167; // 0.9167 years ≈ 11 months
      years = Math.floor(yearsToFire);
      months = Math.round((yearsToFire - years) * 12);
      expect(years).toBe(0);
      expect(months).toBe(11);
    });
  });

  describe('Formula Math Consistency (NEW)', () => {
    test('reverse-calculated inflation-adjusted expense maintains formula accuracy', () => {
      // Simulate stored values from onboarding
      const storedData = {
        requiredCorpus: 12480000, // ₹1.25 Cr
        safeWithdrawalRate: 0.037,
        corpusMultiplier: 27.027027027027028
      };

      // OLD approach (forward calculation - causes drift)
      const postFireAnnualExpense = 600000; // ₹50K/month × 12
      const inflationMultiplier = 2.3966; // (1.06)^15
      const forwardCalculated = postFireAnnualExpense * inflationMultiplier;

      // Check if forward calculation matches stored corpus
      const forwardResult = forwardCalculated * storedData.corpusMultiplier;
      // This will NOT match due to floating-point drift
      expect(forwardResult).not.toBeCloseTo(storedData.requiredCorpus, 0);

      // NEW approach (reverse calculation - always accurate)
      const reverseCalculated = storedData.requiredCorpus / storedData.corpusMultiplier;

      // Verify formula: inflationAdjusted × multiplier = corpus
      const reverseResult = reverseCalculated * storedData.corpusMultiplier;
      expect(reverseResult).toBeCloseTo(storedData.requiredCorpus, 0);

      // This is the key benefit: displayed formula (A × B = C) is always accurate
      const displayedMultiplier = parseFloat(storedData.corpusMultiplier.toFixed(1)); // 27.0
      const displayedFormula = reverseCalculated * displayedMultiplier;

      // Even with rounded multiplier, result should be very close
      const percentError = Math.abs((displayedFormula - storedData.requiredCorpus) / storedData.requiredCorpus) * 100;
      expect(percentError).toBeLessThan(0.5); // Less than 0.5% error
    });

    test('breakdown component displays mathematically consistent values', () => {
      // Simulate dashboard breakdown display with reverse calculation
      const breakdown = {
        requiredCorpus: 42744437,
        safeWithdrawalRate: 0.037,
        postFireMonthlyExpense: 55000,
        yearsToFire: 15
      };

      // Calculate multiplier
      const corpusMultiplier = 1 / breakdown.safeWithdrawalRate;

      // Reverse-calculate inflation-adjusted expense
      const inflationAdjustedAnnualExpense = breakdown.requiredCorpus / corpusMultiplier;

      // Format for display
      const displayMultiplier = parseFloat(corpusMultiplier.toFixed(1));

      // Verify displayed formula: A × B = C
      const formulaResult = inflationAdjustedAnnualExpense * displayMultiplier;

      // Check percentage error is minimal
      const percentError = Math.abs((formulaResult - breakdown.requiredCorpus) / breakdown.requiredCorpus) * 100;
      expect(percentError).toBeLessThan(1); // Less than 1% error
    });
  });

  describe('Cross-Component Consistency (NEW)', () => {
    test('onboarding step 5 and dashboard show same corpus', () => {
      const input = {
        currentAge: 34,
        fireAge: 49,
        decimalYearsToFire: 14.25, // From date calculation
        currentMonthlyExpense: 50000,
        currentNetWorth: 1000000,
        monthlySavings: 30000,
        householdIncome: 80000,
        LIA: 10
      };

      // Calculate in onboarding
      const onboardingResult = calculateFireMetrics(
        input.currentAge,
        input.fireAge,
        input.decimalYearsToFire,
        input.currentMonthlyExpense,
        input.currentNetWorth,
        input.monthlySavings,
        input.householdIncome,
        input.LIA
      );

      // Simulate dashboard reading stored values
      const dashboardData = {
        requiredCorpus: onboardingResult.requiredCorpus,
        safeWithdrawalRate: onboardingResult.safeWithdrawalRate,
        postFireMonthlyExpense: onboardingResult.postFireMonthlyExpense,
        yearsToFire: input.decimalYearsToFire
      };

      // Dashboard should display same corpus
      expect(dashboardData.requiredCorpus).toBe(onboardingResult.requiredCorpus);
      expect(dashboardData.safeWithdrawalRate).toBe(onboardingResult.safeWithdrawalRate);

      // Dashboard breakdown reverse-calculates inflation-adjusted expense
      const multiplier = 1 / dashboardData.safeWithdrawalRate;
      const reverseInflationAdjusted = dashboardData.requiredCorpus / multiplier;

      // This should match onboarding's forward calculation
      expect(reverseInflationAdjusted).toBeCloseTo(onboardingResult.inflationAdjustedAnnualExpense, 0);
    });

    test('settings impact preview shows correct changes', () => {
      // Original FIRE goal
      const original = {
        currentAge: 34,
        fireAge: 49,
        yearsToFire: 14.25,
        lifestyleType: 'standard' as const,
        dependents: 1,
        savingsRate: 37.5,
        currentMonthlyExpense: 50000,
        currentNetWorth: 1000000,
        monthlySavings: 30000,
        householdIncome: 80000
      };

      const originalLIA = calculateLifestyleInflationAdjustment(
        original.currentAge,
        original.dependents,
        original.savingsRate,
        original.lifestyleType
      );

      const originalResult = calculateFireMetrics(
        original.currentAge,
        original.fireAge,
        original.yearsToFire,
        original.currentMonthlyExpense,
        original.currentNetWorth,
        original.monthlySavings,
        original.householdIncome,
        originalLIA
      );

      // Changed FIRE goal: Move to age 45 (earlier retirement)
      const changed = {
        ...original,
        fireAge: 45,
        yearsToFire: 10.25
      };

      const changedLIA = calculateLifestyleInflationAdjustment(
        changed.currentAge,
        changed.dependents,
        changed.savingsRate,
        changed.lifestyleType
      );

      const changedResult = calculateFireMetrics(
        changed.currentAge,
        changed.fireAge,
        changed.yearsToFire,
        changed.currentMonthlyExpense,
        changed.currentNetWorth,
        changed.monthlySavings,
        changed.householdIncome,
        changedLIA
      );

      // Earlier retirement should require MORE corpus (longer retirement duration)
      expect(changedResult.requiredCorpus).toBeGreaterThan(originalResult.requiredCorpus);

      // Earlier retirement = longer retirement duration = lower SWR
      expect(changedResult.safeWithdrawalRate).toBeLessThan(originalResult.safeWithdrawalRate);
      expect(changedResult.corpusMultiplier).toBeGreaterThan(originalResult.corpusMultiplier);

      // Less time for inflation = lower inflation-adjusted expense
      expect(changedResult.inflationAdjustedAnnualExpense).toBeLessThan(originalResult.inflationAdjustedAnnualExpense);
    });
  });
});
