"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Loader2, Menu } from "lucide-react";
import { abstractFileSystemView, FileEntry } from "@/fs/abstractFilesystem";

type FileTreeNode = FileEntry;

// Utility to normalize paths (ensure trailing slash)
function normalizePath(path: string) {
  return path.endsWith("/") ? path : path + "/";
}

export default function VaultPage() {
  const [fileTree, setFileTree] = useState<FileTreeNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [webdavSettings, setWebdavSettings] = useState<Record<string, string | undefined> | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Centralized filesystem configuration – can be extended to support other filesystems
  const fileSystemConfig = {
    type: "webdav",
    basePath: "/klark0",
    noshowList: ["archive", ".archive"],
    // future config: local, OCI Bucket, etc.
  };

  const fetchFileTree = async (currentPath = fileSystemConfig.basePath) => {
    if (!webdavSettings) {
      console.error("Filesystem settings are not available.");
      return;
    }
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: fileSystemConfig.type,
        path: currentPath,
        host: webdavSettings.host || "",
        username: webdavSettings.username || "",
        password: webdavSettings.password || "",
      });
      console.log("Making request to /api/fs with query params:", queryParams.toString());
      const response = await fetch(`/api/fs?${queryParams.toString()}`);
      const data = await response.json();
      console.log("API response:", data);
      if (Array.isArray(data)) {
        // Apply abstraction layer and filter out current folder from its own listing
        const rawEntries = abstractFileSystemView(data, { showHidden: false, noshowList: fileSystemConfig.noshowList });
        const filtered = rawEntries.filter(entry => normalizePath(entry.path) !== normalizePath(currentPath));
        setFileTree(filtered);
      } else {
        console.error("Unexpected API response:", data);
        setFileTree([]);
      }
    } catch (error) {
      console.error("Error fetching file tree:", error);
      setFileTree([]);
    } finally {
      setLoading(false);
    }
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
  useEffect(() => { if (webdavSettings) { fetchFileTree(); } }, [webdavSettings]);

  const renderFileTree = (nodes: FileTreeNode[], currentPath: string) => {
    return (
      <ul className="pl-4">
        {nodes.map((node) => (
          <li key={node.path} className="mb-2">
            {node.type === "directory" ? (
              <FolderNode node={node} parentPath={currentPath} />
            ) : (
              <span>{node.name}{ node.size && <>({node.size} bytes)</> }</span>
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
        <div className="flex items-center cursor-pointer" onClick={toggleFolder}>
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
        <button
          className="p-2 focus:outline-none"
          onClick={() => setShowSettings(prev => !prev)}
          title="Toggle Filesystem Settings"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {showSettings && webdavSettings && (
        <div className="mb-4 p-4 border rounded bg-gray-100">
          <h2 className="text-md font-medium mb-2">Filesystem Settings</h2>
          <pre className="text-sm text-gray-700">{JSON.stringify(webdavSettings, null, 2)}</pre>
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : fileTree ? (
        renderFileTree(fileTree, fileSystemConfig.basePath)
      ) : (
        <Button onClick={() => fetchFileTree()} className="bg-orange-500 text-white">
          Load File Tree
        </Button>
      )}
    </section>
  );
}
