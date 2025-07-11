import React, { useState, useEffect } from "react";
import { useProject } from "@/context/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import useSWR from "swr";
import {
  fileTreeFetcher,
  normalizePath,
  PDF2MD_INDEX_FILE_NAME,
} from "@/lib/fs/fileTreeUtils-new";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Eye, Check, Wand2, Building } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { AI_QUERIES } from "@/app/api/ai/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * AI Project Analysis component for Ausschreibungsprojekt
 * Provides AI-powered analysis of project documents and metadata extraction
 */
export default function AiProject() {
  const { selectedProject } = useProject();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<
    Array<{ name: string; path: string; type: string }>
  >([]);
  
  // Document Selection State
  const [selectedSourceDoc, setSelectedSourceDoc] = useState<string>("");
  const [selectedExtractedDoc, setSelectedExtractedDoc] = useState<string>("");
  const [extractedDocuments, setExtractedDocuments] = useState<
    Array<{ name: string; path: string; type: string; parser: string }>
  >([]);
  
  // AI Interaction State
  const [selectedAiQuery, setSelectedAiQuery] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [kiConfigStatus, setKiConfigStatus] = useState<{
    configured: boolean;
    hasBearer: boolean;
    framework: string | null;
  } | null>(null);
  
  // Document Content State
  const [documentContent, setDocumentContent] = useState<string>("");
  const [documentContentLoading, setDocumentContentLoading] = useState<boolean>(false);
  const [lastApiRequest, setLastApiRequest] = useState<any>(null);

  const projectDir = selectedProject ? normalizePath(selectedProject) : null;
  // Fetch A directory contents (A = Ausschreibungs directory)
  const aDirectory = projectDir ? `${projectDir}A/` : null;

  // Fetch project directory contents from A directory
  const { data: projectContents, mutate: mutateContents } = useSWR(
    aDirectory ? [aDirectory, { fileSystemType: "webdav" }] : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  /**
   * Check KI configuration status
   */
  const checkKiConfigStatus = async () => {
    try {
      const response = await fetch("/api/ai/test-settings");
      if (response.ok) {
        const data = await response.json();
        setKiConfigStatus({
          configured: data.hasKiSettings && data.bearer === "[CONFIGURED]",
          hasBearer: data.bearer === "[CONFIGURED]",
          framework: data.kiFramework || null,
        });
      } else {
        setKiConfigStatus({
          configured: false,
          hasBearer: false,
          framework: null,
        });
      }
    } catch (error) {
      console.error("Error checking KI config status:", error);
      setKiConfigStatus({
        configured: false,
        hasBearer: false,
        framework: null,
      });
    }
  };

  // Check KI config on component mount
  useEffect(() => {
    checkKiConfigStatus();
  }, []);

  /**
   * Fetch document content when selectedExtractedDoc changes
   */
  useEffect(() => {
    const fetchDocumentContent = async () => {
      if (!selectedExtractedDoc) {
        setDocumentContent("");
        return;
      }

      setDocumentContentLoading(true);
      try {
        const extractedDoc = extractedDocuments.find(doc => doc.path === selectedExtractedDoc);
        if (extractedDoc) {
          // Use /api/fs/read endpoint to get actual file content, not metadata
          const params = new URLSearchParams({ path: extractedDoc.path });
          const contentResponse = await fetch(`/api/fs/read?${params.toString()}`);
          if (contentResponse.ok) {
            const content = await contentResponse.text();
            setDocumentContent(content);
            console.log(`Fetched document content: ${content.length} characters`);
            console.log(`Content preview: ${content.substring(0, 200)}...`);
          } else {
            console.error(`Failed to fetch document content: ${contentResponse.status}`);
            setDocumentContent("");
          }
        }
      } catch (error) {
        console.error("Error fetching document content:", error);
        setDocumentContent("");
      } finally {
        setDocumentContentLoading(false);
      }
    };

    fetchDocumentContent();
  }, [selectedExtractedDoc, extractedDocuments]);

  /**
   * Load and analyze project documents
   */
  useEffect(() => {
    const loadProjectDocuments = async () => {
      if (!projectContents || !selectedProject) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setDebugInfo([]);

        const debugLog: string[] = [];
        debugLog.push(`Analyzing project: ${selectedProject}`);
        debugLog.push(`Looking in A directory: ${aDirectory}`);
        debugLog.push(`Found ${projectContents.length} items in A directory`);

        // Filter for source documents (PDFs, Word docs, etc.)
        const sourceDocuments = projectContents.filter((item: any) => {
          const isFile = item.type === "file";
          const isSourceDoc = item.name.match(/\.(pdf|docx?|txt)$/i);
          return isFile && isSourceDoc;
        });

        debugLog.push(`Found ${sourceDocuments.length} source documents`);
        sourceDocuments.forEach((doc: any) => {
          debugLog.push(`- ${doc.name} (source)`);
        });

        setProjectDocuments(sourceDocuments.map((doc: any) => ({
          name: doc.name,
          path: doc.path,
          type: doc.name.split('.').pop()?.toLowerCase() || 'unknown'
        })));

        // Look for extracted documents in md subdirectory
        const mdDirectory = aDirectory ? `${aDirectory}md/` : null;
        if (mdDirectory) {
          try {
            const mdContentsResponse = await fetch(`/api/fs?path=${encodeURIComponent(mdDirectory)}`);
            if (mdContentsResponse.ok) {
              const mdContents = await mdContentsResponse.json();
              const extractedDocs = mdContents.filter((item: any) => {
                const isFile = item.type === "file";
                const isMarkdown = item.name.match(/\.md$/i);
                return isFile && isMarkdown;
              });
              
              debugLog.push(`Found ${extractedDocs.length} extracted documents in md/`);
              extractedDocs.forEach((doc: any) => {
                debugLog.push(`- ${doc.name} (extracted)`);
              });
              
              setExtractedDocuments(extractedDocs.map((doc: any) => {
                // Determine parser type from filename
                let parser = 'unknown';
                if (doc.name.includes('.marker.md')) parser = 'marker';
                else if (doc.name.includes('.docling.md')) parser = 'docling';
                else if (doc.name.includes('.pdfplumber.md')) parser = 'pdfplumber';
                else if (doc.name.includes('.ocr.md')) parser = 'ocr';
                
                return {
                  name: doc.name,
                  path: doc.path,
                  type: 'md',
                  parser
                };
              }));
            } else {
              debugLog.push('No md/ directory found or accessible');
              setExtractedDocuments([]);
            }
          } catch (mdError) {
            debugLog.push(`Error accessing md/ directory: ${mdError}`);
            setExtractedDocuments([]);
          }
        }

        setDebugInfo(debugLog);
        setError(null);
      } catch (err) {
        console.error("Failed to load project documents:", err);
        setError(
          "Fehler beim Laden der Projektdokumente. Details siehe Debug-Informationen unten."
        );
        setDebugInfo((prev) => [
          ...prev,
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadProjectDocuments();
  }, [selectedProject, projectContents, projectDir]);

  /**
   * Handle AI query submission for project analysis
   */
  const handleAiQuerySubmit = async () => {
    if (!selectedAiQuery || !selectedProject) {
      setAiError(
        "Bitte wählen Sie eine Analyseart aus und stellen Sie sicher, dass ein Projekt ausgewählt ist."
      );
      return;
    }

    if (!selectedExtractedDoc) {
      setAiError(
        "Bitte wählen Sie ein extrahiertes Dokument aus. Nur Markdown-Inhalte können analysiert werden."
      );
      return;
    }

    setIsAiLoading(true);
    setAiResponse("");
    setAiError(null);

    try {
      console.log("Starting AI project analysis with queryType:", selectedAiQuery);
      console.log("Project:", selectedProject);
      console.log("Selected source doc:", selectedSourceDoc);
      console.log("Selected extracted doc:", selectedExtractedDoc);

      // Prepare context - use already fetched document content
      let documentInfo = {
        documentName: "",
        documentType: "",
        parser: ""
      };

      // If an extracted document is selected, prepare document info
      if (selectedExtractedDoc) {
        const extractedDoc = extractedDocuments.find(doc => doc.path === selectedExtractedDoc);
        if (extractedDoc) {
          documentInfo = {
            documentName: extractedDoc.name,
            documentType: "extracted_markdown",
            parser: extractedDoc.parser
          };
        }
      }

      // Ensure we have document content before proceeding
      if (!documentContent.trim()) {
        setAiError("Kein Dokumentinhalt verfügbar. Bitte wählen Sie ein extrahiertes Dokument aus und warten Sie, bis der Inhalt geladen ist.");
        setIsAiLoading(false);
        return;
      }

      console.log(`Using document content: ${documentContent.length} characters`);

      // Prepare API request body
      const apiRequestBody = {
        queryType: selectedAiQuery,
        context: documentContent, // Pass only the markdown content as context
        documentInfo: JSON.stringify(documentInfo, null, 2) // Minimal metadata for reference
      };

      // Store API request for debug info
      setLastApiRequest({
        url: "/api/ai/gem/stream",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: apiRequestBody,
        timestamp: new Date().toISOString(),
        contextLength: documentContent.length,
        contextPreview: documentContent.substring(0, 500) + (documentContent.length > 500 ? "..." : "")
      });

      const response = await fetch("/api/ai/gem/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiRequestBody),
      });

      if (!response.ok) {
        let errorMessage = `AI Error ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage += ` - ${errorText}`;
          }
        } catch (e) {
          // Could not read error response
        }
        throw new Error(errorMessage);
      }

      // Stream the response
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;
        setAiResponse(accumulatedResponse);
      }

      console.log("AI analysis completed successfully");
    } catch (error) {
      console.error("AI analysis failed:", error);
      setAiError(
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler bei der AI-Analyse"
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  /**
   * Custom markdown components for better rendering
   */
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Lade Projektdokumente...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fehler</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Projekt-Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <p><strong>Projekt:</strong> {selectedProject ? decodeURIComponent(selectedProject) : "Kein Projekt ausgewählt"}</p>
              <p><strong>Quelldokumente gefunden:</strong> {projectDocuments.length}</p>
              <p><strong>Extrahierte Dokumente gefunden:</strong> {extractedDocuments.length}</p>
            </div>
            
            {/* Document Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quelldokument auswählen:</label>
                <Select value={selectedSourceDoc} onValueChange={setSelectedSourceDoc}>
                  <SelectTrigger>
                    <SelectValue placeholder="Quelldokument wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectDocuments.map((doc, index) => (
                      <SelectItem key={index} value={doc.path}>
                        {doc.name} ({doc.type.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Extrahiertes Dokument auswählen (erforderlich für KI-Analyse):</label>
                <Select value={selectedExtractedDoc} onValueChange={setSelectedExtractedDoc}>
                  <SelectTrigger>
                    <SelectValue placeholder="Extrahiertes Dokument wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {extractedDocuments.map((doc, index) => (
                      <SelectItem key={index} value={doc.path}>
                        {doc.name} ({doc.parser.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {extractedDocuments.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Keine extrahierten Dokumente gefunden. Bitte verarbeiten Sie zuerst ein Quelldokument.
                  </p>
                )}
              </div>
            </div>
            
            {/* Document Lists */}
            {projectDocuments.length > 0 && (
              <details className="border rounded-md">
                <summary className="p-2 cursor-pointer text-sm font-medium bg-gray-50">
                  Alle Quelldokumente ({projectDocuments.length})
                </summary>
                <div className="p-2">
                  <ul className="list-disc list-inside space-y-1">
                    {projectDocuments.map((doc, index) => (
                      <li key={index} className="text-sm">
                        {doc.name} ({doc.type.toUpperCase()})
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )}
            
            {extractedDocuments.length > 0 && (
              <details className="border rounded-md">
                <summary className="p-2 cursor-pointer text-sm font-medium bg-gray-50">
                  Alle extrahierte Dokumente ({extractedDocuments.length})
                </summary>
                <div className="p-2">
                  <ul className="list-disc list-inside space-y-1">
                    {extractedDocuments.map((doc, index) => (
                      <li key={index} className="text-sm">
                        {doc.name} ({doc.parser.toUpperCase()})
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            KI-Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!kiConfigStatus?.configured ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>KI nicht konfiguriert</AlertTitle>
              <AlertDescription>
                Die KI-Funktionalität ist nicht konfiguriert. Bitte überprüfen Sie
                die Einstellungen.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Select value={selectedAiQuery} onValueChange={setSelectedAiQuery}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Analyseart auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AI_QUERIES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {key.replace(/_/g, " ").toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAiQuerySubmit}
                  disabled={isAiLoading || !selectedAiQuery}
                  className="flex items-center gap-2"
                >
                  {isAiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {isAiLoading ? "Analysiere..." : "Analysieren"}
                </Button>
              </div>

              {aiError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>AI-Fehler</AlertTitle>
                  <AlertDescription>{aiError}</AlertDescription>
                </Alert>
              )}

              {aiResponse && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">AI-Analyse Ergebnis:</h3>
                  <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {aiResponse}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Information */}
      <details className="mt-4 border border-gray-200 rounded-md overflow-hidden">
        <summary className="bg-gray-50 px-4 py-2 cursor-pointer text-sm font-medium">
          Debug Info
        </summary>
        <div className="p-4 bg-gray-50 text-xs font-mono space-y-1">
          <ul className="list-disc pl-5">
            <li>selectedProject: {selectedProject}</li>
            <li>projectDir: {projectDir}</li>
            <li>aDirectory: {aDirectory}</li>
            <li>projectContents count: {projectContents?.length ?? "N/A"}</li>
            <li>projectDocuments count: {projectDocuments.length}</li>
            <li>extractedDocuments count: {extractedDocuments.length}</li>
            <li>selectedSourceDoc: {selectedSourceDoc || "(none)"}</li>
            <li>selectedExtractedDoc: {selectedExtractedDoc || "(none)"}</li>
            <li>documentContentLength: {documentContentLoading ? "Loading..." : (documentContent ? `${documentContent.length} characters` : "N/A")}</li>
            <li>kiConfigStatus: {JSON.stringify(kiConfigStatus)}</li>
            <li>
              Debug Log:
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs break-all whitespace-pre-wrap">
                {debugInfo.join("\n")}
              </pre>
            </li>
            <li>
              Extracted Documents:
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs break-all whitespace-pre-wrap">
                {JSON.stringify(extractedDocuments, null, 2)}
              </pre>
            </li>
            <li>
              Last AI API Request:
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs break-all whitespace-pre-wrap">
                {lastApiRequest ? JSON.stringify({
                  url: lastApiRequest.url,
                  method: lastApiRequest.method,
                  timestamp: lastApiRequest.timestamp,
                  queryType: lastApiRequest.body.queryType,
                  contextLength: lastApiRequest.contextLength,
                  contextPreview: lastApiRequest.contextPreview,
                  documentInfo: lastApiRequest.body.documentInfo
                }, null, 2) : "(no API call made yet)"}
              </pre>
            </li>
            <li>
              AI Response (raw):
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs break-all whitespace-pre-wrap">
                {aiResponse || "(empty)"}
              </pre>
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
}