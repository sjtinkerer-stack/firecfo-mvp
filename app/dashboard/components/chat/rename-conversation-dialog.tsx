'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Validation schema
const titleSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title cannot exceed 100 characters')
    .trim(),
});

interface RenameConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentTitle: string;
  onSuccess: (newTitle: string) => void;
}

export function RenameConversationDialog({
  open,
  onOpenChange,
  conversationId,
  currentTitle,
  onSuccess,
}: RenameConversationDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string }>({});

  // Reset title when dialog opens with new conversation
  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setErrors({});
    }
  }, [open, currentTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    try {
      titleSchema.parse({ title });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { title?: string } = {};
        error.issues.forEach((err) => {
          if (err.path[0] === 'title') {
            fieldErrors.title = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    // Check if title actually changed
    if (title.trim() === currentTitle.trim()) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename conversation');
      }

      toast.success('Conversation renamed successfully');
      onSuccess(title.trim());
      onOpenChange(false);
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast.error('Failed to rename conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Conversation</DialogTitle>
          <DialogDescription>
            Choose a new name for this conversation. This helps you find it later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Conversation Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., FIRE Planning Discussion"
                disabled={isLoading}
                className={errors.title ? 'border-red-500' : ''}
                autoFocus
              />
              {errors.title && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.title}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
