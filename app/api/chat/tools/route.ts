// AI Tools Execution API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { executeOpenAITool } from '@/app/lib/ai/tools-openai';
import { UserFinancialContext } from '@/app/lib/ai/types';
import { calculateAge } from '@/app/utils/date-helpers';

export async function POST(request: NextRequest) {
  try {
    const { toolName, toolInput, conversationId } = await request.json();

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's financial profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Transform profile to UserFinancialContext
    const userData: UserFinancialContext = {
      name: user.email?.split('@')[0] || 'User',
      age: calculateAge(profile.date_of_birth),
      dateOfBirth: profile.date_of_birth,
      city: profile.city,
      maritalStatus: profile.marital_status,
      dependents: profile.dependents,
      monthlyIncome: profile.monthly_income,
      spouseIncome: profile.spouse_income || 0,
      totalHouseholdIncome: profile.monthly_income + (profile.spouse_income || 0),
      monthlyExpenses: profile.monthly_expenses,
      monthlySavings: profile.monthly_income + (profile.spouse_income || 0) - profile.monthly_expenses,
      savingsRate:
        ((profile.monthly_income + (profile.spouse_income || 0) - profile.monthly_expenses) /
          (profile.monthly_income + (profile.spouse_income || 0))) *
        100,
      equity: profile.equity || 0,
      debt: profile.debt || 0,
      cash: profile.cash || 0,
      realEstate: profile.real_estate || 0,
      otherAssets: profile.other_assets || 0,
      currentNetworth:
        (profile.equity || 0) +
        (profile.debt || 0) +
        (profile.cash || 0) +
        (profile.real_estate || 0) +
        (profile.other_assets || 0),
      fireTargetAge: profile.fire_target_age,
      fireTargetDate: profile.fire_target_date,
      yearsToFire: profile.fire_target_age - calculateAge(profile.date_of_birth),
      fireLifestyleType: profile.fire_lifestyle_type,
      lifestyleInflationAdjustment: profile.lifestyle_inflation_adjustment,
      safeWithdrawalRate: profile.safe_withdrawal_rate,
      postFireMonthlyExpense: profile.post_fire_monthly_expense,
      requiredCorpus: profile.required_corpus,
      projectedCorpusAtFire: profile.projected_corpus_at_fire,
      monthlySavingsNeeded: profile.monthly_savings_needed,
      isOnTrack: profile.is_on_track,
    };

    // Execute the tool
    const result = await executeOpenAITool(toolName, toolInput, userData);

    // If this is a create_scenario tool, save to database
    if (toolName === 'create_scenario') {
      const { data: scenario, error: scenarioError } = await supabase
        .from('fire_scenarios')
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          name: toolInput.name,
          description: toolInput.description,
          scenario_data: toolInput.changes,
          results: toolInput.results,
          comparison: result.comparison || null,
          is_active: false,
        })
        .select()
        .single();

      if (scenarioError) {
        console.error('Error saving scenario:', scenarioError);
        return NextResponse.json({ error: 'Failed to save scenario' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        result: { ...result, scenario_id: scenario.id },
      });
    }

    // If this is an apply_suggestion tool, prepare the action
    if (toolName === 'apply_suggestion') {
      // Don't actually apply - just return the prepared action
      // Frontend will show confirmation button
      return NextResponse.json({
        success: true,
        result,
        action: {
          type: 'apply_suggestion',
          field: toolInput.field,
          new_value: toolInput.new_value,
          reason: toolInput.reason,
        },
      });
    }

    // For all other tools, return the result
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tool execution failed' },
      { status: 500 }
    );
  }
}
