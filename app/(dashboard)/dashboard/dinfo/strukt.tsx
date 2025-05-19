import React, { useEffect, useState } from "react";
import { useProject } from "@/context/ProjectContext";
import { Card, CardContent } from "@/components/ui/card";
import Markdown from "react-markdown";
import useSWR from "swr";
import {
  fileTreeFetcher,
  normalizePath,
  FileSystemSettings,
  PDF2MD_INDEX_FILE_NAME,
} from "@/lib/fs/fileTreeUtils";

export default function Strukt() {
  const { selectedProject, selectedDok } = useProject();
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Fetch filesystem settings
  const { data: fsSettings } = useSWR<FileSystemSettings>(
    "/api/settings?key=fileSystem",
    (url) => fetch(url).then((res) => res.json())
  );

  // Get the parent directory from selectedDok
  const parentDir = selectedDok
    ? normalizePath(selectedDok.replace(/\/[^\/]+$/, ""))
    : null;

  // Fetch index JSON - similar to how info.tsx does it
  const { data: indexData } = useSWR(
    fsSettings && parentDir
      ? [parentDir + PDF2MD_INDEX_FILE_NAME, fsSettings]
      : null,
    async ([path, settings]) => {
      const params = new URLSearchParams({
        type: settings.type || "webdav",
        path,
        host: settings.host || "",
        username: settings.username || "",
        password: settings.password || "",
      });
      const res = await fetch(`/api/fs?${params.toString()}`);
      if (!res.ok) return null;
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    const loadMarkdown = async () => {
      if (!selectedDok || !fsSettings || !indexData) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setDebugInfo([]);
        
        // Get the filename and basename
        const fileBaseName = selectedDok
          ? decodeURIComponent(selectedDok.split("/").pop()!)
          : "";
        
        const debugLog: string[] = [];
        debugLog.push(`Looking for markdown file for: ${fileBaseName}`);
        
        // Find file entry in the index
        const fileEntry = indexData.files?.find((f: any) => f.name === fileBaseName);
        if (!fileEntry) {
          throw new Error(`File entry not found in index for: ${fileBaseName}`);
        }
        
        // Get the parser type from the index
        const parserType = fileEntry.parserDefault || "docling";
        debugLog.push(`Parser type from index: ${parserType}`);
        
        // Remove extension from filename to get basename
        const baseName = fileBaseName.replace(/\.[^/.]+$/, "");
        debugLog.push(`Base name without extension: ${baseName}`);
        
        // Determine markdown path based on parser type
        let markdownPath;
        if (parserType === 'marker') {
          markdownPath = `${parentDir}md/${baseName}/${baseName}.marker.md`;
          debugLog.push(`Looking for marker file at: ${markdownPath}`);
        } else {
          // Check if basename already ends with _red to avoid duplication
          const baseNameForPath = baseName.endsWith('_red') 
            ? baseName 
            : `${baseName}_red`;
          
          markdownPath = `${parentDir}md/${baseNameForPath}.${parserType}.md`;
          debugLog.push(`Looking for regular markdown file at: ${markdownPath}`);
        }
        
        // Fetch the markdown content
        debugLog.push(`Attempting to fetch markdown from: ${markdownPath}`);
        const params = new URLSearchParams({
          type: fsSettings.type || "webdav",
          path: markdownPath,
          host: fsSettings.host || "",
          username: fsSettings.username || "",
          password: fsSettings.password || "",
        });
        
        const response = await fetch(`/api/fs?${params.toString()}`);
        
        if (!response.ok) {
          debugLog.push(`Fetch failed with status: ${response.status}`);
          
          // Try alternative paths systematically
          const altPaths = [];
          
          // Alt path 1: Without _red suffix
          if (baseName.endsWith('_red')) {
            // If the file already has _red, try the original filename
            const originalBaseName = baseName.replace(/_red$/, '');
            altPaths.push(`${parentDir}md/${originalBaseName}.${parserType}.md`);
          } else {
            // Alternative without _red suffix
            altPaths.push(`${parentDir}md/${baseName}.${parserType}.md`);
          }
          
          // Alt path 2: With different case for extension
          altPaths.push(`${parentDir}md/${baseName}.${parserType.toUpperCase()}.md`);
          
          // Try each alternative path
          let content = null;
          for (const altPath of altPaths) {
            debugLog.push(`Trying alternative path: ${altPath}`);
            
            const altParams = new URLSearchParams({
              type: fsSettings.type || "webdav",
              path: altPath,
              host: fsSettings.host || "",
              username: fsSettings.username || "",
              password: fsSettings.password || "",
            });
            
            const altResponse = await fetch(`/api/fs?${altParams.toString()}`);
            
            if (altResponse.ok) {
              content = await altResponse.text();
              debugLog.push(`Successfully loaded markdown from alternative path: ${altPath}`);
              break;
            } else {
              debugLog.push(`Alternative fetch failed with status: ${altResponse.status}`);
            }
          }
          
          if (content) {
            setMarkdown(content);
          } else {
            throw new Error(`Failed to fetch markdown from all tried paths`);
          }
        } else {
          const content = await response.text();
          setMarkdown(content);
          debugLog.push(`Successfully loaded markdown from primary path`);
        }
        
        setDebugInfo(debugLog);
        setError(null);
      } catch (err) {
        console.error('Failed to load markdown:', err);
        setError('Fehler beim Laden der Strukturdaten. Details siehe Debug-Informationen unten.');
        setDebugInfo(prev => [...prev, `Error: ${err instanceof Error ? err.message : String(err)}`]);
      } finally {
        setLoading(false);
      }
    };

    loadMarkdown();
  }, [selectedDok, fsSettings, indexData, parentDir]);

  if (loading) {
    return <div className="p-4">Lade Strukturdaten...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Strukturübersicht</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      
      {markdown ? (
        <Card>
          <CardContent className="p-4">
            <div className="max-h-[70vh] overflow-y-auto bg-secondary/10 p-4 rounded-md">
              <Markdown>{markdown}</Markdown>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p>Keine Strukturdaten verfügbar.</p>
      )}
      
      {/* Debug Information */}
      {debugInfo.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Debug Informationen:</h3>
          <div className="bg-gray-100 p-4 rounded-md">
            <ul className="list-disc pl-5">
              {debugInfo.map((info, index) => (
                <li key={index} className="text-sm font-mono">{info}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
