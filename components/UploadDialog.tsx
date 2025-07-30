"use client";

import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatFileSize } from "@/hooks/use-upload";
import { TruncatedText } from "@/components/ui/truncated-text";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  files: File[];
  uploading: boolean;
  isDragging: boolean;
  onFilesChange: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onUpload: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  uploadButtonText?: string;
  disabled?: boolean;
}

export default function UploadDialog({
  open,
  onOpenChange,
  title,
  files,
  uploading,
  isDragging,
  onFilesChange,
  onRemoveFile,
  onUpload,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  uploadButtonText = "Upload",
  disabled = false,
}: UploadDialogProps) {
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesChange(Array.from(e.target.files));
    }
  };

  const handleClearFiles = () => {
    onFilesChange([]);
  };

  const handleCancel = () => {
    handleClearFiles();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
            }`}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Dateien hier ablegen oder
            </p>
            <Input
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              id="file-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Dateien auswählen
            </Button>
          </div>
          
          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Ausgewählte Dateien:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <TruncatedText text={file.name} maxLines={1} className="text-sm font-medium" />
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(index)}
                      className="ml-2 h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Abbrechen
          </Button>
          <Button
            onClick={onUpload}
            disabled={files.length === 0 || uploading || disabled}
            className="flex items-center gap-2"
          >
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading ? "Uploading..." : `${uploadButtonText} (${files.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}