"use client";
import { useState, useEffect } from "react";
import { Loader2, MoreHorizontal, Folder, FileText, Image } from "lucide-react";
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

export default function DoksModule({
  webdavSettings,
}: {
  webdavSettings: FileSystemSettings | null;
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

  const { data: docs, error } = useSWR<FileTreeEntry[]>(
    docsPath && webdavSettings
      ? [
          docsPath,
          webdavSettings,
          { noshowList: ["archive", ".archive"], fileSystemType: "webdav" },
        ]
      : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [metadataMap, setMetadataMap] = useState<Record<string, any>>({});

  // clear selection on project/bieter change
  useEffect(() => {
    setSelectedDocs([]);
    setSelectedDok(null);
  }, [projectPath, bieterPath, setSelectedDok]);

  // clear and fetch index metadata when docs or settings change
  useEffect(() => {
    if (docs && webdavSettings && docsPath) {
      const fetchIndexMeta = async () => {
        // build index side-car path
        const indexSidecar = `${docsPath.replace(/\/$/, "")}/.pdf2md_index.json`;
        const params = new URLSearchParams({
          path: indexSidecar,
          type: "webdav",
          host: webdavSettings.host,
          username: webdavSettings.username,
          password: webdavSettings.password,
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
          .filter(f => f.type === "file")
          .forEach(f => {
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
  }, [docs, webdavSettings, docsPath]);

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
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategorie
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {docs
              .filter(f => f.path !== docsPath)
              .map((f: FileTreeEntry) => (
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
                      {metadataMap[f.path]?.name ?? f.name}
                      {f.type === 'file' && f.hasParser && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-800">
                          struct
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {f.parserStatus || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {metadataMap[f.path]?.kategorie ?? "-"}
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
