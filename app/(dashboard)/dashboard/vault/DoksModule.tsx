import { useState } from "react";
import { Loader2, MoreHorizontal, Folder } from "lucide-react";
import useSWR from "swr";
import { abstractFileSystemView, FileEntry } from "@/lib/fs/abstractFilesystem";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type Props = {
  projectPath: string | null;
  bieterPath: string | null;
  webdavSettings: Record<string, string | undefined> | null;
};

const fileTreeFetcher = async ([path, settings]: [string, Record<string, string | undefined>]) => {
  const query = new URLSearchParams({
    type: "webdav",
    path,
    host: settings?.host || "",
    username: settings?.username || "",
    password: settings?.password || "",
  });
  const res = await fetch(`/api/fs?${query.toString()}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid response");
  return abstractFileSystemView(data, { showHidden: false, noshowList: ["archive", ".archive"] });
};

export default function DoksModule({ projectPath, bieterPath, webdavSettings }: Props) {
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
  const toggleSelect = (path: string) => {
    setSelectedDocs(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };
  const handleDelete = (path: string) => console.log("Delete", path);
  const handleRename = (path: string) => console.log("Rename", path);

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
              .map((f: FileEntry) => (
                <tr
                  key={f.path}
                  onClick={() => toggleSelect(f.path)}
                  className={`cursor-pointer ${
                    selectedDocs.includes(f.path) ? "bg-gray-100" : ""
                  }`}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      {f.type === "directory" && (
                        <Folder className="mr-2 h-4 w-4" />
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
