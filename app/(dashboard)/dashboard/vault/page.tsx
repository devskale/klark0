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
};

export default function VaultPage() {
  const [webdavSettings, setWebdavSettings] = useState<Record<string, string | undefined> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false); // new state for refresh message
  const [refreshing, setRefreshing] = useState(false); // new state for refresh spinner

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

  const renderFileTree = (nodes: FileTreeNode[], currentPath: string) => {
    return (
      <ul className="pl-4 bg-sidebar rounded-lg p-2 text-sidebar-foreground">
        {nodes.map((node) => (
          <li key={node.path} className="mb-2">
            {node.type === "directory" ? (
              <FolderNode node={node} parentPath={currentPath} />
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

  const FolderNode = ({ node, parentPath }: { node: FileTreeNode; parentPath: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [children, setChildren] = useState<FileTreeNode[] | null>(null);

    const toggleFolder = async () => {
      if (!isOpen && !children && webdavSettings) {
        try {
          const queryParams = new URLSearchParams({
            type: fileSystemConfig.type,
            path: node.path || fileSystemConfig.basePath,
            host: webdavSettings.host || "",
            username: webdavSettings.username || "",
            password: webdavSettings.password || "",
          });
          console.log("Making request to /api/fs with query params:", queryParams.toString());
          const response = await fetch(`/api/fs?${queryParams.toString()}`);
          const data = await response.json();
          console.log("API response for folder:", data);
          if (Array.isArray(data)) {
            const rawEntries = abstractFileSystemView(data, { showHidden: false, noshowList: fileSystemConfig.noshowList });
            const filtered = rawEntries.filter(entry => normalizePath(entry.path) !== normalizePath(node.path));
            setChildren(filtered);
          } else {
            console.error("Unexpected API response:", data);
            setChildren([]);
          }
        } catch (error) {
          console.error("Error fetching folder contents:", error);
          setChildren([]);
        }
      }
      setIsOpen(!isOpen);
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
        {isOpen && children && renderFileTree(children, node.path)}
      </div>
    );
  };

  return (
    <section className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-medium">Vault Viewer</h1>
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
      ) : (
        <Card className="rounded-lg shadow-lg">
          <CardHeader>
            <h2 className="text-md font-medium">Dateibrowser</h2>
          </CardHeader>
          <CardContent>
            {renderFileTree(fileTree, fileSystemConfig.basePath)}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
