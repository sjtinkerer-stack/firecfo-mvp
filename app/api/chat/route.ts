// AI Chat API Route with Streaming (OpenAI)

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { buildSystemPrompt } from '@/app/lib/ai/system-prompt';
import { OPENAI_TOOLS, executeOpenAITool } from '@/app/lib/ai/tools-openai';
import { UserFinancialContext } from '@/app/lib/ai/types';
import { calculateAge } from '@/app/utils/date-helpers';

// Lazy initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY is not set in environment variables');
    console.error('🔍 Available env vars:', Object.keys(process.env).filter(k => k.includes('OPEN')));
    throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in Vercel environment variables.');
  }
  console.log('✅ OpenAI API key found:', apiKey.substring(0, 20) + '...');
  return new OpenAI({
    apiKey,
  });
}

// Generate conversation title using GPT-4o-mini
async function generateConversationTitle(userMessage: string): Promise<string> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates short, descriptive titles for financial planning conversations. Generate a concise title (4-6 words max) based on the user\'s message. Return only the title, without quotes or punctuation at the end.',
        },
        {
          role: 'user',
          content: `Generate a short title for this conversation:\n\n${userMessage}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 20,
    });

    const title = response.choices[0]?.message?.content?.trim() || 'New Conversation';
    // Remove quotes if GPT added them
    return title.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Conversation';
  }
}

// Helper function to extract user's first name from various sources
function extractUserName(user: any): string {
  // Priority 1: Try OAuth full_name (e.g., "Sautrik Joardar" → "Sautrik")
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name.split(' ')[0];
  }

  // Priority 2: Try OAuth first_name
  if (user.user_metadata?.first_name) {
    return user.user_metadata.first_name;
  }

  // Priority 3: Try OAuth name
  if (user.user_metadata?.name) {
    return user.user_metadata.name.split(' ')[0];
  }

  // Fallback: Clean email username
  if (user.email) {
    const emailUsername = user.email.split('@')[0];

    // Remove numbers from the end (e.g., "sautrik63" → "sautrik")
    const withoutNumbers = emailUsername.replace(/\d+$/, '');

    // Replace dots and underscores with spaces (e.g., "john.doe" → "john doe")
    const withSpaces = withoutNumbers.replace(/[._]/g, ' ');

    // Capitalize first letter of first word
    const capitalized = withSpaces
      .split(' ')[0] // Take first word only
      .toLowerCase()
      .replace(/^\w/, (c: string) => c.toUpperCase());

    return capitalized || 'User';
  }

  return 'User';
}

// Helper function to extract recent tool results from conversation history
// for context memory (helps AI remember previous simulations)
function getRecentToolResults(
  history: Array<{ role: string; content: string; tool_calls?: unknown; created_at?: string }> | null
): string {
  if (!history || history.length === 0) {
    return '';
  }

  // Extract messages with tool calls (last 5 tool executions)
  const toolMessages = history
    .filter((msg) => msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0)
    .slice(-5); // Last 5 tool executions

  if (toolMessages.length === 0) {
    return '';
  }

  // Build tool memory context
  let toolMemoryContext = '\n\n# RECENT SIMULATIONS & CALCULATIONS\n\n';
  toolMemoryContext += 'You recently ran these simulations in this conversation:\n\n';

  toolMessages.forEach((msg, index) => {
    const toolCalls = msg.tool_calls;
    if (!Array.isArray(toolCalls)) return;

    toolCalls.forEach((toolCall: unknown) => {
      try {
        // Type guard for tool call structure
        if (!toolCall || typeof toolCall !== 'object') return;
        const tc = toolCall as Record<string, unknown>;

        const functionName = (tc.function as Record<string, unknown>)?.name || tc.name;
        const functionArgs = JSON.parse(
          String((tc.function as Record<string, unknown>)?.arguments || tc.arguments || '{}')
        );

        // Format based on tool type
        if (functionName === 'run_simulation') {
          const changes = functionArgs.changes || {};
          const scenarioName = functionArgs.scenario_name || 'Simulation';

          const changesSummary = [];
          if (changes.monthly_savings_increase) {
            changesSummary.push(`₹${Math.abs(changes.monthly_savings_increase / 100000).toFixed(2)}L ${changes.monthly_savings_increase > 0 ? 'more' : 'less'} savings/month`);
          }
          if (changes.fire_age_adjustment) {
            changesSummary.push(`Retire ${changes.fire_age_adjustment > 0 ? changes.fire_age_adjustment + ' years later' : Math.abs(changes.fire_age_adjustment) + ' years earlier'}`);
          }
          if (changes.expense_reduction_percent) {
            changesSummary.push(`${changes.expense_reduction_percent}% expense reduction`);
          }
          if (changes.income_increase) {
            changesSummary.push(`₹${(changes.income_increase / 100000).toFixed(2)}L income increase`);
          }
          if (changes.asset_boost) {
            changesSummary.push(`₹${(changes.asset_boost / 10000000).toFixed(2)} Cr one-time boost`);
          }
          if (changes.lifestyle_type_change) {
            changesSummary.push(`Switch to ${changes.lifestyle_type_change} FIRE`);
          }

          toolMemoryContext += `${index + 1}. **${scenarioName}**: ${changesSummary.join(', ')}\n`;
        } else if (functionName === 'calculate_fire_metrics') {
          toolMemoryContext += `${index + 1}. **FIRE Calculation**: Age ${functionArgs.age}, Target age ${functionArgs.fire_target_age}\n`;
        } else if (functionName === 'get_asset_allocation_recommendation') {
          toolMemoryContext += `${index + 1}. **Asset Allocation Check**\n`;
        }
      } catch (e) {
        // Skip malformed tool calls
        console.error('Error parsing tool call:', e);
      }
    });
  });

  toolMemoryContext += '\n**IMPORTANT**: When the user references "option 1", "option 2", etc., or says just "1", "2", they are referring to the options YOU provided in response to the MOST RECENT simulation above. Use the parameters from that simulation for any follow-up calculations, NOT the user\'s original plan from their profile.\n';

  return toolMemoryContext;
}

// Constants for cost optimization
const SIMPLE_QUERY_MODEL = 'gpt-4o-mini'; // Cheaper for simple queries
const COMPLEX_QUERY_MODEL = 'gpt-4o'; // Better for complex reasoning

// Token cost estimates (USD per 1M tokens) - GPT-4o pricing
const COSTS = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
};

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, useSimpleModel } = await request.json();

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
      savingsRate: ((profile.monthly_income + (profile.spouse_income || 0) - profile.monthly_expenses) / (profile.monthly_income + (profile.spouse_income || 0))) * 100,
      equity: profile.equity || 0,
      debt: profile.debt || 0,
      cash: profile.cash || 0,
      realEstate: profile.real_estate || 0,
      otherAssets: profile.other_assets || 0,
      currentNetworth: (profile.equity || 0) + (profile.debt || 0) + (profile.cash || 0) + (profile.real_estate || 0) + (profile.other_assets || 0),
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

    // Get or create conversation
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      const { data: newConversation, error: conversationError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          title: 'New Conversation',
        })
        .select()
        .single();

      if (conversationError || !newConversation) {
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }

      activeConversationId = newConversation.id;
    }

    // Fetch conversation history (last 25 messages for context, including tool calls)
    const { data: history, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content, tool_calls, created_at')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(25);

    if (historyError) {
      console.error('Error fetching history:', historyError);
    }

    // Extract tool memory from conversation history for context
    const toolMemoryContext = getRecentToolResults(history);
    if (toolMemoryContext) {
      console.log('🧠 Tool memory context added to prompt');
    }

    // Build messages array for OpenAI
    const systemPrompt = buildSystemPrompt(userData, toolMemoryContext);

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...(history || []).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Save user message to database
    await supabase.from('chat_messages').insert({
      conversation_id: activeConversationId,
      role: 'user',
      content: message,
    });

    // Choose model based on complexity hint or default to gpt-4o
    const model = useSimpleModel ? SIMPLE_QUERY_MODEL : COMPLEX_QUERY_MODEL;

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🔍 Starting chat stream with model:', model);
          let fullResponse = '';
          let inputTokens = 0;
          let outputTokens = 0;
          const toolCalls: any[] = [];

          // Stream from OpenAI
          console.log('🔍 Initializing OpenAI client...');
          const openai = getOpenAIClient();
          console.log('🔍 Creating chat completion stream...');
          const chatStream = await openai.chat.completions.create({
            model,
            messages,
            tools: OPENAI_TOOLS,
            stream: true,
            temperature: 0.7,
            max_tokens: 2000,
          });
          console.log('🔍 Stream created successfully');

          let currentToolCall: any = null;

          for await (const chunk of chatStream) {
            const delta = chunk.choices[0]?.delta;

            // Handle text content
            if (delta?.content) {
              fullResponse += delta.content;
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: 'text_delta', text: delta.content })}\n\n`
                )
              );
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.index !== undefined) {
                  if (!currentToolCall || currentToolCall.index !== toolCall.index) {
                    // New tool call
                    if (currentToolCall) {
                      toolCalls.push(currentToolCall);
                    }
                    currentToolCall = {
                      index: toolCall.index,
                      id: toolCall.id || '',
                      type: 'function',
                      function: {
                        name: toolCall.function?.name || '',
                        arguments: toolCall.function?.arguments || '',
                      },
                    };
                  } else {
                    // Continue building current tool call
                    if (toolCall.function?.arguments) {
                      currentToolCall.function.arguments += toolCall.function.arguments;
                    }
                  }
                }
              }
            }

            // Check for finish reason
            if (chunk.choices[0]?.finish_reason === 'stop' || chunk.choices[0]?.finish_reason === 'tool_calls') {
              if (currentToolCall) {
                toolCalls.push(currentToolCall);
              }
            }

            // Track token usage (approximation - OpenAI doesn't stream usage)
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens || 0;
              outputTokens = chunk.usage.completion_tokens || 0;
            }
          }

          // If there are tool calls, execute them and make a second API call
          if (toolCalls.length > 0) {
            console.log('🔧 Tool calls detected:', toolCalls.length);
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'tool_start', count: toolCalls.length })}\n\n`
              )
            );

            // Execute all tools and collect results
            const toolResultMessages: OpenAI.ChatCompletionMessageParam[] = [];

            // Add the assistant's tool call message to the conversation
            const assistantToolMessage: OpenAI.ChatCompletionAssistantMessageParam = {
              role: 'assistant',
              content: fullResponse || null,
              tool_calls: toolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              })),
            };

            // Execute each tool and collect results
            for (const toolCall of toolCalls) {
              try {
                console.log(`🔧 Executing tool: ${toolCall.function.name}`);
                const functionArgs = JSON.parse(toolCall.function.arguments);
                const result = await executeOpenAITool(
                  toolCall.function.name,
                  functionArgs,
                  userData
                );

                // Add tool result message (without formatted_summary)
                const resultCopy = { ...result };
                delete resultCopy.formatted_summary; // Remove if exists

                toolResultMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(resultCopy),
                });

                console.log(`✅ Tool executed successfully: ${toolCall.function.name}`);
              } catch (error) {
                console.error('Tool execution error:', error);
                toolResultMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: `Failed to execute ${toolCall.function.name}` }),
                });
              }
            }

            // Make SECOND API call to OpenAI with tool results
            console.log('🔄 Making second API call with tool results...');
            const messagesWithToolResults: OpenAI.ChatCompletionMessageParam[] = [
              ...messages,
              assistantToolMessage,
              ...toolResultMessages,
            ];

            const secondStream = await openai.chat.completions.create({
              model,
              messages: messagesWithToolResults,
              stream: true,
              temperature: 0.7,
              max_tokens: 2000,
            });

            // Stream OpenAI's interpretation
            console.log('📡 Streaming interpretation from OpenAI...');
            for await (const chunk of secondStream) {
              const delta = chunk.choices[0]?.delta;

              if (delta?.content) {
                fullResponse += delta.content;
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ type: 'text_delta', text: delta.content })}\n\n`
                  )
                );
              }

              // Update token usage from second call
              if (chunk.usage) {
                inputTokens += chunk.usage.prompt_tokens || 0;
                outputTokens += chunk.usage.completion_tokens || 0;
              }
            }

            console.log('✅ Tool interpretation complete');
          }

          // Estimate token usage if not provided
          if (!inputTokens) {
            // Rough estimate: 1 token ≈ 4 characters
            inputTokens = Math.ceil(systemPrompt.length / 4) + Math.ceil(message.length / 4);
            outputTokens = Math.ceil(fullResponse.length / 4);
          }

          // Calculate cost
          const inputCost = (inputTokens / 1_000_000) * COSTS[model].input;
          const outputCost = (outputTokens / 1_000_000) * COSTS[model].output;
          const totalCost = inputCost + outputCost;

          // Save assistant message to database
          await supabase.from('chat_messages').insert({
            conversation_id: activeConversationId,
            role: 'assistant',
            content: fullResponse,
            tool_calls: toolCalls.length > 0 ? toolCalls : null,
            tokens_used: inputTokens + outputTokens,
            estimated_cost: totalCost,
          });

          // Auto-generate title for first message in conversation
          let generatedTitle: string | null = null;
          if (!history || history.length === 0) {
            console.log('🏷️ Generating title for new conversation...');
            generatedTitle = await generateConversationTitle(message);
            console.log('✅ Generated title:', generatedTitle);

            await supabase
              .from('chat_conversations')
              .update({ title: generatedTitle })
              .eq('id', activeConversationId);
          }

          // Send completion event
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'done',
                conversationId: activeConversationId,
                tokens: { input: inputTokens, output: outputTokens },
                cost: totalCost,
                title: generatedTitle, // Include generated title if this was first message
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Streaming failed';
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
