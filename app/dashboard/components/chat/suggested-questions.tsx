'use client';

import { Sparkles } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const SUGGESTED_QUESTIONS = [
  {
    label: '💡 What if I save ₹10K more per month?',
    question: 'What if I increase my monthly savings by ₹10,000?',
  },
  {
    label: '📊 Should I rebalance my portfolio?',
    question: 'Based on my current asset allocation, do I need to rebalance my portfolio?',
  },
  {
    label: '🎯 How can I retire earlier?',
    question: 'What changes can I make to retire 5 years earlier?',
  },
  {
    label: '💰 How to optimize my taxes?',
    question: 'What are the best tax-saving strategies for my income level?',
  },
];

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Try asking:</span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {SUGGESTED_QUESTIONS.map((sq) => (
          <button
            key={sq.question}
            onClick={() => onSelect(sq.question)}
            className="text-left px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-lg transition-all duration-200 group"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
              {sq.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
