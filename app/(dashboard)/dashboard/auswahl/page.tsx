"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Menu,
  RefreshCw,
  MoreHorizontal,
  Plus,
  Upload,
} from "lucide-react";
import { abstractFileSystemView, FileEntry } from "@/lib/fs/abstractFilesystem";
import { initdir } from "@/lib/fs/initdir"; // Added initdir for Directory-Scaffolding
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSelectedProject } from "@/components/ui/sidebar"; // Assuming this is the correct path and hook
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import DoksModule from "./DoksModule"; // <-- new import
import DateibrowserModule from "./DateibrowserModule";

type FileTreeNode = FileEntry;

// Utility to normalize paths (ensure trailing slash)
function normalizePath(path: string) {
  return path.endsWith("/") ? path : path + "/";
}

// SWR hook for caching file tree:
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

// Define reserved directory names
const reservedDirs = ["B", "archive", "md"];

export default function VaultPage() {
  const [webdavSettings, setWebdavSettings] = useState<Record<
    string,
    string | undefined
  > | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState("Op-Browser");

  // Local state for selections within VaultPage UI
  const [currentProjectInVault, setCurrentProjectInVault] = useState<
    string | null
  >(null);
  const [currentBieterInVault, setCurrentBieterInVault] = useState<
    string | null
  >(null);

  // Global context setters
  const {
    setSelectedProject: setGlobalSelectedProject,
    setSelectedBieter: setGlobalSelectedBieter,
  } = useSelectedProject();

  // State for Add Project Dialog
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // State & Handler für Add-Bieter-Dialog
  const [isAddBieterDialogOpen, setIsAddBieterDialogOpen] = useState(false);
  const [newBieterName, setNewBieterName] = useState("");

  // Upload-Dialog States
  const [isProjectUploadDialogOpen, setIsProjectUploadDialogOpen] =
    useState(false);
  const [projectUploadFiles, setProjectUploadFiles] = useState<File[]>([]);
  const [isBieterUploadDialogOpen, setIsBieterUploadDialogOpen] =
    useState(false);
  const [bieterUploadFiles, setBieterUploadFiles] = useState<File[]>([]);
  const [uploadingProject, setUploadingProject] = useState(false);
  const [uploadingBieter, setUploadingBieter] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingProject, setIsDraggingProject] = useState(false);
  const [isDraggingBieter, setIsDraggingBieter] = useState(false);

  const handleCreateBieter = async () => {
    if (!newBieterName.trim() || !webdavSettings || !currentProjectInVault)
      return;
    try {
      const params = new URLSearchParams({
        type: fileSystemConfig.type,
        path: `${currentProjectInVault}/B/${newBieterName}`,
        host: webdavSettings.host || "",
        username: webdavSettings.username || "",
        password: webdavSettings.password || "",
      });
      const res = await fetch(`/api/fs/mkdir?${params.toString()}`, {
        method: "POST",
      });
      if (res.ok) {
        // Bieter-Liste neu laden:
        await mutateBieter();
      } else {
        console.error("Fehler beim Erstellen des Bieters:", await res.text());
      }
    } catch (error) {
      console.error("Fehler beim Erstellen des Bieters:", error);
    }
    setNewBieterName("");
    setIsAddBieterDialogOpen(false);
  };

  // Neuer Handler: Bieter archivieren via WebDAV-Rename
  const handleArchiveBieter = async (bieterPath: string) => {
    if (!webdavSettings) return;
    const bieterName = decodeURIComponent(
      bieterPath.replace(/\/$/, "").split("/").pop() || ""
    );
    const params = new URLSearchParams({
      type: fileSystemConfig.type,
      path: bieterPath,
      destination: `${currentProjectInVault}/B/archive/${bieterName}`,
      host: webdavSettings.host || "",
      username: webdavSettings.username || "",
      password: webdavSettings.password || "",
    });
    const res = await fetch(`/api/fs/rename?${params.toString()}`, {
      method: "POST",
    });
    if (res.ok) await mutateBieter();
    else
      console.error(
        "Archivieren des Bieters fehlgeschlagen:",
        await res.text()
      );
  };

  // Neuer Handler: Bieter löschen via WebDAV-Delete
  const handleDeleteBieter = async (bieterPath: string) => {
    if (!webdavSettings) return;
    const params = new URLSearchParams({
      type: fileSystemConfig.type,
      path: bieterPath,
      host: webdavSettings.host || "",
      username: webdavSettings.username || "",
      password: webdavSettings.password || "",
    });
    const res = await fetch(`/api/fs/delete?${params.toString()}`, {
      method: "POST",
    });
    if (res.ok) await mutateBieter();
    else
      console.error("Löschen des Bieters fehlgeschlagen:", await res.text());
  };

  const fileSystemConfig = {
    type: "webdav",
    basePath: "/klark0",
    noshowList: ["archive", ".archive"],
  };

  const fetchWebdavSettings = async () => {
    try {
      const response = await fetch(`/api/settings?key=fileSystem`);
      const data = await response.json();
      console.log("Fetched filesystem settings:", data);
      if (data.type === fileSystemConfig.type) {
        setWebdavSettings(data);
      } else {
        console.error("Configured filesystem type mismatch:", data);
        setWebdavSettings(null);
      }
    } catch (error) {
      console.error("Error fetching filesystem settings:", error);
      setWebdavSettings(null);
    }
  };

  useEffect(() => {
    fetchWebdavSettings();
  }, []);

  const {
    data: fileTree,
    error,
    mutate,
    isValidating,
  } = useSWR(
    webdavSettings ? [fileSystemConfig.basePath, webdavSettings] : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  // SWR hook for fetching Bieter data for the selected project
  // → jetzt mit mutateBieter, um Liste nach Erstellung neu zu laden
  const {
    data: bieterFolderChildrenRaw,
    error: bieterError,
    mutate: mutateBieter,
  } = useSWR(
    webdavSettings && currentProjectInVault
      ? [`${currentProjectInVault}/B`, webdavSettings]
      : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  const filteredBieterChildren = Array.isArray(bieterFolderChildrenRaw)
    ? bieterFolderChildrenRaw.filter(
        (child) =>
          child.type === "directory" && !reservedDirs.includes(child.name)
      )
    : [];

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !webdavSettings) return;
    try {
      const params = new URLSearchParams({
        type: fileSystemConfig.type,
        path: `${fileSystemConfig.basePath}/${newProjectName}`,
        host: webdavSettings.host || "",
        username: webdavSettings.username || "",
        password: webdavSettings.password || "",
      });
      const res = await fetch(`/api/fs/mkdir?${params.toString()}`, {
        method: "POST",
      });
      if (res.ok) {
        mutate(); // File-Tree neu laden
        await initdir(newProjectName, fileSystemConfig.basePath, webdavSettings);
        setNewProjectName("");
        setIsAddProjectDialogOpen(false);
      } else {
        console.error("Projekt erstellen fehlgeschlagen:", await res.text());
      }
    } catch (error) {
      console.error("Fehler beim Erstellen des Projekts:", error);
    }
  };

  // Neuer Handler: Projekt archivieren via WebDAV-Rename
  const handleArchiveProject = async (projectPath: string) => {
    if (!webdavSettings) return;
    const projectName = decodeURIComponent(
      projectPath.replace(/^\/klark0\//, "").split("/")[0]
    );
    const params = new URLSearchParams({
      type: fileSystemConfig.type,
      path: projectPath,
      destination: `${fileSystemConfig.basePath}/archive/${projectName}`,
      host: webdavSettings.host || "",
      username: webdavSettings.username || "",
      password: webdavSettings.password || "",
    });
    const res = await fetch(`/api/fs/rename?${params.toString()}`, {
      method: "POST",
    });
    if (res.ok) mutate();
    else console.error("Archivieren fehlgeschlagen:", await res.text());
  };

  // Neuer Handler: Projekt löschen via WebDAV-Delete
  const handleDeleteProject = async (projectPath: string) => {
    if (!webdavSettings) return;
    const params = new URLSearchParams({
      type: fileSystemConfig.type,
      path: projectPath,
      host: webdavSettings.host || "",
      username: webdavSettings.username || "",
      password: webdavSettings.password || "",
    });
    const res = await fetch(`/api/fs/delete?${params.toString()}`, {
      method: "POST",
    });
    if (res.ok) mutate();
    else console.error("Löschen fehlgeschlagen:", await res.text());
  };

  // Verbesserte Handler für Drag & Drop
  const handleProjectFileDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDraggingProject(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setIsDraggingProject(false);
    }
  };

  const handleProjectFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingProject(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setProjectUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleBieterFileDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDraggingBieter(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setIsDraggingBieter(false);
    }
  };

  const handleBieterFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBieter(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setBieterUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleProjectUpload = async () => {
    if (!projectUploadFiles.length || !webdavSettings || !currentProjectInVault)
      return;

    setUploadingProject(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      projectUploadFiles.forEach((file) => {
        formData.append("files", file);
      });

      // Modifiziert, um in den A-Unterordner hochzuladen (für Projekt/Ausschreibungsdaten)
      const uploadPath = `${currentProjectInVault}/A`;

      const queryParams = new URLSearchParams({
        type: fileSystemConfig.type,
        path: uploadPath,
        host: webdavSettings.host || "",
        username: webdavSettings.username || "",
        password: webdavSettings.password || "",
      });

      const response = await fetch(`/api/fs/upload?${queryParams.toString()}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Upload erfolgreich
      setUploadSuccess(`${projectUploadFiles.length} Dateien hochgeladen`);
      setTimeout(() => setUploadSuccess(null), 3000);
      setProjectUploadFiles([]);
      setIsProjectUploadDialogOpen(false);

      // Optional: Tree neu laden falls notwendig
      await mutate();
    } catch (error) {
      console.error("Fehler beim Upload:", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler beim Upload"
      );
    } finally {
      setUploadingProject(false);
    }
  };

  const handleBieterUpload = async () => {
    if (!bieterUploadFiles.length || !webdavSettings || !currentBieterInVault)
      return;

    setUploadingBieter(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      bieterUploadFiles.forEach((file) => {
        formData.append("files", file);
      });

      const queryParams = new URLSearchParams({
        type: fileSystemConfig.type,
        path: currentBieterInVault,
        host: webdavSettings.host || "",
        username: webdavSettings.username || "",
        password: webdavSettings.password || "",
      });

      const response = await fetch(`/api/fs/upload?${queryParams.toString()}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Upload erfolgreich
      setUploadSuccess(`${bieterUploadFiles.length} Dateien hochgeladen`);
      setTimeout(() => setUploadSuccess(null), 3000);
      setBieterUploadFiles([]);
      setIsBieterUploadDialogOpen(false);

      // Bieter-Liste bzw. Dateiliste neu laden
      await mutateBieter();
    } catch (error) {
      console.error("Fehler beim Upload:", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler beim Upload"
      );
    } finally {
      setUploadingBieter(false);
    }
  };

  const handleProjectAction = (action: string, projectPath: string) => {
    console.log(`Project Action: ${action} on ${projectPath}`);
    // Implement actual logic for edit, archive, stats
  };

  const handleBieterAction = (action: string, bieterPath: string) => {
    console.log(`Bieter Action: ${action} on ${bieterPath}`);
    // Implement actual logic for edit, archive, stats
  };

  return (
    <section className="p-4">
      <div className="flex justify-between items-center mb-4">
        {/* MenuBar for view selection */}
        <div className="flex space-x-4">
          <button
            className={`px-3 py-1 border rounded ${
              selectedView === "Dateibrowser" ? "bg-gray-200" : ""
            }`}
            onClick={() => setSelectedView("Dateibrowser")}>
            Dateibrowser
          </button>
          <button
            className={`px-3 py-1 border rounded ${
              selectedView === "Op-Browser" ? "bg-gray-200" : ""
            }`}
            onClick={() => setSelectedView("Op-Browser")}>
            Op-Browser
          </button>
          <button
            className={`px-3 py-1 border rounded ${
              selectedView === "Docs" ? "bg-gray-200" : ""
            }`}
            onClick={() => setSelectedView("Docs")}>
            Docs
          </button>
        </div>
        {/* Inline refresh and settings */}
        <div className="flex items-center space-x-2">
          <button
            className="p-2 focus:outline-none hover:bg-gray-200 rounded-md"
            onClick={() => {
              setRefreshing(true);
              mutate().finally(() => {
                setRefreshing(false);
                setShowRefreshMessage(true);
                setTimeout(() => setShowRefreshMessage(false), 1500);
              });
            }}
            title="Refresh File Tree">
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
          {showRefreshMessage && (
            <div className="text-green-500 text-xs self-center">
              neu eingelesen
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="p-2 focus:outline-none hover:bg-gray-200 rounded-md">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menü öffnen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Optionen</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setShowSettings((prev) => !prev)}>
                Server Info {showSettings ? "ausblenden" : "anzeigen"}
              </DropdownMenuItem>
              <Dialog
                open={isAddProjectDialogOpen}
                onOpenChange={setIsAddProjectDialogOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    {/* Prevent default to control dialog manually */}
                    Projekt hinzufügen
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Neues Projekt hinzufügen</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input
                      type="text"
                      placeholder="Projektname"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Abbrechen</Button>
                    </DialogClose>
                    <Button
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim()}>
                      Erstellen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showSettings && webdavSettings && (
        <div className="mb-4 p-4 border rounded bg-gray-100">
          <h2 className="text-md font-medium mb-2">Filesystem Settings</h2>
          <pre className="text-sm text-gray-700">
            {JSON.stringify(webdavSettings, null, 2)}
          </pre>
        </div>
      )}

      {uploadSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 text-green-800 p-3 rounded-md shadow-md z-50">
          {uploadSuccess}
        </div>
      )}

      {uploadError && (
        <div className="fixed top-4 right-4 bg-red-100 text-red-800 p-3 rounded-md shadow-md z-50">
          {uploadError}
        </div>
      )}

      {error ? (
        <div className="text-red-500">Error fetching file tree</div>
      ) : !fileTree ? (
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : selectedView === "Op-Browser" ? (
        <>
          <div className="flex space-x-4">
            {/* Left Card: Ausschreibungen */}
            <Card className="rounded-lg shadow-lg w-1/2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-md font-medium">Ausschreibungen</h2>
                  <div className="flex items-center space-x-2">
                    <Dialog
                      open={isAddProjectDialogOpen}
                      onOpenChange={setIsAddProjectDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Neues Projekt erstellen</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Input
                            type="text"
                            placeholder="Projektname"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                          />
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Abbrechen</Button>
                          </DialogClose>
                          <Button
                            onClick={handleCreateProject}
                            disabled={
                              !newProjectName.trim() || !webdavSettings
                            }>
                            Erstellen
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {/* Upload-Dialog für Projekt */}
                    {currentProjectInVault && (
                      <Dialog
                        open={isProjectUploadDialogOpen}
                        onOpenChange={setIsProjectUploadDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Upload className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              Dateien zu Projekt hinzufügen
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div
                              className={`border-2 ${
                                isDraggingProject
                                  ? "border-primary"
                                  : "border-dashed"
                              } p-4 rounded-md text-center cursor-pointer relative`}
                              onDragEnter={handleProjectFileDrag}
                              onDragOver={handleProjectFileDrag}
                              onDragLeave={handleProjectFileDrag}
                              onDrop={handleProjectFileDrop}
                              onClick={() =>
                                document
                                  .getElementById("project-file-upload")
                                  ?.click()
                              }>
                              <input
                                id="project-file-upload"
                                type="file"
                                multiple
                                className="sr-only"
                                onChange={(e) =>
                                  setProjectUploadFiles(
                                    Array.from(e.target.files || [])
                                  )
                                }
                              />
                              <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                              <p className="mb-1 text-sm text-gray-600">
                                Dateien hier ablegen oder{" "}
                                <span className="text-primary font-medium">
                                  klicken
                                </span>{" "}
                                zum Auswählen
                              </p>
                              <p className="text-xs text-gray-500">
                                Unterstützt werden alle Dateitypen
                              </p>
                            </div>
                            {projectUploadFiles.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">
                                  Ausgewählte Dateien (
                                  {projectUploadFiles.length}):
                                </p>
                                <ul className="text-sm max-h-40 overflow-y-auto border rounded-md p-2">
                                  {projectUploadFiles.map((f) => (
                                    <li
                                      key={f.name}
                                      className="py-1 border-b last:border-0 flex justify-between">
                                      <span className="truncate mr-2">
                                        {f.name}
                                      </span>
                                      <span className="text-gray-400 text-xs">
                                        {(f.size / 1024).toFixed(1)} KB
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => setProjectUploadFiles([])}>
                                  Auswahl zurücksetzen
                                </Button>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Abbrechen</Button>
                            </DialogClose>
                            <Button
                              onClick={handleProjectUpload}
                              disabled={
                                projectUploadFiles.length === 0 ||
                                uploadingProject
                              }>
                              {uploadingProject ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  Zu Projekt{" "}
                                  {decodeURIComponent(
                                    currentProjectInVault
                                      .replace(/^\/klark0\//, "")
                                      .split("/")[0]
                                  )}{" "}
                                  hinzufügen
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Menu />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* actions to come */}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul>
                  {fileTree
                    .filter(
                      (node) =>
                        node.type === "directory" &&
                        !reservedDirs.includes(node.name)
                    )
                    .map((project) => (
                      <li
                        key={project.path}
                        className={`py-2 px-3 border-b hover:bg-gray-50 flex justify-between items-center ${
                          currentProjectInVault === project.path
                            ? "bg-gray-100"
                            : ""
                        }`}>
                        <span
                          className={`cursor-pointer flex-grow ${
                            currentProjectInVault === project.path
                              ? "font-bold"
                              : ""
                          }`}
                          onClick={() => {
                            const isSame =
                              currentProjectInVault === project.path;
                            const raw = project.path
                              .replace(/^\/klark0\//, "")
                              .split("/")[0];
                            const projName = decodeURIComponent(raw);
                            if (isSame) {
                              setCurrentProjectInVault(null);
                              setCurrentBieterInVault(null);
                              setGlobalSelectedProject("");
                              setGlobalSelectedBieter("");
                            } else {
                              setCurrentProjectInVault(project.path);
                              setCurrentBieterInVault(null);
                              setGlobalSelectedProject(projName);
                              setGlobalSelectedBieter("");
                            }
                          }}>
                          {project.name}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-2 h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">
                                Projektoptionen
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onSelect={() =>
                                handleProjectAction("edit", project.path)
                              }>
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                handleArchiveProject(project.path)
                              }>
                              Archivieren
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                handleDeleteProject(project.path)
                              }>
                              Löschen
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() =>
                                handleProjectAction("stats", project.path)
                              }>
                              Statistiken
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>

            {/* Right Card: Bieter */}
            {currentProjectInVault && (
              <Card className="rounded-lg shadow-lg w-1/2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-md font-medium">
                      Bieter für:{" "}
                      {decodeURIComponent(
                        currentProjectInVault
                          ?.replace(/^\/klark0\//, "")
                          .split("/")[0] || "Ausgewähltes Projekt"
                      )}
                    </h2>
                    <div className="flex items-center space-x-2">
                      {/* Dialog um den '+'-Button */}
                      <Dialog
                        open={isAddBieterDialogOpen}
                        onOpenChange={setIsAddBieterDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={!currentProjectInVault}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Neuen Bieter hinzufügen</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Input
                              type="text"
                              placeholder="Bietername"
                              value={newBieterName}
                              onChange={(e) =>
                                setNewBieterName(e.target.value)
                              }
                            />
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Abbrechen</Button>
                            </DialogClose>
                            <Button
                              onClick={handleCreateBieter}
                              disabled={!newBieterName.trim()}>
                              Erstellen
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {/* Upload-Dialog für Bieter */}
                      {currentBieterInVault && (
                        <Dialog
                          open={isBieterUploadDialogOpen}
                          onOpenChange={setIsBieterUploadDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Upload className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Dateien zu Bieter hinzufügen
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div
                                className={`border-2 ${
                                  isDraggingBieter
                                    ? "border-primary"
                                    : "border-dashed"
                                } p-4 rounded-md text-center cursor-pointer relative`}
                                onDragEnter={handleBieterFileDrag}
                                onDragOver={handleBieterFileDrag}
                                onDragLeave={handleBieterFileDrag}
                                onDrop={handleBieterFileDrop}
                                onClick={() =>
                                  document
                                    .getElementById("bieter-file-upload")
                                    ?.click()
                                }>
                                <input
                                  id="bieter-file-upload"
                                  type="file"
                                  multiple
                                  className="sr-only"
                                  onChange={(e) =>
                                    setBieterUploadFiles(
                                      Array.from(e.target.files || [])
                                    )
                                  }
                                />
                                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                                <p className="mb-1 text-sm text-gray-600">
                                  Dateien hier ablegen oder{" "}
                                  <span className="text-primary font-medium">
                                    klicken
                                  </span>{" "}
                                  zum Auswählen
                                </p>
                                <p className="text-xs text-gray-500">
                                  Unterstützt werden alle Dateitypen
                                </p>
                              </div>
                              {bieterUploadFiles.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">
                                    Ausgewählte Dateien (
                                    {bieterUploadFiles.length}):
                                  </p>
                                  <ul className="text-sm max-h-40 overflow-y-auto border rounded-md p-2">
                                    {bieterUploadFiles.map((f) => (
                                      <li
                                        key={f.name}
                                        className="py-1 border-b last:border-0 flex justify-between">
                                        <span className="truncate mr-2">
                                          {f.name}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                          {(f.size / 1024).toFixed(1)} KB
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => setBieterUploadFiles([])}>
                                    Auswahl zurücksetzen
                                  </Button>
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Abbrechen</Button>
                              </DialogClose>
                              <Button
                                onClick={handleBieterUpload}
                                disabled={
                                  bieterUploadFiles.length === 0 ||
                                  uploadingBieter
                                }>
                                {uploadingBieter ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    Zu Bieter{" "}
                                    {decodeURIComponent(
                                      currentBieterInVault
                                        .replace(/\/$/, "")
                                        .split("/")
                                        .pop()!
                                    )}{" "}
                                    hinzufügen
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Menu />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* actions to come */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {bieterError ? (
                    <div className="text-red-500">
                      Error fetching bieter list.
                    </div>
                  ) : !bieterFolderChildrenRaw && currentProjectInVault ? (
                    <div className="flex items-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="ml-2 text-sm">Lade Bieter...</span>
                    </div>
                  ) : filteredBieterChildren.length > 0 ? (
                    <ul>
                      {filteredBieterChildren.map((bieter) => (
                        <li
                          key={bieter.path}
                          className={`py-2 px-3 border-b hover:bg-gray-50 flex justify-between items-center ${
                            currentBieterInVault === bieter.path
                              ? "bg-gray-100"
                              : ""
                          }`}>
                          <span
                            className={`cursor-pointer flex-grow ${
                              currentBieterInVault === bieter.path
                                ? "font-bold"
                                : ""
                            }`}
                            onClick={() => {
                              const isSame =
                                currentBieterInVault === bieter.path;
                              if (isSame) {
                                setCurrentBieterInVault(null);
                                setGlobalSelectedBieter("");
                              } else {
                                setCurrentBieterInVault(bieter.path);
                                const name = decodeURIComponent(
                                  bieter.path
                                    .replace(/\/$/, "")
                                    .split("/")
                                    .pop() || ""
                                );
                                setGlobalSelectedBieter(name);
                              }
                            }}>
                            {bieter.name}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="ml-2 h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">
                                  Bieteroptionen
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                onSelect={() =>
                                  handleBieterAction("edit", bieter.path)
                                }>
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() =>
                                  handleArchiveBieter(bieter.path)
                                }>
                                Archivieren
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() =>
                                  handleDeleteBieter(bieter.path)
                                }>
                                Löschen
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() =>
                                  handleBieterAction("stats", bieter.path)
                                }>
                                Statistiken
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Leer.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : selectedView === "Docs" ? (
        // when Docs-tab is active, render the new module
        <DoksModule
          projectPath={currentProjectInVault}
          bieterPath={currentBieterInVault}
          webdavSettings={webdavSettings}
        />
      ) : (
        <DateibrowserModule
          fileTree={fileTree}
          basePath={fileSystemConfig.basePath}
        />
      )}
    </section>
  );
}
