"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Loader2, Menu } from "lucide-react";
import { abstractFileSystemView, FileEntry } from "@/fs/abstractFilesystem"; // Import the abstraction layer

type FileTreeNode = FileEntry; // Reuse FileEntry type

// Utility to normalize paths (ensure trailing slash)
function normalizePath(path: string) {
  return path.endsWith("/") ? path : path + "/";
}

export default function VaultPage() {
  const [fileTree, setFileTree] = useState<FileTreeNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [webdavSettings, setWebdavSettings] = useState<Record<string, string | undefined> | null>(null);
  const [showSettings, setShowSettings] = useState(false); // state for burger menu toggle

  const fetchFileTree = async (currentPath = "/klark0") => {
    if (!webdavSettings) {
      console.error("WebDAV settings are not available.");
      return;
    }
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: "webdav",
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
        // Apply abstraction and then filter out the current folder entry
        const rawEntries = abstractFileSystemView(data, { showHidden: false, noshowList: ["archive", ".archive"] });
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
      console.log("Fetched WebDAV settings:", data);
      if (data.type === "webdav") {
        setWebdavSettings(data);
      } else {
        console.error("WebDAV is not the configured filesystem type:", data);
        setWebdavSettings(null);
      }
    } catch (error) {
      console.error("Error fetching WebDAV settings:", error);
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
              <span>{node.name} { node.size && <>({node.size} bytes)</> }</span>
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
            type: "webdav",
            path: node.path || "/klark0",
            host: webdavSettings.host || "",
            username: webdavSettings.username || "",
            password: webdavSettings.password || "",
          });
          console.log("Making request to /api/fs with query params:", queryParams.toString());
          const response = await fetch(`/api/fs?${queryParams.toString()}`);
          const data = await response.json();
          console.log("API response for folder:", data);
          if (Array.isArray(data)) {
            const rawEntries = abstractFileSystemView(data, { showHidden: false, noshowList: ["archive", ".archive"] });
            // Filter out entry matching the folder itself
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
        <button className="p-2 focus:outline-none" onClick={() => setShowSettings(prev => !prev)} title="Toggle WebDAV Settings">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {showSettings && webdavSettings && (
        <div className="mb-4 p-4 border rounded bg-gray-100">
          <h2 className="text-md font-medium mb-2">WebDAV Settings</h2>
          <pre className="text-sm text-gray-700">{JSON.stringify(webdavSettings, null, 2)}</pre>
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : fileTree ? (
        renderFileTree(fileTree, "/klark0")
      ) : (
        <Button onClick={() => fetchFileTree()} className="bg-orange-500 text-white">
          Load File Tree
        </Button>
      )}
    </section>
  );
}
