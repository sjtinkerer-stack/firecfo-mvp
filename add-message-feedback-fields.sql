-- Migration: Add Message Feedback Fields
-- Description: Adds feedback fields to chat_messages for user ratings and comments
-- Date: 2025-11-24

-- ============================================================================
-- 1. Add Feedback Columns to chat_messages
-- ============================================================================

-- Add feedback type column (helpful, unhelpful, or NULL)
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS user_feedback TEXT CHECK (user_feedback IN ('helpful', 'unhelpful'));

-- Add optional feedback comment column
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS feedback_text TEXT;

-- Add feedback timestamp column
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS feedback_timestamp TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 2. Create Index for Feedback Analytics
-- ============================================================================

-- Index for querying messages with feedback (for analytics)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_feedback
ON chat_messages(user_feedback)
WHERE user_feedback IS NOT NULL;

-- Index for feedback timestamp ordering
CREATE INDEX IF NOT EXISTS idx_chat_messages_feedback_timestamp
ON chat_messages(feedback_timestamp DESC)
WHERE feedback_timestamp IS NOT NULL;

-- ============================================================================
-- 3. Update RLS Policy to Allow Feedback Updates
-- ============================================================================

-- Allow users to update feedback fields in their own conversations
CREATE POLICY "Users can update feedback in their conversations"
  ON chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor
-- New columns: user_feedback, feedback_text, feedback_timestamp
-- New indexes: For analytics queries
-- New RLS policy: Allows users to update feedback on their messages
