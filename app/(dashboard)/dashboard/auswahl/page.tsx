"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useProject } from "@/context/ProjectContext";
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
import {
  PDF2MD_INDEX_FILE_NAME,
  normalizePath,
  fileTreeFetcher,
  FileTreeEntry,
} from "@/lib/fs/fileTreeUtils";
import type { FileSystemSettings } from "../einstellungen/page";
import { useUpload } from "@/hooks/use-upload";
import UploadDialog from "@/components/UploadDialog";

type FileTreeNode = FileTreeEntry;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Define reserved directory names
const reservedDirs = ["B", "archive", "md", "A"];

// Helper function to reset selections if they are affected by a path action
const resetSelectionsOnPathAction = (
  itemPath: string,
  currentSelectedProject: string | null,
  setCurrentSelectedProject: (path: string | null) => void,
  currentSelectedBieter: string | null,
  setCurrentSelectedBieter: (path: string | null) => void,
  currentSelectedDok: string | null,
  setCurrentSelectedDok: (path: string | null) => void
) => {
  if (currentSelectedDok && currentSelectedDok.startsWith(itemPath)) {
    setCurrentSelectedDok(null);
  }
  if (currentSelectedBieter && currentSelectedBieter.startsWith(itemPath)) {
    setCurrentSelectedBieter(null);
  }
  if (currentSelectedProject && currentSelectedProject === itemPath) {
    setCurrentSelectedProject(null);
    // If the project itself is acted upon, bieter and dok under it are also implicitly deselected.
    setCurrentSelectedBieter(null);
    setCurrentSelectedDok(null);
  } else if (
    currentSelectedProject &&
    itemPath.startsWith(currentSelectedProject)
  ) {
    // This case handles actions on items within the selected project (e.g., a Bieter)
    // No need to reset selectedProject here, only potentially bieter/dok
  }
};

export default function VaultPage() {
  const {
    selectedProject,
    setSelectedProject,
    selectedBieter,
    setSelectedBieter,
    selectedDok, // Assuming selectedDok is part of the context
    setSelectedDok, // Assuming setSelectedDok is part of the context
  } = useProject();
  const [showSettings, setShowSettings] = useState(false);

  const { data: fsSettings } = useSWR<FileSystemSettings>(
    "/api/settings?key=fileSystem",
    fetcher
  );

  const fileSystemConfig = useMemo(() => {
    if (!fsSettings || !fsSettings.type || !fsSettings.path) {
      return null;
    }
    return {
      type: fsSettings.type,
      basePath: fsSettings.path,
      noshowList: ["archive", ".archive"],
    };
  }, [fsSettings]);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState("Pb-Browser");

  // Context-sensitive navigation: Switch to Docs view when a document is selected
  useEffect(() => {
    if (selectedDok) {
      setSelectedView("Docs");
    }
  }, [selectedDok]);

  // State for Add Project Dialog
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // State & Handler für Add-Bieter-Dialog
  const [isAddBieterDialogOpen, setIsAddBieterDialogOpen] = useState(false);
  const [newBieterName, setNewBieterName] = useState("");

  // Upload dialog states
  const [isProjectUploadDialogOpen, setIsProjectUploadDialogOpen] = useState(false);
  const [isBieterUploadDialogOpen, setIsBieterUploadDialogOpen] = useState(false);
  const [isDocsUploadDialogOpen, setIsDocsUploadDialogOpen] = useState(false);
  
  // Consolidated upload hooks
  const projectUpload = useUpload({
    onSuccess: () => {
      setIsProjectUploadDialogOpen(false);
      mutate();
    },
    onError: (error) => {
      console.error('Project upload error:', error);
    }
  });
  
  const bieterUpload = useUpload({
    onSuccess: () => {
      setIsBieterUploadDialogOpen(false);
      mutateBieter();
    },
    onError: (error) => {
      console.error('Bieter upload error:', error);
    }
  });
  const handleCreateBieter = async () => {
    if (!newBieterName.trim() || !selectedProject) return;
    try {
      const params = new URLSearchParams({
        path: `${selectedProject}/B/${newBieterName}`,
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
    if (!selectedProject || !fileSystemConfig) return;

    const cleanedBieterPath = bieterPath.replace(/\/$/, ""); // remove trailing slash

    const lastSlashIndex = cleanedBieterPath.lastIndexOf('/');
    const bieterParentPath = cleanedBieterPath.substring(0, lastSlashIndex);
    const bieterName = cleanedBieterPath.substring(lastSlashIndex + 1);

    const destinationPath = `${bieterParentPath}/archive/${bieterName}`;

    try {
      // Ensure the archive directory exists
      const archiveDir = `${bieterParentPath}/archive`;
      const archiveDirParams = new URLSearchParams({ path: archiveDir });
      const archiveDirRes = await fetch(
        `/api/fs/mkdir?${archiveDirParams.toString()}`,
        {
          method: "POST",
        }
      );

      if (!archiveDirRes.ok && archiveDirRes.status !== 405) {
        // 405 is Method Not Allowed, often returned if dir exists
        console.warn(
          `Could not create bieter archive directory, proceeding anyway. Status: ${archiveDirRes.status}`
        );
      }

      const params = new URLSearchParams({
        path: cleanedBieterPath,
        destination: destinationPath,
      });
      const res = await fetch(`/api/fs/rename?${params.toString()}`, {
        method: "POST",
      });
      if (res.ok) {
        await mutateBieter();
        resetSelectionsOnPathAction(
          bieterPath,
          selectedProject,
          setSelectedProject,
          selectedBieter,
          setSelectedBieter,
          selectedDok,
          setSelectedDok
        );
      } else {
        console.error(
          "Archivieren des Bieters fehlgeschlagen:",
          await res.text()
        );
      }
    } catch (error) {
      console.error("Fehler beim Archivieren des Bieters:", error);
    }
  };
  // Neuer Handler: Bieter löschen via WebDAV-Delete
  const handleDeleteBieter = async (bieterPath: string) => {
    const params = new URLSearchParams({
      path: bieterPath,
    });
    const res = await fetch(`/api/fs/delete?${params.toString()}`, {
      method: "POST",
    });
    if (res.ok) {
      await mutateBieter();
      resetSelectionsOnPathAction(
        bieterPath,
        selectedProject,
        setSelectedProject,
        selectedBieter,
        setSelectedBieter,
        selectedDok,
        setSelectedDok
      );
    } else {
      console.error("Löschen des Bieters fehlgeschlagen:", await res.text());
    }
  };

  const {
    data: fileTree,
    error,
    mutate,
    isValidating,
  } = useSWR<FileTreeEntry[]>(
    fileSystemConfig
      ? [
          fileSystemConfig.basePath,
          {
            noshowList: fileSystemConfig.noshowList,
            fileSystemType: fileSystemConfig.type,
          },
        ]
      : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  // SWR hook for fetching Bieter data for the selected project
  // → jetzt mit mutateBieter, um Liste nach Erstellung neu zu laden
  const {
    data: bieterFolderChildrenRaw,
    error: bieterError,
    mutate: mutateBieter,
  } = useSWR<FileTreeEntry[]>(
    selectedProject && fileSystemConfig
      ? [
          `${selectedProject}/B`,
          {
            noshowList: fileSystemConfig.noshowList,
            fileSystemType: fileSystemConfig.type,
          },
        ]
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
    if (!newProjectName.trim() || !fileSystemConfig) return;
    try {
      const params = new URLSearchParams({
        path: `${fileSystemConfig.basePath}/${newProjectName}`,
      });
      const res = await fetch(`/api/fs/mkdir?${params.toString()}`, {
        method: "POST",
      });
      if (res.ok) {
        mutate(); // File-Tree neu laden
        await initdir(newProjectName, fileSystemConfig.basePath);
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
    if (!fileSystemConfig) return;

    const cleanedProjectPath = projectPath.replace(/\/$/, "");

    const lastSlashIndex = cleanedProjectPath.lastIndexOf('/');
    const parentDir = cleanedProjectPath.substring(0, lastSlashIndex);
    const projectName = cleanedProjectPath.substring(lastSlashIndex + 1);

    const destinationPath = `${parentDir}/archive/${projectName}`;

    try {
      const archiveDir = `${parentDir}/archive`;
      const archiveDirParams = new URLSearchParams({
        path: archiveDir,
      });
      const archiveDirRes = await fetch(
        `/api/fs/mkdir?${archiveDirParams.toString()}`,
        {
          method: "POST",
        }
      );

      if (!archiveDirRes.ok && archiveDirRes.status !== 405) {
        console.warn(
          `Could not create archive directory, proceeding anyway. Status: ${archiveDirRes.status}`
        );
      }

      // Proceed with the rename operation.
      const renameParams = new URLSearchParams({
        path: cleanedProjectPath,
        destination: destinationPath,
      });

      const renameRes = await fetch(
        `/api/fs/rename?${renameParams.toString()}`,
        {
          method: "POST",
        }
      );

      if (renameRes.ok) {
        mutate();
        resetSelectionsOnPathAction(
          projectPath,
          selectedProject,
          setSelectedProject,
          selectedBieter,
          setSelectedBieter,
          selectedDok,
          setSelectedDok
        );
        console.log(`Projekt "${projectName}" erfolgreich archiviert.`);
      } else {
        const errorText = await renameRes.text();
        console.error("Archivieren des Projekts fehlgeschlagen:", errorText);
      }
    } catch (error) {
      console.error("Fehler beim Archivieren des Projekts:", error);
    }
  };
  // Neuer Handler: Projekt löschen via WebDAV-Delete
  const handleDeleteProject = async (projectPath: string) => {
    const params = new URLSearchParams({
      path: projectPath,
    });
    const res = await fetch(`/api/fs/delete?${params.toString()}`, {
      method: "POST",
    });
    if (res.ok) {
      mutate();
      resetSelectionsOnPathAction(
        projectPath,
        selectedProject,
        setSelectedProject,
        selectedBieter,
        setSelectedBieter,
        selectedDok,
        setSelectedDok
      );
    } else {
      console.error("Löschen fehlgeschlagen:", await res.text());
    }
  };

  // Upload handlers using consolidated hooks
  const handleProjectUpload = () => {
    if (selectedProject) {
      projectUpload.upload(`${selectedProject}/A`);
    }
  };

  const handleBieterUpload = () => {
    if (selectedBieter) {
      bieterUpload.upload(selectedBieter);
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
              selectedView === "Pb-Browser" ? "bg-gray-200" : ""
            }`}
            onClick={() => {
              setSelectedView("Pb-Browser");
            }}>
            Projekt / Bieter
          </button>
          <button
            className={`px-3 py-1 border rounded ${
              selectedView === "Docs" ? "bg-gray-200" : ""
            }`}
            onClick={() => {
              setSelectedView("Docs");
            }}>
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
          {selectedView === "Docs" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDocsUploadDialogOpen(true)}
              disabled={!selectedProject && !selectedBieter}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          )}
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
          </DropdownMenu>{" "}
        </div>
      </div>



      {error ? (
        <div className="text-red-500">Error fetching file tree</div>
      ) : !fileTree ? (
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : selectedView === "Pb-Browser" ? (
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
                          </DialogClose>{" "}
                          <Button
                            onClick={handleCreateProject}
                            disabled={!newProjectName.trim()}>
                            Erstellen
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {/* Upload-Dialog für Projekt */}
                    {selectedProject && (
                      <>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setIsProjectUploadDialogOpen(true)}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <UploadDialog
                          open={isProjectUploadDialogOpen}
                          onOpenChange={setIsProjectUploadDialogOpen}
                          title="Dateien zu Projekt hinzufügen"
                          files={projectUpload.files}
                          uploading={projectUpload.uploading}
                          isDragging={projectUpload.isDragging}
                          onFilesChange={projectUpload.setFiles}
                          onRemoveFile={projectUpload.removeFile}
                          onUpload={handleProjectUpload}
                          onDragEnter={projectUpload.handleFileDrag}
                          onDragLeave={projectUpload.handleFileDrag}
                          onDragOver={projectUpload.handleFileDrag}
                          onDrop={projectUpload.handleFileDrop}
                          uploadButtonText={`Zu Projekt ${decodeURIComponent(
                            selectedProject.replace(/^\/klark0\//, "").split("/")[0]
                          )} hinzufügen`}
                          disabled={!selectedProject}
                        />
                      </>
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
                    .filter((node) => {
                      if (!fileSystemConfig) return false;
                      // Exclude the base path directory itself from the list
                      const basePathName = fileSystemConfig.basePath
                        .split("/")
                        .filter(Boolean)
                        .pop();
                      return (
                        node.type === "directory" &&
                        !reservedDirs.includes(node.name) &&
                        node.name !== basePathName
                      );
                    })
                    .map((project) => (
                      <li
                        key={project.path}
                        className={`py-2 px-3 border-b hover:bg-gray-50 flex justify-between items-center ${
                          selectedProject === project.path ? "bg-gray-100" : ""
                        }`}>
                        <span
                          className={`cursor-pointer flex-grow ${
                            selectedProject === project.path ? "font-bold" : ""
                          }`}
                          onClick={() => {
                            const isSame = selectedProject === project.path;
                            const raw = project.path
                              .replace(/^\/klark0\//, "")
                              .split("/")[0];
                            const projName = decodeURIComponent(raw);
                            if (isSame) {
                              setSelectedProject(null);
                              setSelectedBieter(null);
                              setSelectedDok(null); // Clear selectedDok
                            } else {
                              setSelectedProject(project.path);
                              setSelectedBieter(null);
                              setSelectedDok(null); // Clear selectedDok
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
                              <span className="sr-only">Projektoptionen</span>
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
            {selectedProject && (
              <Card className="rounded-lg shadow-lg w-1/2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-md font-medium">
                      Bieter für:{" "}
                      {decodeURIComponent(
                        selectedProject
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
                            disabled={!selectedProject}>
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
                              onChange={(e) => setNewBieterName(e.target.value)}
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
                      {selectedBieter && (
                        <>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setIsBieterUploadDialogOpen(true)}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <UploadDialog
                            open={isBieterUploadDialogOpen}
                            onOpenChange={setIsBieterUploadDialogOpen}
                            title="Dateien zu Bieter hinzufügen"
                            files={bieterUpload.files}
                            uploading={bieterUpload.uploading}
                            isDragging={bieterUpload.isDragging}
                            onFilesChange={bieterUpload.setFiles}
                            onRemoveFile={bieterUpload.removeFile}
                            onUpload={handleBieterUpload}
                            onDragEnter={bieterUpload.handleFileDrag}
                            onDragLeave={bieterUpload.handleFileDrag}
                            onDragOver={bieterUpload.handleFileDrag}
                            onDrop={bieterUpload.handleFileDrop}
                            uploadButtonText={`Zu Bieter ${decodeURIComponent(
                              selectedBieter.replace(/\/$/, "").split("/").pop()!
                            )} hinzufügen`}
                            disabled={!selectedBieter}
                          />
                        </>
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
                  ) : !bieterFolderChildrenRaw && selectedProject ? (
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
                            selectedBieter === bieter.path ? "bg-gray-100" : ""
                          }`}>
                          <span
                            className={`cursor-pointer flex-grow ${
                              selectedBieter === bieter.path ? "font-bold" : ""
                            }`}
                            onClick={() => {
                              const isSame = selectedBieter === bieter.path;
                              if (isSame) {
                                setSelectedBieter(null);
                                setSelectedDok(null); // Clear selectedDok
                              } else {
                                setSelectedBieter(bieter.path);
                                setSelectedDok(null); // Clear selectedDok
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
                                <span className="sr-only">Bieteroptionen</span>
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
      ) : (
        <DoksModule 
          isUploadDialogOpen={isDocsUploadDialogOpen}
          setIsUploadDialogOpen={setIsDocsUploadDialogOpen}
        />
      )}
    </section>
  );
}
