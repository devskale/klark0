"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Loader2, Menu, RefreshCw, MoreHorizontal } from "lucide-react"; // Added MoreHorizontal
import { abstractFileSystemView, FileEntry } from "@/lib/fs/abstractFilesystem";
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

type FileTreeNode = FileEntry;

// Utility to normalize paths (ensure trailing slash)
function normalizePath(path: string) {
  return path.endsWith("/") ? path : path + "/";
}

// SWR hook for caching file tree:
const fileTreeFetcher = async ([currentPath, settings]: [string, Record<string, string | undefined>]) => {
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
    const rawEntries = abstractFileSystemView(data, { showHidden: false, noshowList: fileSystemConfig.noshowList });
    return rawEntries.filter(entry => normalizePath(entry.path) !== normalizePath(currentPath));
  }
  throw new Error("Unexpected API response");
}

// Define reserved directory names
const reservedDirs = ["B", "archive", "md"];

export default function VaultPage() {
  const [webdavSettings, setWebdavSettings] = useState<Record<string, string | undefined> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState("Op-Browser");

  // Local state for selections within VaultPage UI
  const [currentProjectInVault, setCurrentProjectInVault] = useState<string | null>(null);
  const [currentBieterInVault, setCurrentBieterInVault] = useState<string | null>(null);

  // Global context setters
  const { setSelectedProject: setGlobalSelectedProject, setSelectedBieter: setGlobalSelectedBieter } = useSelectedProject();
  const [showSelectionConfirmation, setShowSelectionConfirmation] = useState(false);

  // State for Add Project Dialog
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

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

  useEffect(() => { fetchWebdavSettings(); }, []);

  const { data: fileTree, error, mutate, isValidating } = useSWR(
    webdavSettings ? [fileSystemConfig.basePath, webdavSettings] : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  // SWR hook for fetching Bieter data for the selected project
  const { data: bieterFolderChildrenRaw, error: bieterError } = useSWR(
    webdavSettings && currentProjectInVault ? [`${currentProjectInVault}/B`, webdavSettings] : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  const filteredBieterChildren = Array.isArray(bieterFolderChildrenRaw)
    ? bieterFolderChildrenRaw.filter(child => child.type === "directory" && !reservedDirs.includes(child.name))
    : [];

  const renderFileTree = (nodes: FileTreeNode[], currentPath: string, applyFilter: boolean) => {
    const itemsToRender = applyFilter
      ? nodes.filter(node => !(node.type === "directory" && reservedDirs.includes(node.name)))
      : nodes;

    return (
      <ul className="pl-4 bg-sidebar rounded-lg p-2 text-sidebar-foreground">
        {itemsToRender
          .map((node) => (
            <li key={node.path} className="mb-2">
              {node.type === "directory" ? (
                <FolderNode node={node} parentPath={currentPath} applyFilter={applyFilter} />
              ) : (
                <div className="px-2 py-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors">
                  {node.name}
                  {node.size && <span className="ml-1 text-xs">({node.size} bytes)</span>}
                </div>
              )}
            </li>
          ))}
      </ul>
    );
  };

  const FolderNode = ({ node, parentPath, applyFilter }: { node: FileTreeNode; parentPath: string; applyFilter: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { data: children, error: folderError, mutate: mutateFolder } = useSWR(
      webdavSettings ? [node.path, webdavSettings] : null,
      fileTreeFetcher,
      { revalidateOnFocus: false }
    );

    const toggleFolder = () => {
      setIsOpen(!isOpen);
      if (!isOpen && !children && webdavSettings) {
        mutateFolder();
      }
    };

    return (
      <div>
        <div 
          className="flex items-center cursor-pointer px-2 py-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors"
          onClick={toggleFolder}
        >
          <span className="mr-1">{isOpen ? <ChevronDown /> : <ChevronRight />}</span>
          <span>{node.name}</span>
        </div>
        {isOpen && children && renderFileTree(children, node.path, applyFilter)}
      </div>
    );
  };

  const handleSelectProjectAndBieter = () => {
    if (currentProjectInVault) { // Only project is mandatory
      setGlobalSelectedProject(currentProjectInVault);
      setGlobalSelectedBieter(currentBieterInVault); // Pass bieter, which might be null
      setShowSelectionConfirmation(true);
      setTimeout(() => {
        setShowSelectionConfirmation(false);
      }, 2000); // Hide message after 2 seconds
    }
  };

  const handleCreateProject = () => {
    // Placeholder for actual project creation logic
    console.log("Neues Projekt erstellen:", newProjectName);
    // Potentially call an API to create the directory
    // Then mutate the fileTree SWR cache to reflect the new project
    // mutate(); // Example: revalidate fileTree
    setNewProjectName(""); // Reset input
    setIsAddProjectDialogOpen(false); // Close dialog
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
            className={`px-3 py-1 border rounded ${selectedView === 'Dateibrowser' ? 'bg-gray-200' : ''}`}
            onClick={() => setSelectedView("Dateibrowser")}
          >
            Dateibrowser
          </button>
          <button
            className={`px-3 py-1 border rounded ${selectedView === 'Op-Browser' ? 'bg-gray-200' : ''}`}
            onClick={() => setSelectedView("Op-Browser")}
          >
            Op-Browser
          </button>
          <button
            className={`px-3 py-1 border rounded ${selectedView === 'Docs' ? 'bg-gray-200' : ''}`}
            onClick={() => setSelectedView("Docs")}
          >
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
            title="Refresh File Tree"
          >
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
              <Button variant="ghost" size="icon" className="p-2 focus:outline-none hover:bg-gray-200 rounded-md">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menü öffnen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Optionen</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setShowSettings(prev => !prev)}>
                Server Info {showSettings ? "ausblenden" : "anzeigen"}
              </DropdownMenuItem>
              <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
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
                    <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                      Erstellen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <DropdownMenuItem 
                onSelect={() => console.log("Add Bieter clicked")}
                disabled={!currentProjectInVault}
              >
                Bieter hinzufügen
              </DropdownMenuItem>
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
                <h2 className="text-md font-medium">Ausschreibungen</h2>
              </CardHeader>
              <CardContent>
                <ul>
                  {fileTree
                    .filter(node => node.type === "directory" && !reservedDirs.includes(node.name))
                    .map(project => (
                      <li
                        key={project.path}
                        className={`py-2 px-3 border-b hover:bg-gray-50 flex justify-between items-center ${currentProjectInVault === project.path ? "bg-gray-100" : ""}`}
                      >
                        <span 
                          className={`cursor-pointer flex-grow ${currentProjectInVault === project.path ? "font-bold" : ""}`}
                          onClick={() => {
                            if (currentProjectInVault === project.path) {
                              setCurrentProjectInVault(null);
                              setCurrentBieterInVault(null);
                            } else {
                              setCurrentProjectInVault(project.path);
                              setCurrentBieterInVault(null);
                            }
                          }}
                        >
                          {project.name}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-2 h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Projektoptionen</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onSelect={() => handleProjectAction("edit", project.path)}>
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleProjectAction("archive", project.path)}>
                              Archivieren
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleProjectAction("stats", project.path)}>
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
                  <h2 className="text-md font-medium">
                    Bieter für: {fileTree.find(p => p.path === currentProjectInVault)?.name || 'Ausgewähltes Projekt'}
                  </h2>
                </CardHeader>
                <CardContent>
                  {bieterError ? (
                    <div className="text-red-500">Error fetching bieter list.</div>
                  ) : !bieterFolderChildrenRaw && currentProjectInVault ? (
                    <div className="flex items-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="ml-2 text-sm">Lade Bieter...</span>
                    </div>
                  ) : filteredBieterChildren.length > 0 ? (
                    <ul>
                      {filteredBieterChildren.map(bieter => (
                        <li
                          key={bieter.path}
                          className={`py-2 px-3 border-b hover:bg-gray-50 flex justify-between items-center ${currentBieterInVault === bieter.path ? "bg-gray-100" : ""}`}
                        >
                          <span
                            className={`cursor-pointer flex-grow ${currentBieterInVault === bieter.path ? "font-bold" : ""}`}
                            onClick={() => {
                              if (currentBieterInVault === bieter.path) {
                                setCurrentBieterInVault(null);
                              } else {
                                setCurrentBieterInVault(bieter.path);
                              }
                            }}
                          >
                            {bieter.name}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="ml-2 h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Bieteroptionen</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onSelect={() => handleBieterAction("edit", bieter.path)}>
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleBieterAction("archive", bieter.path)}>
                                Archivieren
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleBieterAction("stats", bieter.path)}>
                                Statistiken
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Keine Bieter gefunden oder Projekt enthält keine "B"-Mappe.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          {currentProjectInVault && ( // Button appears if a project is selected
            <div className="mt-6 flex flex-col items-center">
              <Button
                onClick={handleSelectProjectAndBieter}
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full text-lg px-6 py-3"
              >
                {currentBieterInVault ? "Bieter übernehmen" : "Projekt übernehmen"}
              </Button>
              {showSelectionConfirmation && (
                <p className="text-green-600 mt-2 text-sm">
                  {currentBieterInVault ? "Bieter wurde übernommen!" : "Projekt wurde übernommen!"}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <Card className="rounded-lg shadow-lg">
          <CardHeader>
            <h2 className="text-md font-medium">{selectedView}</h2>
          </CardHeader>
          <CardContent>
            {renderFileTree(fileTree, fileSystemConfig.basePath, false)} {/* Pass false to disable reservedDirs filter for Dateibrowser */}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
