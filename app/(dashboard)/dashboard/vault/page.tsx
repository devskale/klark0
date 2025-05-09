"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

type FileTreeNode = {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FileTreeNode[];
};

export default function VaultPage() {
  const [fileTree, setFileTree] = useState<FileTreeNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [webdavSettings, setWebdavSettings] = useState<Record<string, string | undefined> | null>(null);
  const [debugResponse, setDebugResponse] = useState<any>(null); // Store the raw API response for debugging

  const fetchFileTree = async (path = "/klark0") => {
    if (!webdavSettings) {
      console.error("WebDAV settings are not available.");
      return;
    }

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: "webdav",
        path,
        host: webdavSettings.host || "",
        username: webdavSettings.username || "",
        password: webdavSettings.password || "",
      });

      console.log("Making request to /api/fs with query params:", queryParams.toString());

      const response = await fetch(`/api/fs?${queryParams.toString()}`);
      const data = await response.json();

      console.log("API response:", data);

      // Store the raw response for debugging
      setDebugResponse(data);

      // Ensure the response is an array
      if (Array.isArray(data)) {
        setFileTree(data);
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

  useEffect(() => {
    fetchWebdavSettings();
  }, []);

  useEffect(() => {
    if (webdavSettings) {
      fetchFileTree();
    }
  }, [webdavSettings]);

  const renderFileTree = (nodes: FileTreeNode[]) => {
    return (
      <ul className="pl-4">
        {nodes.map((node) => (
          <li key={node.path} className="mb-2">
            {node.type === "directory" ? (
              <FolderNode node={node} />
            ) : (
              <span>{node.name}</span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const FolderNode = ({ node }: { node: FileTreeNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [children, setChildren] = useState<FileTreeNode[] | null>(null);

    const toggleFolder = async () => {
      if (!isOpen && !children && webdavSettings) {
        try {
          const queryParams = new URLSearchParams({
            type: "webdav",
            path: node.path || "/klark0", // Default to /klark0 if path is empty
            host: webdavSettings.host || "",
            username: webdavSettings.username || "",
            password: webdavSettings.password || "",
          });

          console.log("Making request to /api/fs with query params:", queryParams.toString());

          const response = await fetch(`/api/fs?${queryParams.toString()}`);
          const data = await response.json();

          console.log("API response for folder:", data);

          // Store the raw response for debugging
          setDebugResponse(data);

          // Ensure the response is an array
          if (Array.isArray(data)) {
            setChildren(data);
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
          className="flex items-center cursor-pointer"
          onClick={toggleFolder}
        >
          {isOpen ? <ChevronDown /> : <ChevronRight />}
          <span className="ml-2">{node.name}</span>
        </div>
        {isOpen && children && renderFileTree(children)}
      </div>
    );
  };

  return (
    <section className="p-4">
      <h1 className="text-lg font-medium mb-4">Vault Viewer</h1>
      {webdavSettings && (
        <div className="mb-4 p-4 border rounded bg-gray-100">
          <h2 className="text-md font-medium mb-2">WebDAV Settings (Debug)</h2>
          <pre className="text-sm text-gray-700">
            {JSON.stringify(webdavSettings, null, 2)}
          </pre>
        </div>
      )}
      {debugResponse && (
        <div className="mb-4 p-4 border rounded bg-gray-100">
          <h2 className="text-md font-medium mb-2">API Response (Debug)</h2>
          <pre className="text-sm text-gray-700">
            {JSON.stringify(debugResponse, null, 2)}
          </pre>
        </div>
      )}
      {loading ? (
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : fileTree ? (
        renderFileTree(fileTree)
      ) : (
        <Button onClick={() => fetchFileTree()} className="bg-orange-500 text-white">
          Load File Tree
        </Button>
      )}
    </section>
  );
}
