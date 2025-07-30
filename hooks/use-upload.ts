import { useState } from 'react';

interface UploadOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

interface UploadState {
  files: File[];
  uploading: boolean;
  success: string | null;
  error: string | null;
  isDragging: boolean;
}

interface UploadActions {
  setFiles: (files: File[]) => void;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  handleFileDrag: (e: React.DragEvent) => void;
  handleFileDrop: (e: React.DragEvent) => void;
  upload: (uploadPath: string) => Promise<void>;
  clearMessages: () => void;
}

export function useUpload(options: UploadOptions = {}): UploadState & UploadActions {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const clearMessages = () => {
    setSuccess(null);
    setError(null);
  };

  const handleFileDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave' || e.type === 'drop') {
      setIsDragging(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(droppedFiles);
    }
  };

  const upload = async (uploadPath: string) => {
    if (!files.length || !uploadPath) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const queryParams = new URLSearchParams({
        path: uploadPath,
      });

      const response = await fetch(`/api/fs/upload?${queryParams.toString()}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const successMessage = `${files.length} Dateien hochgeladen`;
      setSuccess(successMessage);
      
      if (options.onSuccess) {
        options.onSuccess(successMessage);
      }
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
      clearFiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler beim Upload';
      setError(errorMessage);
      
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      console.error('Fehler beim Upload:', err);
    } finally {
      setUploading(false);
      
      if (options.onComplete) {
        options.onComplete();
      }
    }
  };

  return {
    files,
    uploading,
    success,
    error,
    isDragging,
    setFiles,
    addFiles,
    removeFile,
    clearFiles,
    handleFileDrag,
    handleFileDrop,
    upload,
    clearMessages,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}