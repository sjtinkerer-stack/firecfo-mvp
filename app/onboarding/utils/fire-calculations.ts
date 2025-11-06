import { FireLifestyleType } from '../types'

/**
 * Calculate age factor for Lifestyle Inflation Adjustment
 * Younger people expect more lifestyle changes
 * Range: -2% to +3%
 */
function calculateAgeFactor(age: number): number {
  if (age <= 30) return 3
  if (age <= 35) return 2
  if (age <= 40) return 1
  if (age <= 45) return 0
  if (age <= 50) return -1
  return -2
}

/**
 * Calculate dependents factor for Lifestyle Inflation Adjustment
 * More dependents = more unpredictable future expenses
 * Range: 0% to +5%
 */
function calculateDependentsFactor(dependents: number): number {
  if (dependents === 0) return 0
  if (dependents === 1) return 2
  if (dependents === 2) return 3
  return 5 // 3 or more
}

/**
 * Calculate savings rate factor for Lifestyle Inflation Adjustment
 * Higher savings rate = already living frugally = lower adjustment
 * Range: -5% to +5%
 */
function calculateSavingsRateFactor(savingsRate: number): number {
  if (savingsRate >= 50) return -5
  if (savingsRate >= 40) return -3
  if (savingsRate >= 30) return -1
  if (savingsRate >= 20) return 1
  if (savingsRate >= 10) return 3
  return 5 // < 10%
}

/**
 * Get lifestyle multiplier based on FIRE type
 * Lean = frugal, Standard = current lifestyle, Fat = upgraded
 */
function getLifestyleMultiplier(lifestyleType: FireLifestyleType): number {
  const multipliers = {
    lean: -5,
    standard: 0,
    fat: 10,
  }
  return multipliers[lifestyleType]
}

/**
 * Calculate Lifestyle Inflation Adjustment (LIA)
 * Combination of age, dependents, savings rate, and lifestyle type
 * Range: 5% to 20% (clamped)
 */
export function calculateLifestyleInflationAdjustment(
  age: number,
  dependents: number,
  savingsRate: number,
  lifestyleType: FireLifestyleType
): number {
  const baseLIA = 8
  const ageFactor = calculateAgeFactor(age)
  const dependentsFactor = calculateDependentsFactor(dependents)
  const savingsRateFactor = calculateSavingsRateFactor(savingsRate)
  const lifestyleMultiplier = getLifestyleMultiplier(lifestyleType)

  let LIA = baseLIA + ageFactor + dependentsFactor + savingsRateFactor + lifestyleMultiplier

  // Clamp to 5-20% range
  LIA = Math.max(5, Math.min(20, LIA))

  return LIA
}

/**
 * Get breakdown of LIA factors for display
 */
export function getLIABreakdown(
  age: number,
  dependents: number,
  savingsRate: number,
  lifestyleType: FireLifestyleType
) {
  return {
    base: 8,
    ageFactor: calculateAgeFactor(age),
    dependentsFactor: calculateDependentsFactor(dependents),
    savingsRateFactor: calculateSavingsRateFactor(savingsRate),
    lifestyleMultiplier: getLifestyleMultiplier(lifestyleType),
    total: calculateLifestyleInflationAdjustment(age, dependents, savingsRate, lifestyleType),
  }
}

/**
 * Calculate dynamic Safe Withdrawal Rate (SWR) based on FIRE age
 * Earlier retirement = lower SWR (more conservative)
 * Later retirement = higher SWR (shorter withdrawal period)
 */
export function calculateSafeWithdrawalRate(fireAge: number): number {
  if (fireAge < 45) {
    return 3.5 // 3.5% for early retirement (longer withdrawal period)
  } else if (fireAge <= 55) {
    return 4.0 // 4.0% for standard retirement
  } else {
    return 4.5 // 4.5% for later retirement (shorter withdrawal period)
  }
}

/**
 * Get multiplier from SWR (inverse of SWR percentage)
 * e.g., 4% SWR = 25x multiplier
 */
export function getCorpusMultiplier(swr: number): number {
  return 100 / swr
}

/**
 * Calculate all FIRE-related metrics
 */
export interface FireMetrics {
  // Input summary
  currentAge: number
  fireAge: number
  yearsToFire: number
  currentMonthlyExpense: number
  currentNetWorth: number
  monthlySavings: number
  savingsRate: number

  // LIA calculation
  lifestyleInflationAdjustment: number

  // Safe Withdrawal Rate
  safeWithdrawalRate: number
  corpusMultiplier: number

  // Post-FIRE expenses
  postFireMonthlyExpense: number
  postFireAnnualExpense: number

  // Inflation-adjusted expenses
  inflationAdjustedAnnualExpense: number

  // Required corpus
  requiredCorpus: number

  // Current vs required
  corpusGap: number

  // Future projections
  futureValueCurrentAssets: number
  futureValueMonthlySavings: number
  projectedCorpusAtFire: number

  // Goal assessment
  isOnTrack: boolean
  monthlySavingsNeeded: number
  savingsIncrease: number
  surplusDeficit: number
}

export function calculateFireMetrics(
  currentAge: number,
  fireAge: number,
  currentMonthlyExpense: number,
  currentNetWorth: number,
  monthlySavings: number,
  householdIncome: number,
  LIA: number
): FireMetrics {
  // Constants
  const INFLATION_RATE = 0.06 // 6% annual inflation
  const PRE_RETURN_RATE = 0.12 // 12% pre-retirement returns

  // Calculate dynamic Safe Withdrawal Rate based on FIRE age
  const safeWithdrawalRate = calculateSafeWithdrawalRate(fireAge)
  const corpusMultiplier = getCorpusMultiplier(safeWithdrawalRate)

  // 1. Basic calculations
  const yearsToFire = fireAge - currentAge
  const savingsRate = householdIncome > 0 ? (monthlySavings / householdIncome) * 100 : 0

  // 2. Post-FIRE expenses (with LIA)
  const postFireMonthlyExpense = currentMonthlyExpense * (1 + LIA / 100)
  const postFireAnnualExpense = postFireMonthlyExpense * 12

  // 3. Inflation-adjusted expenses
  const inflationMultiplier = Math.pow(1 + INFLATION_RATE, yearsToFire)
  const inflationAdjustedAnnualExpense = postFireAnnualExpense * inflationMultiplier

  // 4. Required corpus (using dynamic SWR multiplier)
  const requiredCorpus = inflationAdjustedAnnualExpense * corpusMultiplier

  // 5. Future value of current assets
  const futureValueCurrentAssets = currentNetWorth * Math.pow(1 + PRE_RETURN_RATE, yearsToFire)

  // 6. Future value of monthly savings (growing annuity)
  const monthsToFire = yearsToFire * 12
  const monthlyReturnRate = Math.pow(1 + PRE_RETURN_RATE, 1 / 12) - 1
  const futureValueMonthlySavings =
    monthsToFire > 0
      ? monthlySavings * ((Math.pow(1 + monthlyReturnRate, monthsToFire) - 1) / monthlyReturnRate)
      : 0

  // 7. Total projected corpus at FIRE age
  const projectedCorpusAtFire = futureValueCurrentAssets + futureValueMonthlySavings

  // 8. Corpus gap
  const corpusGap = requiredCorpus - currentNetWorth

  // 9. Is on track?
  const isOnTrack = projectedCorpusAtFire >= requiredCorpus
  const surplusDeficit = projectedCorpusAtFire - requiredCorpus

  // 10. Monthly savings needed (if not on track)
  let monthlySavingsNeeded = monthlySavings
  let savingsIncrease = 0

  if (!isOnTrack && monthsToFire > 0) {
    // Reverse calculate needed monthly savings
    const remainingCorpusNeeded = requiredCorpus - futureValueCurrentAssets
    monthlySavingsNeeded =
      (remainingCorpusNeeded * monthlyReturnRate) /
      (Math.pow(1 + monthlyReturnRate, monthsToFire) - 1)
    savingsIncrease = Math.max(0, monthlySavingsNeeded - monthlySavings)
  }

  return {
    // Input summary
    currentAge,
    fireAge,
    yearsToFire,
    currentMonthlyExpense,
    currentNetWorth,
    monthlySavings,
    savingsRate,

    // LIA
    lifestyleInflationAdjustment: LIA,

    // Safe Withdrawal Rate
    safeWithdrawalRate,
    corpusMultiplier,

    // Post-FIRE expenses
    postFireMonthlyExpense,
    postFireAnnualExpense,

    // Inflation-adjusted expenses
    inflationAdjustedAnnualExpense,

    // Required corpus
    requiredCorpus,

    // Gap
    corpusGap,

    // Projections
    futureValueCurrentAssets,
    futureValueMonthlySavings,
    projectedCorpusAtFire,

    // Assessment
    isOnTrack,
    monthlySavingsNeeded,
    savingsIncrease,
    surplusDeficit,
  }
}

/**
 * Format number as Indian currency (lakhs, crores)
 */
export function formatFireCurrency(value: number): string {
  const absValue = Math.abs(value)

  if (absValue >= 10000000) {
    // Crores
    return `₹${(value / 10000000).toFixed(2)} Cr`
  } else if (absValue >= 100000) {
    // Lakhs
    return `₹${(value / 100000).toFixed(2)} L`
  } else {
    // Thousands
    return `₹${new Intl.NumberFormat('en-IN').format(Math.round(value))}`
  }
}

/**
 * Get target year from FIRE age and current age
 */
export function getFireTargetYear(currentAge: number, fireAge: number): number {
  const currentYear = new Date().getFullYear()
  const yearsToFire = fireAge - currentAge
  return currentYear + yearsToFire
}
