// AI Chat TypeScript Types

export interface UserFinancialContext {
  // Personal Information
  name: string;
  age: number;
  dateOfBirth: string;
  city: string;
  maritalStatus: 'Single' | 'Married';
  dependents: number;

  // Income & Expenses
  monthlyIncome: number;
  spouseIncome: number;
  totalHouseholdIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;

  // Assets
  equity: number;
  debt: number;
  cash: number;
  realEstate: number;
  otherAssets: number;
  currentNetworth: number;

  // FIRE Goal
  fireTargetAge: number;
  fireTargetDate: string;
  yearsToFire: number;
  fireLifestyleType: 'lean' | 'standard' | 'fat';

  // Calculated FIRE Metrics
  lifestyleInflationAdjustment: number;
  safeWithdrawalRate: number;
  postFireMonthlyExpense: number;
  requiredCorpus: number;
  projectedCorpusAtFire: number;
  monthlySavingsNeeded: number;
  isOnTrack: boolean;
}

export interface SimulationChanges {
  monthly_savings_increase?: number;
  fire_age_adjustment?: number;
  expense_reduction_percent?: number;
  income_increase?: number;
  asset_boost?: number;
  lifestyle_type_change?: 'lean' | 'standard' | 'fat';
}

export interface SimulationResult {
  scenario_name: string;
  current_plan: {
    required_corpus: number;
    projected_corpus: number;
    monthly_savings: number;
    years_to_fire: number;
    is_on_track: boolean;
  };
  new_scenario: {
    required_corpus: number;
    projected_corpus: number;
    monthly_savings: number;
    years_to_fire: number;
    is_on_track: boolean;
    fire_age: number;
  };
  comparison: {
    corpus_gap_change: number;
    years_saved: number;
    monthly_savings_delta: number;
    success_probability_change: number;
  };
  analysis: {
    scenario_type: string;
    current_gap: number;
    new_gap: number;
    gap_delta: number;
    gap_delta_percent: number;
    track_status_changed: boolean;
  };
  formatted_summary?: string;
}

export interface AssetAllocationRecommendation {
  current_allocation: {
    equity_percent: number;
    debt_percent: number;
    cash_percent: number;
    real_estate_percent: number;
    other_percent: number;
  };
  recommended_allocation: {
    equity_percent: number;
    debt_percent: number;
    cash_percent: number;
  };
  rebalancing_needed: boolean;
  rebalancing_steps: string[];
  reasoning: string;
}

export interface FireScenario {
  id: string;
  user_id: string;
  conversation_id?: string;
  name: string;
  description?: string;
  scenario_data: SimulationChanges;
  results: SimulationResult['new_scenario'];
  comparison?: SimulationResult['comparison'];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: any;
  tool_results?: any;
  actions?: PendingAction[];
  tokens_used?: number;
  estimated_cost?: number;
  created_at: string;
  // Feedback fields
  user_feedback?: 'helpful' | 'unhelpful' | null;
  feedback_text?: string | null;
  feedback_timestamp?: string | null;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface PendingAction {
  type: 'apply_suggestion' | 'save_scenario';
  label: string;
  data: any;
  description?: string;
}

export interface AIToolCall {
  name: string;
  input: any;
}

export interface AIToolResult {
  tool_name: string;
  result: any;
  error?: string;
}
