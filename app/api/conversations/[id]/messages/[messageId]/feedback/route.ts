// API route for submitting message feedback (thumbs up/down + optional comment)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: conversationId, messageId } = await params;
    const { feedbackType, feedbackText } = await request.json();

    // Validate feedback type
    if (!feedbackType || !['helpful', 'unhelpful'].includes(feedbackType)) {
      return NextResponse.json(
        { error: 'Invalid feedback type. Must be "helpful" or "unhelpful".' },
        { status: 400 }
      );
    }

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

    // Verify user owns the conversation (security check)
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify message exists in this conversation
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Update message with feedback
    const { data: updatedMessage, error: updateError } = await supabase
      .from('chat_messages')
      .update({
        user_feedback: feedbackType,
        feedback_text: feedbackText || null,
        feedback_timestamp: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating message feedback:', updateError);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: conversationId, messageId } = await params;

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

    // Verify user owns the conversation (security check)
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify message exists in this conversation
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Clear feedback by setting all feedback fields to null
    const { data: updatedMessage, error: updateError } = await supabase
      .from('chat_messages')
      .update({
        user_feedback: null,
        feedback_text: null,
        feedback_timestamp: null,
      })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) {
      console.error('Error clearing message feedback:', updateError);
      return NextResponse.json(
        { error: 'Failed to clear feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    console.error('Clear feedback API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
