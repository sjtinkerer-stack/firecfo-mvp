// AI Tools/Functions for OpenAI API

import {
  UserFinancialContext,
  SimulationChanges,
  SimulationResult,
  AssetAllocationRecommendation,
} from './types';
import { calculateFireMetrics, calculateLifestyleInflationAdjustment } from '@/app/onboarding/utils/fire-calculations';
import { formatFireCurrency } from '@/app/onboarding/utils/fire-calculations';

// ============================================================================
// Tool Definitions for OpenAI API (Functions Format)
// ============================================================================

export const OPENAI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'run_simulation',
      description:
        'Run a what-if simulation comparing current FIRE plan to a hypothetical scenario with specified changes. Use this when user asks "what if" questions like "What if I save ₹10K more per month?" or "What if I retire at 50 instead of 45?"',
      parameters: {
        type: 'object',
        properties: {
          changes: {
            type: 'object',
            description: 'The changes to simulate',
            properties: {
              monthly_savings_increase: {
                type: 'number',
                description: 'Additional monthly savings in ₹ (can be negative for decrease)',
              },
              fire_age_adjustment: {
                type: 'number',
                description: 'Years to add/subtract from FIRE age (e.g., +5 to retire 5 years later)',
              },
              expense_reduction_percent: {
                type: 'number',
                description: 'Percentage reduction in monthly expenses (e.g., 10 for 10% reduction)',
              },
              income_increase: {
                type: 'number',
                description: 'Additional monthly income in ₹',
              },
              asset_boost: {
                type: 'number',
                description: 'One-time asset increase in ₹ (e.g., bonus, inheritance)',
              },
              lifestyle_type_change: {
                type: 'string',
                description: 'Change FIRE lifestyle type',
                enum: ['lean', 'standard', 'fat'],
              },
            },
          },
          scenario_name: {
            type: 'string',
            description: 'Optional name for the scenario (e.g., "Aggressive Savings Plan")',
          },
        },
        required: ['changes'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'calculate_fire_metrics',
      description:
        'Calculate FIRE metrics for a given set of inputs. Use when user wants to check specific calculations or understand the math.',
      parameters: {
        type: 'object',
        properties: {
          age: { type: 'number' },
          monthly_expenses: { type: 'number' },
          fire_target_age: { type: 'number' },
          lifestyle_type: {
            type: 'string',
            enum: ['lean', 'standard', 'fat'],
          },
          current_networth: { type: 'number' },
          monthly_savings: { type: 'number' },
          dependents: { type: 'number' },
          marital_status: {
            type: 'string',
            enum: ['Single', 'Married'],
          },
          savings_rate: { type: 'number' },
        },
        required: ['age', 'monthly_expenses', 'fire_target_age', 'current_networth', 'monthly_savings'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_asset_allocation_recommendation',
      description:
        'Get personalized asset allocation recommendation based on age and FIRE timeline. Use when user asks about portfolio rebalancing or asset allocation.',
      parameters: {
        type: 'object',
        properties: {
          age: { type: 'number' },
          years_to_fire: { type: 'number' },
          risk_tolerance: {
            type: 'string',
            enum: ['conservative', 'moderate', 'aggressive'],
            description: "User's risk tolerance (infer from conversation or ask)",
          },
        },
        required: ['age', 'years_to_fire'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_scenario',
      description:
        'Save a simulation as a named scenario for future reference. Use after running a simulation that user wants to save.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name for the scenario' },
          description: { type: 'string', description: 'Optional description' },
          changes: {
            type: 'object',
            description: 'The changes that define this scenario',
          },
          results: {
            type: 'object',
            description: 'Calculated results for this scenario',
          },
        },
        required: ['name', 'changes', 'results'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_suggestion',
      description:
        "Prepare a suggestion to update user's actual FIRE plan. This creates a pending action that user must confirm. Use when user asks to apply changes discussed in conversation.",
      parameters: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            description: 'Field to update (e.g., "monthly_expenses", "fire_target_age")',
          },
          new_value: {
            type: 'number',
            description: 'New value to set',
          },
          reason: {
            type: 'string',
            description: 'Explanation for why this change is recommended',
          },
        },
        required: ['field', 'new_value', 'reason'],
      },
    },
  },
];

// ============================================================================
// Tool Execution Functions (same as before)
// ============================================================================

export async function executeOpenAITool(
  functionName: string,
  functionArgs: any,
  userData: UserFinancialContext
): Promise<any> {
  switch (functionName) {
    case 'run_simulation':
      return runSimulation(functionArgs.changes, userData, functionArgs.scenario_name);

    case 'calculate_fire_metrics':
      return calculateFireMetricsFromInput(functionArgs);

    case 'get_asset_allocation_recommendation':
      return getAssetAllocationRecommendation(
        userData,
        functionArgs.risk_tolerance || 'moderate'
      );

    case 'create_scenario':
      return {
        success: true,
        message: 'Scenario created successfully',
        scenario: functionArgs,
      };

    case 'apply_suggestion':
      return {
        success: true,
        message: 'Suggestion prepared. User confirmation required.',
        action: {
          type: 'apply_suggestion',
          field: functionArgs.field,
          new_value: functionArgs.new_value,
          reason: functionArgs.reason,
        },
      };

    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

// ============================================================================
// Implementation Functions (same as tools.ts)
// ============================================================================

function runSimulation(
  changes: SimulationChanges,
  userData: UserFinancialContext,
  scenarioName?: string
): SimulationResult {
  const baseMonthlyIncome = userData.monthlyIncome + userData.spouseIncome;
  const baseMonthlyExpenses = userData.monthlyExpenses;
  const baseMonthlySavings = userData.monthlySavings;
  const baseNetworth = userData.currentNetworth;
  const baseFireAge = userData.fireTargetAge;
  const baseAge = userData.age;

  const newMonthlyIncome = baseMonthlyIncome + (changes.income_increase || 0);
  const newMonthlyExpenses = changes.expense_reduction_percent
    ? baseMonthlyExpenses * (1 - changes.expense_reduction_percent / 100)
    : baseMonthlyExpenses;
  const newMonthlySavings =
    newMonthlyIncome - newMonthlyExpenses + (changes.monthly_savings_increase || 0);
  const newNetworth = baseNetworth + (changes.asset_boost || 0);
  const newFireAge = baseFireAge + (changes.fire_age_adjustment || 0);
  const newYearsToFire = newFireAge - baseAge;
  const newLifestyleType = changes.lifestyle_type_change || userData.fireLifestyleType;

  // Calculate LIA for the new scenario
  const newSavingsRate = (newMonthlySavings / newMonthlyIncome) * 100;
  const newLIA = calculateLifestyleInflationAdjustment(
    baseAge,
    userData.dependents,
    newSavingsRate,
    newLifestyleType
  );

  const newMetrics = calculateFireMetrics(
    baseAge,
    newFireAge,
    newYearsToFire,
    newMonthlyExpenses,
    newNetworth,
    newMonthlySavings,
    newMonthlyIncome,
    newLIA
  );

  const corpusGapCurrent = userData.requiredCorpus - userData.projectedCorpusAtFire;
  const corpusGapNew = newMetrics.requiredCorpus - newMetrics.projectedCorpusAtFire;
  const corpusGapChange = corpusGapCurrent - corpusGapNew;
  const yearsSaved = userData.yearsToFire - newYearsToFire;
  const monthlySavingsDelta = newMonthlySavings - baseMonthlySavings;

  // Calculate gap metrics for scenario categorization
  const gapDelta = corpusGapChange;
  const gapDeltaPercent = corpusGapCurrent !== 0
    ? (gapDelta / Math.abs(corpusGapCurrent)) * 100
    : 0;
  const trackStatusChanged = userData.isOnTrack !== newMetrics.isOnTrack;

  // Determine scenario type for AI to provide appropriate follow-ups
  let scenarioType = 'minimal_impact';

  // Significant surplus created (projected exceeds required by ₹2Cr+ OR gap closed by 50%+)
  if (corpusGapNew < 0 && Math.abs(corpusGapNew) >= 20000000) {
    scenarioType = 'significant_surplus';
  }
  // Marginal surplus created (projected exceeds required by ₹50L-₹2Cr OR gap closed by 20-50%)
  else if (corpusGapNew < 0 && Math.abs(corpusGapNew) >= 5000000) {
    scenarioType = 'marginal_surplus';
  }
  // Deficit fully closed (was not on track, now is on track)
  else if (!userData.isOnTrack && newMetrics.isOnTrack) {
    scenarioType = 'deficit_closed';
  }
  // Deficit partially closed (gap reduced by 10%+ but still not on track)
  else if (corpusGapCurrent > 0 && gapDeltaPercent >= 10 && corpusGapNew > 0) {
    scenarioType = 'deficit_partially_closed';
  }
  // Deficit created or increased
  else if (gapDelta < 0 || (corpusGapCurrent < 0 && corpusGapNew > 0)) {
    scenarioType = 'deficit_increased';
  }
  // Timeline accelerated significantly
  else if (yearsSaved > 0.5) {
    scenarioType = 'timeline_accelerated';
  }
  // Timeline extended
  else if (yearsSaved < -0.5) {
    scenarioType = 'timeline_extended';
  }
  // Minimal impact (gap changes < 10%, no status change)
  else if (Math.abs(gapDeltaPercent) < 10 && !trackStatusChanged) {
    scenarioType = 'minimal_impact';
  }

  return {
    scenario_name: scenarioName,
    current_plan: {
      required_corpus: userData.requiredCorpus,
      projected_corpus: userData.projectedCorpusAtFire,
      monthly_savings: baseMonthlySavings,
      years_to_fire: userData.yearsToFire,
      is_on_track: userData.isOnTrack,
    },
    new_scenario: {
      required_corpus: newMetrics.requiredCorpus,
      projected_corpus: newMetrics.projectedCorpusAtFire,
      monthly_savings: newMonthlySavings,
      years_to_fire: newYearsToFire,
      is_on_track: newMetrics.isOnTrack,
      fire_age: newFireAge,
    },
    comparison: {
      corpus_gap_change: corpusGapChange,
      years_saved: yearsSaved,
      monthly_savings_delta: monthlySavingsDelta,
      success_probability_change: newMetrics.isOnTrack && !userData.isOnTrack ? 100 : 0,
    },
    analysis: {
      scenario_type: scenarioType,
      current_gap: corpusGapCurrent,
      new_gap: corpusGapNew,
      gap_delta: gapDelta,
      gap_delta_percent: gapDeltaPercent,
      track_status_changed: trackStatusChanged,
    },
  };
}

function calculateFireMetricsFromInput(input: any) {
  // Calculate years to FIRE
  const yearsToFire = input.fire_target_age - input.age;

  // Calculate household income
  const householdIncome = input.monthly_income || (input.monthly_savings / 0.3); // Estimate if not provided

  // Calculate LIA based on inputs
  const LIA = calculateLifestyleInflationAdjustment(
    input.age,
    input.dependents || 0,
    input.savings_rate || 30,
    input.lifestyle_type || 'standard'
  );

  // Call calculateFireMetrics with individual parameters
  const metrics = calculateFireMetrics(
    input.age,
    input.fire_target_age,
    yearsToFire,
    input.monthly_expenses,
    input.current_networth,
    input.monthly_savings,
    householdIncome,
    LIA
  );

  return {
    required_corpus: metrics.requiredCorpus,
    projected_corpus: metrics.projectedCorpusAtFire,
    post_fire_monthly_expense: metrics.postFireMonthlyExpense,
    lifestyle_inflation_adjustment: LIA,
    safe_withdrawal_rate: metrics.safeWithdrawalRate,
    monthly_savings_needed: metrics.monthlySavingsNeeded,
    is_on_track: metrics.isOnTrack,
    years_to_fire: yearsToFire,
  };
}

function getAssetAllocationRecommendation(
  userData: UserFinancialContext,
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
): AssetAllocationRecommendation {
  const { age, yearsToFire, equity, debt, cash, realEstate, otherAssets, currentNetworth } = userData;

  const currentAllocation = {
    equity_percent: (equity / currentNetworth) * 100,
    debt_percent: (debt / currentNetworth) * 100,
    cash_percent: (cash / currentNetworth) * 100,
    real_estate_percent: (realEstate / currentNetworth) * 100,
    other_percent: (otherAssets / currentNetworth) * 100,
  };

  let baseEquityPercent = 100 - age;

  if (riskTolerance === 'aggressive') {
    baseEquityPercent = Math.min(baseEquityPercent + 10, 80);
  } else if (riskTolerance === 'conservative') {
    baseEquityPercent = Math.max(baseEquityPercent - 10, 30);
  }

  if (yearsToFire < 5) {
    baseEquityPercent = Math.max(baseEquityPercent - 10, 30);
  } else if (yearsToFire > 15) {
    baseEquityPercent = Math.min(baseEquityPercent + 10, 80);
  }

  const recommendedEquityPercent = Math.max(30, Math.min(80, baseEquityPercent));
  const recommendedDebtPercent = Math.max(20, Math.min(50, 100 - recommendedEquityPercent - 10));
  const recommendedCashPercent = 100 - recommendedEquityPercent - recommendedDebtPercent;

  const recommendedAllocation = {
    equity_percent: recommendedEquityPercent,
    debt_percent: recommendedDebtPercent,
    cash_percent: recommendedCashPercent,
  };

  const equityDeviation = Math.abs(currentAllocation.equity_percent - recommendedEquityPercent);
  const rebalancingNeeded = equityDeviation > 10;

  const rebalancingSteps: string[] = [];
  if (rebalancingNeeded) {
    if (currentAllocation.equity_percent < recommendedEquityPercent) {
      const increaseAmount = ((recommendedEquityPercent - currentAllocation.equity_percent) / 100) * currentNetworth;
      rebalancingSteps.push(`Increase equity allocation by ${formatFireCurrency(increaseAmount)} (current: ${currentAllocation.equity_percent.toFixed(1)}%, target: ${recommendedEquityPercent}%)`);
    } else {
      const decreaseAmount = ((currentAllocation.equity_percent - recommendedEquityPercent) / 100) * currentNetworth;
      rebalancingSteps.push(`Reduce equity allocation by ${formatFireCurrency(decreaseAmount)} (current: ${currentAllocation.equity_percent.toFixed(1)}%, target: ${recommendedEquityPercent}%)`);
    }

    rebalancingSteps.push('Consider SIP (Systematic Investment Plan) for gradual rebalancing');
    rebalancingSteps.push('Review allocation quarterly to maintain target ratios');
  }

  const reasoning = `For a ${age}-year-old with ${yearsToFire.toFixed(1)} years to FIRE and ${riskTolerance} risk tolerance, I recommend ${recommendedEquityPercent}% equity, ${recommendedDebtPercent}% debt, and ${recommendedCashPercent}% cash. ${
    yearsToFire < 5
      ? "Since you're close to FIRE, we prioritize capital preservation."
      : yearsToFire > 15
      ? 'With a long timeline, you can afford higher equity exposure for growth.'
      : 'This balanced allocation suits your medium-term horizon.'
  }`;

  return {
    current_allocation: currentAllocation,
    recommended_allocation: recommendedAllocation,
    rebalancing_needed: rebalancingNeeded,
    rebalancing_steps: rebalancingSteps,
    reasoning,
  };
}
