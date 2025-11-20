'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { SuggestedQuestions } from './suggested-questions';
import { ConversationHistory } from './conversation-history';
import { RenameConversationDialog } from './rename-conversation-dialog';
import { DeleteConversationDialog } from './delete-conversation-dialog';
import { ChatMessage } from '@/app/lib/ai/types';
import { ChatView } from './types';
import { Sparkles, History, ArrowLeft, MoreVertical, Plus, Pencil, Trash2 } from 'lucide-react';

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [view, setView] = useState<ChatView>('clean');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation from localStorage on mount
  useEffect(() => {
    const savedConversationId = localStorage.getItem('active_conversation_id');
    if (savedConversationId) {
      loadConversation(savedConversationId);
    }
  }, []);

  // Save conversation ID to localStorage whenever it changes
  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('active_conversation_id', conversationId);
    }
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async (convId: string) => {
    try {
      // Fetch conversation with messages
      const response = await fetch(`/api/conversations/${convId}`);
      if (response.ok) {
        const data = await response.json();
        setConversationId(convId);
        setConversationTitle(data.conversation.title);
        setMessages(data.messages || []);
        setView('active');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setConversationTitle('');
    localStorage.removeItem('active_conversation_id');
    setView('clean');
  };

  const handleSendMessage = async (content: string) => {
    // Switch to active view when sending first message
    if (view === 'clean') {
      setView('active');
    }
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call streaming API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let tempAssistantId = `temp-assistant-${Date.now()}`;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'text_delta') {
                  assistantMessage += data.text;
                  // Update or add assistant message
                  setMessages((prev) => {
                    const existing = prev.find((m) => m.id === tempAssistantId);
                    if (existing) {
                      return prev.map((m) =>
                        m.id === tempAssistantId ? { ...m, content: assistantMessage } : m
                      );
                    } else {
                      return [
                        ...prev,
                        {
                          id: tempAssistantId,
                          conversation_id: conversationId || '',
                          role: 'assistant' as const,
                          content: assistantMessage,
                          created_at: new Date().toISOString(),
                        },
                      ];
                    }
                  });
                } else if (data.type === 'done') {
                  // Save conversation ID from response
                  if (data.conversationId && !conversationId) {
                    setConversationId(data.conversationId);
                  }
                  // Update title if auto-generated
                  if (data.title) {
                    setConversationTitle(data.title);
                  }
                } else if (data.type === 'error') {
                  console.error('Streaming error:', data.error);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          conversation_id: conversationId || '',
          role: 'assistant' as const,
          content: '❌ Sorry, I encountered an error. Please try again.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    handleSendMessage(question);
  };

  // Render history view
  if (view === 'history') {
    return (
      <div className="flex flex-col h-full">
        <ConversationHistory
          onSelectConversation={(id) => loadConversation(id)}
          onNewChat={handleNewChat}
          onClose={() => setView(messages.length > 0 ? 'active' : 'clean')}
          activeConversationId={conversationId}
          onUpdateActiveTitle={(newTitle) => setConversationTitle(newTitle)}
        />
      </div>
    );
  }

  // Render clean or active view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 overflow-hidden">
          {view === 'active' && conversationTitle && (
            <button
              onClick={() => setView('history')}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
            <h3
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate"
              title={view === 'active' && conversationTitle ? conversationTitle : 'FireCFO AI'}
            >
              {view === 'active' && conversationTitle ? conversationTitle : 'FireCFO AI'}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {view === 'active' && messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
              title="Start new conversation"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          )}
          <button
            onClick={() => setView('history')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Conversation History"
          >
            <History className="w-5 h-5" />
          </button>
          {view === 'active' && messages.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />

                  {/* Dropdown menu */}
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowRenameDialog(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteDialog(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Ask me anything about your FIRE journey
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              I can help with planning, simulations, and financial advice
            </p>
            <SuggestedQuestions onSelect={handleSuggestedQuestion} />
          </div>
        ) : (
          <>
            <ChatMessages messages={messages} isLoading={isLoading} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />

      {/* Rename Dialog */}
      {conversationId && conversationTitle && (
        <RenameConversationDialog
          open={showRenameDialog}
          onOpenChange={setShowRenameDialog}
          conversationId={conversationId}
          currentTitle={conversationTitle}
          onSuccess={(newTitle) => {
            // Optimistically update the title
            setConversationTitle(newTitle);
          }}
        />
      )}

      {/* Delete Dialog */}
      {conversationId && conversationTitle && (
        <DeleteConversationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          conversationId={conversationId}
          conversationTitle={conversationTitle}
          isActive={true}
          onSuccess={() => {
            // Clear current conversation and go to clean view
            handleNewChat();
          }}
        />
      )}
    </div>
  );
}
