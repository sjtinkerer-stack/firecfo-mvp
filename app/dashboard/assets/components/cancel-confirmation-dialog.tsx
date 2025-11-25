// Component: Cancel Confirmation Dialog
// Shows warning when user tries to close modal during processing

'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface CancelConfirmationDialogProps {
  isOpen: boolean;
  processingType: 'upload' | 'save';
  onConfirm: () => void;
  onCancel: () => void;
}

export function CancelConfirmationDialog({
  isOpen,
  processingType,
  onConfirm,
  onCancel,
}: CancelConfirmationDialogProps) {
  const messages = {
    upload: {
      title: 'Cancel File Processing?',
      description:
        'Your files are still being processed with AI. If you cancel now:\n\n• Processing will stop immediately\n• You\'ll lose progress on AI classification\n• You may be charged for partial API usage\n\nAre you sure you want to cancel?',
    },
    save: {
      title: 'Cancel Saving Assets?',
      description:
        'Your assets are being saved to the database. If you cancel now:\n\n• Assets will not be saved to your portfolio\n• You\'ll need to upload and review again\n\nAre you sure you want to cancel?',
    },
  };

  const message = messages[processingType];

  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <AlertDialogTitle>{message.title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 whitespace-pre-line">
                {message.description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Go Back</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Yes, Cancel Upload
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
