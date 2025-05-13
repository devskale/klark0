"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Loader2, Menu, RefreshCw } from "lucide-react";
import { abstractFileSystemView, FileEntry } from "@/lib/fs/abstractFilesystem";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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

// Modified: update OpBrowserItem to use selectedProject for expansion
function OpBrowserItem({ 
  project, 
  webdavSettings,
  selectedProject,
  setSelectedProject,
  selectedBieter,
  setSelectedBieter
}: { 
  project: FileTreeNode; 
  webdavSettings: Record<string, string | undefined>;
  selectedProject: string | null;
  setSelectedProject: (p: string | null) => void;
  selectedBieter: string | null;
  setSelectedBieter: (b: string | null) => void;
}) {
  // Derive expanded state from selectedProject
  const expanded = selectedProject === project.path;
  
  const { data: bFolderChildrenRaw } = useSWR( // Renamed to bFolderChildrenRaw
    expanded && webdavSettings ? [project.path + "/B", webdavSettings] : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  // Filter Bieter children: only include directories not in reservedDirs
  const filteredBFolderChildren = Array.isArray(bFolderChildrenRaw)
    ? bFolderChildrenRaw.filter(child => child.type === "directory" && !reservedDirs.includes(child.name))
    : [];
  
  // Count of bieters (only names displayed), based on filtered children
  let bCount = filteredBFolderChildren.length;
    
  const toggleProject = () => {
    if (expanded) {
      setSelectedProject(null);
      setSelectedBieter(null);
    } else {
      setSelectedProject(project.path);
      setSelectedBieter(null);
    }
  };

  const toggleBieter = (bieterPath: string) => {
    setSelectedBieter(selectedBieter === bieterPath ? null : bieterPath);
  };

  return (
    <li>
      <div
        className="flex justify-between items-center border-b py-2 cursor-pointer"
        onClick={toggleProject}
      >
        <span className={`flex items-center ${selectedProject === project.path ? "font-bold" : ""}`}>
          {expanded ? <ChevronDown className="mr-1" /> : <ChevronRight className="mr-1" />}
          {project.name}
        </span>
        <span className="px-2 py-1 bg-blue-200 text-blue-600 rounded-full text-xs">
          B: {bCount}
        </span>
      </div>
      {expanded && (
        <ul className="pl-6">
          {filteredBFolderChildren.map(child => (
            <li 
              key={child.path} 
              className={`py-1 border-b cursor-pointer ${selectedBieter === child.path ? "font-bold" : ""}`}
              onClick={(e) => { 
                 e.stopPropagation(); 
                 toggleBieter(child.path);
              }}
            >
              {child.name}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function VaultPage() {
  const [webdavSettings, setWebdavSettings] = useState<Record<string, string | undefined> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false); // new state for refresh message
  const [refreshing, setRefreshing] = useState(false); // new state for refresh spinner
  const [selectedView, setSelectedView] = useState("Op-Browser"); // New state for selected view, default is "Op-Browser"
  const [selectedProject, setSelectedProject] = useState<string | null>(null); // Added: selected Ausschreibung
  const [selectedBieter, setSelectedBieter] = useState<string | null>(null); // Added: selected Bieter

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
          <button
            className="p-2 focus:outline-none"
            onClick={() => setShowSettings(prev => !prev)}
            title="Toggle Filesystem Settings"
          >
            <Menu className="h-6 w-6" />
          </button>
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
        <Card className="rounded-lg shadow-lg">
          <CardHeader>
            <h2 className="text-md font-medium">{selectedView}</h2>
          </CardHeader>
          <CardContent>
            <ul>
              {fileTree
                .filter(node => node.type === "directory" && !reservedDirs.includes(node.name)) // filter out reserved dirs
                .map(project => (
                  <OpBrowserItem 
                    key={project.path} 
                    project={project} 
                    webdavSettings={webdavSettings as Record<string, string | undefined>}
                    selectedProject={selectedProject}
                    setSelectedProject={setSelectedProject}
                    selectedBieter={selectedBieter}
                    setSelectedBieter={setSelectedBieter}
                  />
                ))}
            </ul>
          </CardContent>
        </Card>
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
