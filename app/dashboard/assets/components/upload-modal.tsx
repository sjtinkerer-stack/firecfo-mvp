// Component: Upload Modal with Drag & Drop

'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAssetUpload, UploadResult } from '../hooks/use-asset-upload';
import { CancelConfirmationDialog } from './cancel-confirmation-dialog';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: UploadResult) => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles, uploading, progress, error, reset } = useAssetUpload();

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesSelected(droppedFiles);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFilesSelected(selectedFiles);
    }
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    // Validate file types
    const validFiles = selectedFiles.filter((file) => {
      const extension = file.name.toLowerCase().split('.').pop();
      return ['pdf', 'csv', 'xlsx', 'xls'].includes(extension || '');
    });

    if (validFiles.length < selectedFiles.length) {
      alert(
        `${selectedFiles.length - validFiles.length} file(s) skipped. Only PDF, CSV, and Excel files are supported.`
      );
    }

    // Limit to 10 files
    if (validFiles.length > 10) {
      alert('Maximum 10 files allowed. Only first 10 files will be uploaded.');
      setFiles(validFiles.slice(0, 10));
    } else {
      setFiles(validFiles);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    const result = await uploadFiles(files);

    if (result) {
      onSuccess(result);
      handleClose();
    }
  };

  const handleClose = () => {
    // Show confirmation if currently uploading
    if (uploading) {
      setShowCancelConfirmation(true);
      return;
    }
    // Close normally if not uploading
    setFiles([]);
    reset();
    onClose();
  };

  const handleConfirmCancel = () => {
    // User confirmed they want to cancel
    setShowCancelConfirmation(false);
    setFiles([]);
    reset();
    onClose();
  };

  const handleCancelConfirmation = () => {
    // User wants to go back and continue
    setShowCancelConfirmation(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Asset Statements</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag & Drop Zone */}
          {!uploading && (
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-300 dark:border-gray-700'}
                ${files.length === 0 ? 'cursor-pointer' : ''}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => files.length === 0 && fileInputRef.current?.click()}
            >
              <Upload
                className={`w-12 h-12 mx-auto mb-4 ${
                  isDragging ? 'text-emerald-500' : 'text-gray-400'
                }`}
              />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isDragging ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                or click to browse
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Supported: PDF, CSV, Excel (.xlsx, .xls) • Max 10 files, 50MB each
              </p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.csv,.xlsx,.xls"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="border rounded-lg p-6 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Processing Your Statements...
                </p>
              </div>
              <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-4">
                Parsing {progress.current} of {progress.total} files • Using AI to classify assets
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="border border-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900 dark:text-red-100">Upload Failed</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Selected Files List */}
          {files.length > 0 && !uploading && (
            <div className="space-y-2">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {files.length} file{files.length > 1 ? 's' : ''} selected:
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!uploading && (
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={files.length === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Upload & Process
              </button>
            </div>
          )}

          {/* Upload Tips */}
          {!uploading && files.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                💡 Tips for best results:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Use the latest statements (within last 30 days)</li>
                <li>Ensure PDFs are text-based, not scanned images</li>
                <li>CSV/Excel files should have "Asset Name" and "Value" columns</li>
                <li>Upload all statements at once for accurate duplicate detection</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

      <CancelConfirmationDialog
        isOpen={showCancelConfirmation}
        processingType="upload"
        onConfirm={handleConfirmCancel}
        onCancel={handleCancelConfirmation}
      />
    </>
  );
}
