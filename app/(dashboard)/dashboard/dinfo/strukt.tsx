import React, { useState, useEffect } from "react";
import { useProject } from "@/context/ProjectContext";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import useSWR from "swr";
import {
  fileTreeFetcher,
  normalizePath,
  FileSystemSettings,
  PDF2MD_INDEX_FILE_NAME,
} from "@/lib/fs/fileTreeUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Strukt() {
  const { selectedProject, selectedDok } = useProject();
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [availableVariants, setAvailableVariants] = useState<Array<{key: string, label: string, path: string}>>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

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
        
        // Get the parser type and available parsers from the index
        const parserDefault = fileEntry.parserDefault || "docling";
        const parserDet = fileEntry.parserDet || [parserDefault];
        debugLog.push(`Default parser type: ${parserDefault}`);
        debugLog.push(`Available parsers: ${parserDet.join(', ')}`);
        
        // Remove extension from filename to get basename
        const baseName = fileBaseName.replace(/\.[^/.]+$/, "");
        debugLog.push(`Base name without extension: ${baseName}`);
        
        // Track available parser variants
        const variants: Array<{key: string, label: string, path: string}> = [];
        
        // Create variants for all parser types
        for (const parser of parserDet) {
          if (parser === 'marker') {
            // Marker type has a special directory structure
            const markerPath = `${parentDir}md/${baseName}/${baseName}.marker.md`;
            debugLog.push(`Adding marker file at: ${markerPath}`);
            
            variants.push({
              key: `${baseName}.marker`,
              label: "Marker",
              path: markerPath
            });
          } else {
            // Standard parsers - try both naming conventions
            const paths = [
              `${parentDir}md/${baseName}.${parser}.md`,
              `${parentDir}md/${baseName}_red.${parser}.md`
            ];
            
            paths.forEach((path, index) => {
              const isDefault = parser === parserDefault && index === 0;
              const label = isDefault 
                ? parser 
                : `${parser}${index === 1 ? ' (Red)' : ''}`;
                
              variants.push({
                key: `${parser}-${index}`,
                label: label,
                path: path
              });
              
              debugLog.push(`Adding ${label} at: ${path}`);
            });
          }
        }
        
        // Check for any additional parser types in the md directory
        try {
          const params = new URLSearchParams({
            type: fsSettings.type || "webdav",
            path: `${parentDir}md/`,
            host: fsSettings.host || "",
            username: fsSettings.username || "",
            password: fsSettings.password || "",
          });
          
          const dirResponse = await fetch(`/api/fs?${params.toString()}`);
          
          if (dirResponse.ok) {
            const dirListing = await dirResponse.json();
            
            // Look for files that match our basename but might have different parser types
            const mdFilePattern = new RegExp(`^${baseName}(?:_red)?\\.([a-zA-Z0-9]+)\\.md$`);
            
            for (const file of dirListing) {
              if (file.type !== 'file') continue;
              
              const match = file.name.match(mdFilePattern);
              if (!match) continue;
              
              const parserType = match[1].toLowerCase();
              
              // Skip if we already have this parser type
              if (parserDet.includes(parserType)) continue;
              
              // Add this discovered parser variant
              variants.push({
                key: `discovered-${parserType}`,
                label: `${parserType} (Entdeckt)`,
                path: `${parentDir}md/${file.name}`
              });
              
              debugLog.push(`Discovered additional parser: ${parserType} at ${file.name}`);
            }
          }
        } catch (dirError) {
          debugLog.push(`Error scanning md directory: ${dirError instanceof Error ? dirError.message : String(dirError)}`);
        }
        
        setAvailableVariants(variants);
        
        // If we have a current selection, keep it, otherwise use the first variant
        if (!selectedVariant && variants.length > 0) {
          // Prefer the default parser if available
          const defaultVariant = variants.find(v => v.label === parserDefault);
          setSelectedVariant(defaultVariant ? defaultVariant.label : variants[0].label);
        }
        
        // Find the selected variant path
        const variantToLoad = selectedVariant 
          ? variants.find(v => v.label === selectedVariant)
          : variants[0];
        
        if (!variantToLoad) {
          throw new Error("Keine gültigen Markdown-Varianten gefunden");
        }
        
        // Fetch the markdown content using the proper API endpoint
        debugLog.push(`Attempting to fetch markdown from: ${variantToLoad.path}`);
        
        try {
          // Use the dedicated file read endpoint to fetch the actual content
          const response = await fetch("/api/fs/read", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: fsSettings.type || "webdav",
              path: variantToLoad.path,
              host: fsSettings.host || "",
              username: fsSettings.username || "",
              password: fsSettings.password || "",
            }),
          });
          
          if (!response.ok) {
            debugLog.push(`Fetch failed with status: ${response.status}`);
            throw new Error(`Fehler beim Laden der Markdown-Datei: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.content) {
            setMarkdown(data.content);
            debugLog.push(`Successfully loaded markdown content (${data.content.length} chars)`);
          } else {
            throw new Error("Markdown-Datei ist leer oder hat ein ungültiges Format");
          }
        } catch (fetchError) {
          debugLog.push(`Error fetching content: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
          
          // Try each variant until one works
          let foundContent = false;
          
          for (const variant of variants) {
            if (variant.path === variantToLoad.path) continue; // Skip the one we just tried
            
            debugLog.push(`Trying alternative path: ${variant.path}`);
            
            try {
              const altResponse = await fetch("/api/fs/read", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  type: fsSettings.type || "webdav",
                  path: variant.path,
                  host: fsSettings.host || "",
                  username: fsSettings.username || "",
                  password: fsSettings.password || "",
                }),
              });
              
              if (!altResponse.ok) {
                debugLog.push(`Alternative fetch failed with status: ${altResponse.status}`);
                continue;
              }
              
              const altData = await altResponse.json();
              
              if (altData.content) {
                setSelectedVariant(variant.label);
                setMarkdown(altData.content);
                debugLog.push(`Successfully loaded markdown from alternative path (${altData.content.length} chars)`);
                foundContent = true;
                break;
              }
            } catch (altError) {
              debugLog.push(`Error with alternative: ${altError instanceof Error ? altError.message : String(altError)}`);
            }
          }
          
          if (!foundContent) {
            throw new Error(`Keine Markdown-Inhalte für ${baseName} gefunden`);
          }
        }
        
        setDebugInfo(debugLog);
        setError(null);
      } catch (err) {
        console.error('Failed to load markdown:', err);
        setError('Fehler beim Laden der Strukturdaten. Details siehe Debug-Informationen unten.');
        setDebugInfo(prev => [...prev, `Error: ${err instanceof Error ? err.message : String(err)}`]);
        setMarkdown("");
      } finally {
        setLoading(false);
      }
    };

    loadMarkdown();
  }, [selectedDok, fsSettings, indexData, parentDir, selectedVariant]);

  // Handle variant change
  const handleVariantChange = async (variantLabel: string) => {
    if (variantLabel === selectedVariant) return;
    setSelectedVariant(variantLabel);
  };

  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    table({ node, ...props }: any) {
      return (
        <div className="my-4 overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200" {...props} />
        </div>
      );
    },
    th({ node, ...props }: any) {
      return (
        <th 
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" 
          {...props} 
        />
      );
    },
    td({ node, ...props }: any) {
      return <td className="px-3 py-2 text-sm whitespace-nowrap border-t border-gray-100" {...props} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Lade Strukturdaten...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <h2 className="text-2xl font-bold mb-2">Strukturübersicht</h2>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {availableVariants.length > 0 && (
        <div className="mb-2">
          <Tabs 
            value={selectedVariant || availableVariants[0]?.label} 
            onValueChange={handleVariantChange}
            className="w-full"
          >
            <TabsList className="mb-2 flex flex-wrap">
              {availableVariants.map(variant => (
                <TabsTrigger key={variant.key} value={variant.label}>
                  {variant.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}
      
      {markdown ? (
        <Card className="border border-gray-200">
          <CardContent className="p-0 overflow-hidden">
            <ScrollArea className="h-[70vh] rounded-md">
              <div className="p-6 prose prose-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  components={markdownComponents}
                >
                  {markdown}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <div className="p-8 text-center text-gray-500">
          <p>Keine Strukturdaten verfügbar.</p>
        </div>
      )}
      
      {/* Debug Information (collapsible) */}
      {debugInfo.length > 0 && (
        <details className="mt-8 border border-gray-200 rounded-md overflow-hidden">
          <summary className="bg-gray-50 px-4 py-2 cursor-pointer text-sm font-medium">
            Debug Informationen
          </summary>
          <div className="p-4 bg-gray-50">
            <ul className="list-disc pl-5 text-xs font-mono space-y-1">
              {debugInfo.map((info, index) => (
                <li key={index}>{info}</li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
