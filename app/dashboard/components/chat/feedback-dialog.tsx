'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  feedbackType: 'helpful' | 'unhelpful';
  onSubmit: (messageId: string, feedbackType: 'helpful' | 'unhelpful', comment: string) => Promise<void>;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  messageId,
  feedbackType,
  onSubmit,
}: FeedbackDialogProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(messageId, feedbackType, comment);
      setComment(''); // Clear comment after submission
      onOpenChange(false); // Close dialog
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    // Submit feedback without comment (user clicked "Skip")
    setIsSubmitting(true);
    try {
      await onSubmit(messageId, feedbackType, ''); // Empty comment
      setComment(''); // Clear comment after submission
      onOpenChange(false); // Close dialog
    } catch (error) {
      console.error('Failed to submit feedback on skip:', error);
      // Still close the dialog even if submission fails
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {feedbackType === 'helpful' ? 'What did you like?' : 'What could be improved?'}
          </DialogTitle>
          <DialogDescription>
            {feedbackType === 'helpful'
              ? 'Help us understand what worked well for you. (Optional)'
              : 'Help us improve by sharing what went wrong. (Optional)'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              feedbackType === 'helpful'
                ? 'E.g., The calculation was accurate and explained well...'
                : 'E.g., The numbers seemed off, or I expected different suggestions...'
            }
            rows={5}
            className="resize-none"
            disabled={isSubmitting}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
