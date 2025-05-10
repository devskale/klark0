"use client";

import { useState } from "react";
import useSWR from "swr";
import { abstractFileSystemView } from "@/lib/fs/abstractFilesystem";
// New shadcn UI imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// New Modal (Dialog) imports
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
// Import useSelectedProject from Sidebar context
import { useSelectedProject } from "@/components/ui/sidebar";

// --- Added for webdav support ---
function normalizePath(path: string) {
  return path.endsWith("/") ? path : path + "/";
}

const fileTreeFetcher = async ([currentPath, settings]: [
  string,
  Record<string, string | undefined>
]) => {
  const fileSystemConfig = {
    type: "webdav",
    basePath: "/klark0",
    noshowList: ["archive", ".archive"],
  };
  const queryParams = new URLSearchParams({
    type: fileSystemConfig.type,
    path: currentPath,
    host: settings.host || "",
    username: settings.username || "",
    password: settings.password || "",
  });
  const response = await fetch(`/api/fs?${queryParams.toString()}`);
  const data = await response.json();
  if (Array.isArray(data)) {
    const rawEntries = abstractFileSystemView(data, {
      showHidden: false,
      noshowList: fileSystemConfig.noshowList,
    });
    return rawEntries.filter(
      (entry) => normalizePath(entry.path) !== normalizePath(currentPath)
    );
  }
  throw new Error("Unexpected API response");
};

const fileSystemConfig = {
  type: "webdav",
  basePath: "/klark0",
  noshowList: ["archive", ".archive"],
};
// --- End of added section ---

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function aauswahl() {
  const { selectedProject, setSelectedProject } = useSelectedProject();
  const [newProjectName, setNewProjectName] = useState<string>("");
  const [importUrl, setImportUrl] = useState<string>("");
  const [importFile, setImportFile] = useState<File | null>(null);
  // New states for adding docs on an existing project
  const [docImportUrl, setDocImportUrl] = useState<string>("");
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);

  const { data: settings, error } = useSWR(
    "/api/settings?key=fileSystem",
    fetcher
  );
  const { data: webdavFileTree, error: fileTreeError } = useSWR(
    settings && settings.type === "webdav"
      ? [fileSystemConfig.basePath, settings]
      : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  if (error) {
    return <p>Fehler beim Laden der Einstellungen.</p>;
  }

  if (!settings) {
    return <p>Einstellungen werden geladen...</p>;
  }

  const selectedFilesystem = settings.type || "unknown";
  const protoProjects = [
    "Project Alpha",
    "Project Beta",
    "Project Gamma",
    "Project Delta",
    "Project Epsilon",
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Vergabeprojekt Auswahl</h1>
      {selectedFilesystem === "proto" ? (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Bestehendes Projekt wählen
              </h2>
              {/* Replace the project creation dialog with only project name input */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-10 h-10 rounded-full">
                    +
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Neues Projekt erstellen</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Projektnamen eingeben"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        /* project creation handler */
                      }}>
                      Projekt erstellen
                    </Button>
                  </DialogFooter>
                  <DialogClose />
                </DialogContent>
              </Dialog>
            </div>
            <Select
              value={selectedProject || ""}
              onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Projekt auswählen" />
              </SelectTrigger>
              <SelectContent>
                {protoProjects.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProject && (
              <>
                <p className="text-green-600">
                  Gewähltes Projekt: {selectedProject}
                </p>
                {/* Modal for "Dokumente hinzufügen" with file upload card */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                      Vergabe Doks hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Vergabe Doks hinzufügen</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        type="text"
                        placeholder="Dokumente von URL importieren"
                        value={docImportUrl}
                        onChange={(e) => setDocImportUrl(e.target.value)}
                      />
                      {/* New file upload card */}
                      <div
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
                        onClick={() =>
                          document.getElementById("hiddenFileInput")?.click()
                        }
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            setDocUploadFile(e.dataTransfer.files[0]);
                          }
                        }}>
                        <p className="text-sm text-gray-600">
                          Drag and drop files here, or click to upload
                        </p>
                        <input
                          id="hiddenFileInput"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setDocUploadFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          /* add documents handler */
                        }}>
                        Hinzufügen
                      </Button>
                    </DialogFooter>
                    <DialogClose />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </section>
        </>
      ) : selectedFilesystem === "webdav" ? (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Bestehendes Projekt wählen (WebDAV)
              </h2>
              {/* For webdav, project creation dialog only asks for project name */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-10 h-10 rounded-full">
                    +
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Neues Projekt erstellen</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Projektnamen eingeben"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        /* project creation handler */
                      }}>
                      Projekt erstellen
                    </Button>
                  </DialogFooter>
                  <DialogClose />
                </DialogContent>
              </Dialog>
            </div>
            {fileTreeError ? (
              <p className="text-red-600">Error fetching projects</p>
            ) : !webdavFileTree ? (
              <p>Projekte werden geladen...</p>
            ) : (
              <Select
                value={selectedProject || ""}
                onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Projekt auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {webdavFileTree
                    .filter((entry) => entry.type === "directory")
                    .map((entry) => (
                      <SelectItem key={entry.path} value={entry.name}>
                        {entry.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            {selectedProject && (
              <>
                <p className="text-green-600">
                  Gewähltes Projekt: {selectedProject}
                </p>
                {/* Modal for "Dokumente hinzufügen" with file upload card */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                      Vergabe Doks hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Vergabe Doks hinzufügen</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        type="text"
                        placeholder="Dokumente von URL importieren"
                        value={docImportUrl}
                        onChange={(e) => setDocImportUrl(e.target.value)}
                      />
                      {/* New file upload card */}
                      <div
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
                        onClick={() =>
                          document.getElementById("hiddenFileInput")?.click()
                        }
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            setDocUploadFile(e.dataTransfer.files[0]);
                          }
                        }}>
                        <p className="text-sm text-gray-600">
                          Drag and drop files here, or click to upload
                        </p>
                        <input
                          id="hiddenFileInput"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setDocUploadFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          /* add documents handler */
                        }}>
                        Hinzufügen
                      </Button>
                    </DialogFooter>
                    <DialogClose />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </section>
        </>
      ) : (
        <p>Unsupported filesystem selected.</p>
      )}
    </div>
  );
}
