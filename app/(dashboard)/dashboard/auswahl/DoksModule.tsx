"use client";
import { useState, useEffect } from "react";
import { Loader2, MoreHorizontal, Folder, FileText, Image, Upload } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useProject } from "@/context/ProjectContext";
import {
  fileTreeFetcher,
  FileTreeEntry,
  FileSystemSettings,
} from "@/lib/fs/fileTreeUtils";
import { useUpload } from "@/hooks/use-upload";
import UploadDialog from "@/components/UploadDialog";

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
  
  // Use consolidated upload hook
  const upload = useUpload({
    onSuccess: () => {
      setIsUploadDialogOpen(false);
      mutate(); // Refresh document list
    },
    onError: (error) => {
      console.error('Upload error:', error);
    }
  });

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

  // Upload handler using consolidated hook
  const handleUpload = () => {
    if (docsPath) {
      upload.upload(docsPath);
    }
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
        <div className="p-8 border-2 border-dashed rounded-lg text-center border-gray-300">
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
      <UploadDialog
         open={isUploadDialogOpen}
         onOpenChange={setIsUploadDialogOpen}
         title={`Upload zu ${bieterPath ? "Bieter" : "Ausschreibung"}`}
         files={upload.files}
         uploading={upload.uploading}
         isDragging={upload.isDragging}
         onFilesChange={upload.setFiles}
         onRemoveFile={upload.removeFile}
         onUpload={handleUpload}
         onDragEnter={upload.handleFileDrag}
         onDragLeave={upload.handleFileDrag}
         onDragOver={upload.handleFileDrag}
         onDrop={upload.handleFileDrop}
         uploadButtonText="Upload"
         disabled={!docsPath}
       />
    </div>
  );
}
