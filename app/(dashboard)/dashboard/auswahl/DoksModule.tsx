"use client";
import { useState, useEffect } from "react";
import { Loader2, MoreHorizontal, Folder, FileText, Image } from "lucide-react";
import useSWR from "swr";
import { abstractFileSystemView, FileEntry } from "@/lib/fs/abstractFilesystem";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useProject } from "@/context/ProjectContext";

const PDF2MD_INDEX_FILE_NAME = ".pdf2md_index.json";

// Utility to normalize paths (ensure trailing slash)
function normalizePath(path: string) {
  return path.endsWith("/") ? path : path + "/";
}

export default function DoksModule({
  webdavSettings,
}: {
  webdavSettings: Record<string, string | undefined> | null;
}) {
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

  const { data: docs, error } = useSWR(
    docsPath && webdavSettings ? [docsPath, webdavSettings] : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // clear selection on project/bieter change
  useEffect(() => {
    setSelectedDocs([]);
    setSelectedDok(null);
  }, [projectPath, bieterPath, setSelectedDok]);

  const toggleSelect = (path: string) => {
    setSelectedDocs(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
    const wasSelected = selectedDocs.includes(path);
    setSelectedDok(wasSelected ? null : path);
  };
  const handleDelete = (path: string) => console.log("Delete", path);
  const handleRename = (path: string) => console.log("Rename", path);

  // pick an icon based on file extension
  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="mr-2 h-4 w-4 text-red-500" />;
    if (ext && ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext))
      return <FileText className="mr-2 h-4 w-4 text-blue-500" />;
    if (ext && ["png", "jpg", "jpeg", "gif", "svg"].includes(ext))
      return <Image className="mr-2 h-4 w-4 text-green-500" />;
    return <FileText className="mr-2 h-4 w-4 text-gray-500" />;
  };

  if (!projectPath) {
    return <p className="text-sm text-gray-500">Bitte zuerst ein Projekt auswählen.</p>;
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
      <h2 className="text-md font-medium mb-2">Dokumente</h2>

      {docs && docs.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Größe
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {docs
              .filter(f => f.path !== docsPath)
              .map((f: FileEntry & { hasParser?: boolean }) => (
                <tr
                  key={f.path}
                  className={`cursor-pointer ${
                    selectedDocs.includes(f.path) ? "bg-gray-100" : ""
                  }`}
                  onClick={() => toggleSelect(f.path)}
                >
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      {f.type === "directory"
                        ? <Folder className="mr-2 h-4 w-4" />
                        : getFileIcon(f.name)}
                      {f.type === 'file' && f.hasParser && (
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2" title="Parser vorhanden"></span>
                      )}
                      {f.name}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {f.type === "file" && f.size ? `${f.size} bytes` : "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
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
        <p className="text-sm text-gray-500">Keine Dokumente gefunden.</p>
      )}
    </div>
  );
}

async function fileTreeFetcher(
  [path, settings]: [string, Record<string, string | undefined>]
): Promise<(FileEntry & { hasParser?: boolean })[]> {
  const fileSystemConfig = {
    type: "webdav",
    noshowList: ["archive", ".archive"],
  };

  // Fetch directory listing
  const query = new URLSearchParams({
    type: fileSystemConfig.type,
    path,
    host: settings?.host || "",
    username: settings?.username || "",
    password: settings?.password || "",
  });
  const res = await fetch(`/api/fs?${query.toString()}`);
  const dirData = await res.json();

  let parserIndex: Record<string, boolean> = {};
  const indexFilePath = normalizePath(path) + PDF2MD_INDEX_FILE_NAME;

  const indexFileQuery = new URLSearchParams({
    type: fileSystemConfig.type,
    path: indexFilePath,
    host: settings?.host || "",
    username: settings?.username || "",
    password: settings?.password || "",
  });

  try {
    const indexResponse = await fetch(`/api/fs?${indexFileQuery.toString()}`);
    if (indexResponse.ok) {
      const indexJson = await indexResponse.json();
      if (indexJson && Array.isArray(indexJson.files)) {
        for (const fileInfo of indexJson.files) {
          if (typeof fileInfo.name === 'string' && fileInfo.name && fileInfo.parsers &&
              ((Array.isArray(fileInfo.parsers.det) && fileInfo.parsers.det.length > 0) ||
               (typeof fileInfo.parsers.default === 'string' && fileInfo.parsers.default !== ''))) {
            parserIndex[fileInfo.name] = true;
          }
        }
      } else {
        console.warn(`Index file ${indexFilePath} content is not in expected format:`, indexJson);
      }
    } else {
      console.warn(`Failed to fetch index file ${indexFilePath}: ${indexResponse.status} ${indexResponse.statusText}`);
    }
  } catch (e) {
    console.warn(`Could not fetch or parse index file ${indexFilePath}:`, e);
  }

  if (!Array.isArray(dirData)) throw new Error("Invalid response for directory listing");
  
  const rawEntries = abstractFileSystemView(dirData, { 
    showHidden: false, 
    noshowList: fileSystemConfig.noshowList 
  });

  const entriesWithParsers = rawEntries.map(entry => {
    const hasParserValue = entry.type === 'file' && parserIndex[entry.name] === true;
    return {
      ...entry,
      hasParser: hasParserValue,
    };
  });
  
  return entriesWithParsers;
}
