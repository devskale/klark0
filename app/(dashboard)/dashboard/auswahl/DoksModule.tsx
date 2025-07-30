"use client";
import { useState, useEffect } from "react";
import { Loader2, MoreHorizontal, Folder, FileText, Image, Upload, X } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProject } from "@/context/ProjectContext";
import {
  fileTreeFetcher,
  FileTreeEntry,
  FileSystemSettings,
} from "@/lib/fs/fileTreeUtils";

interface DoksModuleProps {
  isUploadDialogOpen?: boolean;
  setIsUploadDialogOpen?: (open: boolean) => void;
}

export default function DoksModule({ isUploadDialogOpen: externalUploadDialogOpen, setIsUploadDialogOpen: externalSetUploadDialogOpen }: DoksModuleProps = {}) {
  const {
    selectedProject: projectPath,
    selectedBieter: bieterPath,
    selectedDok,
    setSelectedDok,
  } = useProject();

  const docsPath = bieterPath
    ? bieterPath
    : projectPath
    ? `${projectPath}/A`
    : null;

  const {
    data: docs,
    error,
    mutate,
  } = useSWR<FileTreeEntry[]>(
    docsPath
      ? [
          docsPath,
          { noshowList: ["archive", ".archive"], fileSystemType: "webdav" },
        ]
      : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [metadataMap, setMetadataMap] = useState<Record<string, any>>({});
  
  // Upload state management
  const [internalUploadDialogOpen, setInternalUploadDialogOpen] = useState(false);
  const isUploadDialogOpen = externalUploadDialogOpen ?? internalUploadDialogOpen;
  const setIsUploadDialogOpen = externalSetUploadDialogOpen ?? setInternalUploadDialogOpen;
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // clear selection on project/bieter change
  useEffect(() => {
    setSelectedDocs([]);
    // Only clear selectedDok when switching project or bieter, but preserve if already set from localStorage
    if (!selectedDok) {
      setSelectedDok(null);
    }
  }, [projectPath, bieterPath, setSelectedDok, selectedDok]);

  // Ensure selectedDocs includes selectedDok when restored from localStorage
  useEffect(() => {
    if (selectedDok && !selectedDocs.includes(selectedDok)) {
      setSelectedDocs(prev => [...prev, selectedDok]);
    }
  }, [selectedDok, selectedDocs]);
  // clear and fetch index metadata when docs change
  useEffect(() => {
    if (docs && docsPath) {
      const fetchIndexMeta = async () => {
        // build index side-car path
        const indexSidecar = `${docsPath.replace(
          /\/$/,
          ""
        )}/.pdf2md_index.json`;
        const params = new URLSearchParams({
          path: indexSidecar,
        });
        const res = await fetch(`/api/fs/metadata?${params.toString()}`);
        if (!res.ok) {
          setMetadataMap({});
          return;
        }
        const idx = await res.json();
        // map meta by file path
        const map: Record<string, any> = {};
        docs
          .filter((f) => f.type === "file")
          .forEach((f) => {
            const entry = (idx.files || []).find((e: any) => e.name === f.name);
            if (entry?.meta) {
              map[f.path] = entry.meta;
            }
          });
        setMetadataMap(map);
      };
      fetchIndexMeta();
    } else {
      setMetadataMap({});
    }
  }, [docs, docsPath]);

  const toggleSelect = (path: string) => {
    setSelectedDocs((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
    const wasSelected = selectedDocs.includes(path);
    setSelectedDok(wasSelected ? null : path);
  };
  const handleDelete = async (path: string) => {
    try {
      const params = new URLSearchParams({ path });
      const res = await fetch(`/api/fs/delete?${params.toString()}`, {
        method: "POST",
      });

      if (res.ok) {
        mutate();
        if (selectedDok === path) {
          setSelectedDok(null);
        }
        setSelectedDocs((prev) => prev.filter((p) => p !== path));
      } else {
        console.error("Fehler beim Löschen der Datei:", await res.text());
        // You might want to show a toast notification to the user here
      }
    } catch (error) {
      console.error("Fehler beim Löschen der Datei:", error);
      // You might want to show a toast notification to the user here
    }
  };
  const handleRename = (path: string) => console.log("Rename", path);

  // Upload handlers
  const handleFileDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setIsDragging(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadFiles(Array.from(e.dataTransfer.files));
      setIsUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!uploadFiles.length || !docsPath) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      uploadFiles.forEach((file) => {
        formData.append("files", file);
      });

      const queryParams = new URLSearchParams({
        path: docsPath,
      });

      const response = await fetch(`/api/fs/upload?${queryParams.toString()}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Upload erfolgreich
      setUploadSuccess(`${uploadFiles.length} Dateien hochgeladen`);
      setTimeout(() => setUploadSuccess(null), 3000);
      setUploadFiles([]);
      setIsUploadDialogOpen(false);

      // Dokumentenliste neu laden
      await mutate();
    } catch (error) {
      console.error("Fehler beim Upload:", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler beim Upload"
      );
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // pick an icon based on file extension
  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf")
      return <FileText className="mr-2 h-4 w-4 text-red-500 flex-shrink-0" />;
    if (ext && ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext))
      return <FileText className="mr-2 h-4 w-4 text-blue-500 flex-shrink-0" />;
    if (ext && ["png", "jpg", "jpeg", "gif", "svg"].includes(ext))
      return <Image className="mr-2 h-4 w-4 text-green-500 flex-shrink-0" />;
    return <FileText className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />;
  };

  if (!projectPath) {
    return (
      <p className="text-sm text-gray-500">
        Bitte zuerst ein Projekt auswählen.
      </p>
    );
  }
  if (docsPath && !docs && !error) {
    return (
      <div className="flex items-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Lade Dokumente…</span>
      </div>
    );
  }
  if (error) {
    return <div className="text-red-500">Fehler beim Laden der Dokumente.</div>;
  }
  return (
    <div>
      
      {/* Success/Error Messages */}
      {uploadSuccess && (
        <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
          {uploadSuccess}
        </div>
      )}
      {uploadError && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {uploadError}
        </div>
      )}

      {docs && docs.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Kategorie
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {docs
              .filter(
                (f) =>
                  // Filter out the root path, JSON files, and directories
                  f.path !== docsPath &&
                  f.type !== "directory" &&
                  !f.name.toLowerCase().endsWith(".json")
              )
              .map((f: FileTreeEntry) => (
                <tr
                  key={f.path}
                  className={`cursor-pointer ${
                    selectedDocs.includes(f.path) || selectedDok === f.path ? "bg-gray-100" : ""
                  }`}
                  onClick={() => toggleSelect(f.path)}>
                  <td className="px-4 py-2 w-1/2">
                    <div className="flex items-center min-w-0">
                      {f.type === "directory" ? (
                        <Folder className="mr-2 h-4 w-4 flex-shrink-0" />
                      ) : (
                        getFileIcon(f.name)
                      )}
                      <span className="truncate" title={metadataMap[f.path]?.name ?? f.name}>
                        {metadataMap[f.path]?.name ?? f.name}
                      </span>
                      {f.type === "file" && f.hasParser && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-800 flex-shrink-0">
                          struct
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 w-20">
                    {f.parserStatus || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 w-24">
                    <span className="truncate block" title={metadataMap[f.path]?.kategorie ?? "-"}>
                      {metadataMap[f.path]?.kategorie ?? "-"}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right w-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onSelect={() => handleDelete(f.path)}>
                          Löschen
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleRename(f.path)}>
                          Umbenennen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : (
        <div
          className={`p-8 border-2 border-dashed rounded-lg text-center ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
          }`}
          onDragEnter={handleFileDrag}
          onDragLeave={handleFileDrag}
          onDragOver={handleFileDrag}
          onDrop={handleFileDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-500 mb-2">
            Keine Dokumente gefunden. Dateien hier ablegen oder
          </p>
          <Button
            variant="outline"
            onClick={() => setIsUploadDialogOpen(true)}
            disabled={!docsPath}
          >
            Dateien auswählen
          </Button>
        </div>
      )}
      
      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Upload zu {bieterPath ? "Bieter" : "Ausschreibung"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
              }`}
              onDragEnter={handleFileDrag}
              onDragLeave={handleFileDrag}
              onDragOver={handleFileDrag}
              onDrop={handleFileDrop}
            >
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Dateien hier ablegen oder
              </p>
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setUploadFiles(Array.from(e.target.files));
                  }
                }}
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
            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Ausgewählte Dateien:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {uploadFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
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
              onClick={() => {
                setUploadFiles([]);
                setIsUploadDialogOpen(false);
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadFiles.length === 0 || uploading}
              className="flex items-center gap-2"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploading ? "Uploading..." : `Upload (${uploadFiles.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
