'use client';

import { ChatMessage } from '@/app/lib/ai/types';
import { User, Bot, Loader2, Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
import { FeedbackDialog } from './feedback-dialog';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'helpful' | 'unhelpful' | null>>({});
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<{ messageId: string; type: 'helpful' | 'unhelpful' } | null>(null);

  // Hydrate feedback state from messages (for persistence across navigation)
  useEffect(() => {
    const initialFeedback: Record<string, 'helpful' | 'unhelpful' | null> = {};

    messages.forEach((message) => {
      if (message.user_feedback) {
        initialFeedback[message.id] = message.user_feedback;
      }
    });

    setFeedbackState(initialFeedback);
  }, [messages]);

  const handleCopy = async (messageId: string, content: string) => {
    try {
      // Strip markdown formatting for plain text copy
      const plainText = content
        .replace(/#{1,6}\s/g, '') // Remove markdown headers
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.+?)\*/g, '$1') // Remove italic
        .replace(/`(.+?)`/g, '$1') // Remove inline code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Remove links, keep text

      await navigator.clipboard.writeText(plainText);
      setCopiedId(messageId);
      toast.success('Message copied to clipboard');

      // Reset icon after 2 seconds
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy message');
      console.error('Copy error:', error);
    }
  };

  const clearFeedback = async (messageId: string) => {
    try {
      // Find the message to get its conversation_id
      const message = messages.find((m) => m.id === messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Optimistic update - clear feedback immediately
      setFeedbackState((prev) => ({ ...prev, [messageId]: null }));

      // Call DELETE API to clear feedback
      const response = await fetch(
        `/api/conversations/${message.conversation_id}/messages/${messageId}/feedback`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear feedback');
      }

      // No toast on clear (per user requirement)
    } catch (error) {
      console.error('Clear feedback error:', error);
      // Rollback optimistic update on error
      const message = messages.find((m) => m.id === messageId);
      if (message?.user_feedback) {
        setFeedbackState((prev) => ({ ...prev, [messageId]: message.user_feedback }));
      }
      toast.error('Failed to clear feedback');
    }
  };

  const handleFeedback = async (messageId: string, feedback: 'helpful' | 'unhelpful') => {
    const currentFeedback = feedbackState[messageId];

    // If clicking the same thumb, clear feedback (toggle off)
    if (currentFeedback === feedback) {
      await clearFeedback(messageId);
      return;
    }

    // If clicking opposite thumb or first time, open dialog for comment
    // Optimistic update
    setFeedbackState((prev) => ({ ...prev, [messageId]: feedback }));

    // Open dialog for optional comment
    setCurrentFeedback({ messageId, type: feedback });
    setFeedbackDialogOpen(true);
  };

  const handleFeedbackSubmit = async (messageId: string, feedbackType: 'helpful' | 'unhelpful', comment: string) => {
    try {
      // Find the message to get its conversation_id
      const message = messages.find((m) => m.id === messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Call feedback API
      const response = await fetch(
        `/api/conversations/${message.conversation_id}/messages/${messageId}/feedback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feedbackType,
            feedbackText: comment || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save feedback');
      }

      toast.success(feedbackType === 'helpful' ? 'Thanks for your feedback!' : 'Feedback recorded. We\'ll improve!');
    } catch (error) {
      toast.error('Failed to save feedback');
      console.error('Feedback submission error:', error);
      throw error; // Re-throw to let dialog handle it
    }
  };

  return (
    <TooltipProvider>
      <>
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            </div>
          )}

          <div
            className={`relative group max-w-[85%] rounded-2xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity md:block hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleCopy(message.id, message.content)}
                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Copy message"
                    >
                      {copiedId === message.id ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copiedId === message.id ? 'Copied!' : 'Copy message'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {message.role === 'assistant' ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    // Custom rendering for markdown elements
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    h2: ({ children }) => (
                      <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm">{message.content}</p>
            )}

            {/* Show actions if present */}
            {message.actions && message.actions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
                {message.actions.map((action, idx) => (
                  <button
                    key={idx}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Feedback bar for assistant messages */}
            {message.role === 'assistant' && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Was this helpful?</span>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleFeedback(message.id, 'helpful')}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          feedbackState[message.id] === 'helpful'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                        aria-label="Helpful"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Helpful</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleFeedback(message.id, 'unhelpful')}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          feedbackState[message.id] === 'unhelpful'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                        aria-label="Not helpful"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Not helpful</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>

          {message.role === 'user' && (
            <div className="w-8 h-8 flex-shrink-0 bg-emerald-500 dark:bg-emerald-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
        </motion.div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3 justify-start"
        >
          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-600 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
          </div>
        </motion.div>
      )}

      {/* Feedback Dialog */}
      {currentFeedback && (
        <FeedbackDialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          messageId={currentFeedback.messageId}
          feedbackType={currentFeedback.type}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </>
    </TooltipProvider>
  );
}
