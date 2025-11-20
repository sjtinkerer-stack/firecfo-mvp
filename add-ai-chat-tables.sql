-- Migration: Add AI Chat Tables
-- Description: Creates tables for chat conversations, messages, and FIRE scenarios
-- Date: 2025-11-15

-- ============================================================================
-- 1. Chat Conversations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- Auto-generated from first message or user-provided
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user conversation lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);

-- ============================================================================
-- 2. Chat Messages Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB, -- Stores Claude tool/function calls
  tool_results JSONB, -- Stores results from tool execution
  actions JSONB, -- Stores pending user actions (Apply This, Save Scenario)
  tokens_used INTEGER, -- For cost tracking
  estimated_cost NUMERIC(10, 6), -- USD cost estimate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for conversation message retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- ============================================================================
-- 3. FIRE Scenarios Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS fire_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  scenario_data JSONB NOT NULL, -- Stores modified parameters (monthly_savings, fire_age, etc.)
  results JSONB NOT NULL, -- Stores calculated results (required_corpus, projected_corpus, etc.)
  comparison JSONB, -- Stores comparison with current plan
  is_active BOOLEAN DEFAULT false, -- Only one scenario can be active at a time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for scenario lookups
CREATE INDEX IF NOT EXISTS idx_fire_scenarios_user_id ON fire_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_fire_scenarios_conversation_id ON fire_scenarios(conversation_id);
CREATE INDEX IF NOT EXISTS idx_fire_scenarios_is_active ON fire_scenarios(is_active) WHERE is_active = true;

-- ============================================================================
-- 4. Auto-Update Triggers
-- ============================================================================

-- Update conversations.updated_at on message insert
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Update scenarios.updated_at on row update
CREATE OR REPLACE FUNCTION update_fire_scenario_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fire_scenario_timestamp
BEFORE UPDATE ON fire_scenarios
FOR EACH ROW
EXECUTE FUNCTION update_fire_scenario_timestamp();

-- ============================================================================
-- 5. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_scenarios ENABLE ROW LEVEL SECURITY;

-- Chat Conversations Policies
CREATE POLICY "Users can view their own conversations"
  ON chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON chat_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Chat Messages Policies (via conversation ownership)
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their conversations"
  ON chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

-- FIRE Scenarios Policies
CREATE POLICY "Users can view their own scenarios"
  ON fire_scenarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenarios"
  ON fire_scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios"
  ON fire_scenarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios"
  ON fire_scenarios FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Constraint to Ensure Only One Active Scenario Per User
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_scenario_per_user
ON fire_scenarios(user_id)
WHERE is_active = true;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor
-- Tables: chat_conversations, chat_messages, fire_scenarios
-- Triggers: Auto-update timestamps
-- RLS: All tables secured with user-based policies
