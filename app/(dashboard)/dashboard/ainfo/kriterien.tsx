"use client";

import { useProject } from "@/context/ProjectContext";
import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  fileTreeFetcher,
  normalizePath,
} from "@/lib/fs/fileTreeUtils-new";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Clock, Edit, Sparkles, MoreHorizontal, FileText, ChevronDown, ChevronRight, Eye, User, Bot, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KriterienExtraktion, validateKriterienExtraktion } from "@/types/kriterien";
import { toast } from "sonner";
import { AI_QUERIES } from "@/app/api/ai/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interface für Review-Status
interface ReviewStatus {
  aiReviewed: boolean;
  humanReviewed: boolean;
  lastModified: string;
  notes?: string;
}

// Interface für erweiterte Kriterien mit Review-Status
interface ExtendedKriterium {
  id: string;
  originalData: any;
  reviewStatus: ReviewStatus;
}

// Get basename of a file without extension
const getBaseName = (filePath: string): string => {
  const fileName = filePath.split("/").pop() || "";
  return fileName.replace(/\.[^/.]+$/, "");
};

export default function AKriterienPage() {
  const { selectedProject } = useProject();
  
  // Derive project directory path
  const projectDir = selectedProject ? normalizePath(selectedProject) : null;
  
  // Fetch A directory contents to find AAB files (A = Ausschreibungs directory)
  const aDirectory = projectDir ? `${projectDir}A/` : null;
  const { data: projectContents, error: entriesError } = useSWR(
    aDirectory ? [aDirectory, { fileSystemType: "webdav" }] : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  // Preselect AAB PDF document
  const aabPdfFiles = projectContents?.filter((item: any) => 
    item.type === "file" && 
    item.name.toUpperCase().includes("AAB") && 
    item.name.toLowerCase().endsWith(".pdf")
  ) || [];
  
  const selectedAabFile = aabPdfFiles.length > 0 ? aabPdfFiles[0] : null;
  const fileBaseName = selectedAabFile ? getBaseName(selectedAabFile.name) : "";
  const parserEntry = selectedAabFile ? projectContents?.find((e: any) => e.name === selectedAabFile.name) : null;
  const parserDefault = parserEntry?.parserDefault;
  
  // State für den Kriterien-Extraktion Workflow
  const [aabContent, setAabContent] = useState<string>("");
  const [extractedCriteria, setExtractedCriteria] = useState<KriterienExtraktion | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [activeTab, setActiveTab] = useState("source");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selectedAiQuery, setSelectedAiQuery] = useState<string>("KRITERIEN_EXTRAKTION");
  
  // Debug state for troubleshooting AI responses
  const [debugInfo, setDebugInfo] = useState<{
    rawResponse?: string;
    apiRequest?: any;
    parseError?: string;
    timestamp?: string;
  }>({});
  
  // Load AAB document content when component mounts or when AAB file changes
  useEffect(() => {
    const loadAabDocument = async () => {
      if (!selectedAabFile || !aDirectory || !parserDefault) {
        setAabContent("");
        return;
      }
      
      setIsLoadingDocument(true);
      setDocumentError(null);
      
      try {
        // Construct path to parser's markdown file (same logic as info.tsx)
        const baseNameWithoutExt = fileBaseName;
        let selectedParserMdPath: string;

        if (parserDefault.toLowerCase() === "marker") {
          selectedParserMdPath = `${aDirectory}md/${baseNameWithoutExt}/${baseNameWithoutExt}.marker.md`;
        } else if (parserDefault.toLowerCase() === "md") {
          selectedParserMdPath = `${aDirectory}md/${baseNameWithoutExt}.md`;
        } else {
          selectedParserMdPath = `${aDirectory}md/${baseNameWithoutExt}.${parserDefault}.md`;
        }

        // Load parser's markdown content
        const readRes = await fetch("/api/fs/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: selectedParserMdPath,
          }),
        });

        if (!readRes.ok) {
          throw new Error(
            `Fehler beim Laden der AAB-Datei (${selectedParserMdPath}): ${readRes.statusText}`
          );
        }
        
        const readJson = await readRes.json();
        const parserMdContent = readJson.content || "";

        if (!parserMdContent) {
          throw new Error(
            `Die AAB-Datei (${selectedParserMdPath}) ist leer oder konnte nicht gelesen werden.`
          );
        }
        
        setAabContent(parserMdContent);
      } catch (error) {
        console.error("Error loading AAB document:", error);
        setDocumentError(error instanceof Error ? error.message : "Unbekannter Fehler beim Laden des Dokuments");
        setAabContent("");
      } finally {
        setIsLoadingDocument(false);
      }
    };
    
    loadAabDocument();
  }, [selectedAabFile, aDirectory, parserDefault, fileBaseName]);

  /**
   * Führt die AI-Kriterien-Extraktion aus
   */
  const handleExtractCriteria = async () => {
    if (!aabContent.trim()) {
      toast.error("Kein AAB-Dokument verfügbar");
      return;
    }

    if (!selectedAiQuery) {
      toast.error("Bitte wählen Sie eine Analyseart aus");
      return;
    }

    setIsExtracting(true);
    setDebugInfo({}); // Reset debug info
    
    try {
      const apiRequestBody = {
        queryType: selectedAiQuery,
        context: aabContent,
      };
      
      // Store API request for debugging
      setDebugInfo(prev => ({
        ...prev,
        apiRequest: {
          url: '/api/ai/gem/stream',
          method: 'POST',
          body: apiRequestBody,
          timestamp: new Date().toISOString(),
          contextLength: aabContent.length
        }
      }));
      
      const response = await fetch('/api/ai/gem/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let rawResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawResponse += decoder.decode(value, { stream: true });
      }

      // Store comprehensive debug information for later review
      const debugData = {
        timestamp: new Date().toISOString(),
        rawResponse,
        selectedAiQuery,
        aabFileName: selectedAabFile?.name || 'unknown',
        aabContentLength: aabContent.length,
        apiEndpoint: '/api/ai/gem/stream',
        requestBody: apiRequestBody
      };
      
      setDebugInfo(prev => ({
        ...prev,
        ...debugData,
        // Keep history of all responses for review
        responseHistory: [...(prev.responseHistory || []), debugData]
      }));
      
      // Parse JSON response
      let parsedCriteria: KriterienExtraktion;
      console.log("Raw AI Response:", rawResponse); // DEBUGGING
      try {
        // Aggressively find and extract the main JSON object from the response string.
        const firstBrace = rawResponse.indexOf('{');
        const lastBrace = rawResponse.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace > firstBrace) {
          const jsonString = rawResponse.substring(firstBrace, lastBrace + 1);
          parsedCriteria = JSON.parse(jsonString);
        } else {
          throw new Error("Could not find a valid JSON object in the AI response.");
        }
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
        setDebugInfo(prev => ({
          ...prev,
          parseError: errorMessage
        }));
        throw new Error(`Fehler beim Parsen der AI-Response: ${errorMessage}`);
      }

      // Validate extracted criteria
      if (!validateKriterienExtraktion(parsedCriteria)) {
        throw new Error('Extrahierte Kriterien entsprechen nicht dem erwarteten Schema');
      }

      setExtractedCriteria(parsedCriteria);
      setActiveTab("criteria");
      toast.success("Kriterien erfolgreich extrahiert");
      
    } catch (error) {
      console.error('Fehler bei Kriterien-Extraktion:', error);
      toast.error(`Fehler bei der Extraktion: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  /**
   * Togglet die Expansion einer Sektion
   */
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  /**
   * Rendert Review-Status Badge
   */
  const renderReviewStatus = (aiReviewed: boolean, humanReviewed: boolean) => {
    if (humanReviewed) {
      return (
        <Badge variant="default" className="gap-1">
          <User className="h-3 w-3" />
          Human Review
        </Badge>
      );
    } else if (aiReviewed) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Bot className="h-3 w-3" />
          AI Review
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Ausstehend
        </Badge>
      );
    }
  };

  return (
    <section className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Kriterien-Extraktion für {selectedProject ?? "kein Projekt"}
          </h1>
          {selectedAabFile && (
            <p className="text-sm text-gray-600 mt-1">
              AAB-Dokument: {selectedAabFile.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Analyseart auswählen:</label>
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
          </div>
          <Button 
            onClick={handleExtractCriteria}
            disabled={isExtracting || isLoadingDocument || !aabContent || !selectedAiQuery}
            className="flex items-center gap-2"
          >
            {(isExtracting || isLoadingDocument) && <Loader2 className="h-4 w-4 animate-spin" />}
            <Sparkles className="h-4 w-4" />
            {isExtracting ? "Extrahiere..." : isLoadingDocument ? "Lade Dokument..." : "Kriterien extrahieren"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="source" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quelldokument
          </TabsTrigger>
          <TabsTrigger value="criteria" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Extrahierte Kriterien
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Review
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <MoreHorizontal className="h-4 w-4" />
            Debug
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="source" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AAB Strukturdokument
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDocument ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Lade AAB-Dokument...</span>
                </div>
              ) : documentError ? (
                <div className="text-red-600 p-4 bg-red-50 rounded-md">
                  <p className="font-medium">Fehler beim Laden des Dokuments:</p>
                  <p className="text-sm mt-1">{documentError}</p>
                </div>
              ) : !selectedAabFile ? (
                <div className="text-gray-600 p-4 bg-gray-50 rounded-md">
                  <p>Kein AAB-Dokument im Projekt gefunden.</p>
                  <p className="text-sm mt-1">Stellen Sie sicher, dass eine AAB-PDF-Datei im A-Verzeichnis vorhanden ist.</p>
                </div>
              ) : aabContent ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <p><strong>Datei:</strong> {selectedAabFile.name}</p>
                    <p><strong>Parser:</strong> {parserDefault}</p>
                    <p><strong>Zeichen:</strong> {aabContent.length.toLocaleString()}</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto border rounded-md p-4 bg-gray-50">
                    <pre className="whitespace-pre-wrap text-sm">{aabContent}</pre>
                  </div>
                </div>
              ) : (
                <div className="text-gray-600 p-4 bg-gray-50 rounded-md">
                  <p>Dokument ist leer oder konnte nicht gelesen werden.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criteria" className="space-y-4">
          {extractedCriteria && (
            <>
              {/* Eignungskriterien */}
              <Card>
                <CardHeader>
                  <CardTitle>Eignungskriterien</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(extractedCriteria.eignungskriterien).map(([category, criteria]) => (
                    <Collapsible 
                      key={category}
                      open={expandedSections[category]}
                      onOpenChange={() => toggleSection(category)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-2">
                          <span className="font-medium capitalize">
                            {category.replace(/_/g, ' ')}
                          </span>
                          {expandedSections[category] ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {criteria.map((kriterium, index) => (
                          <div key={index} className="border rounded p-3 space-y-2">
                            <div className="font-medium">{kriterium.kriterium}</div>
                            <div className="space-y-1">
                              {kriterium.nachweise.map((nachweis, nIndex) => (
                                <div key={nIndex} className="text-sm bg-muted p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={nachweis.typ === 'PFLICHT' ? 'default' : 'secondary'}>
                                      {nachweis.typ}
                                    </Badge>
                                    <span>{nachweis.dokument}</span>
                                  </div>
                                  {nachweis.gueltigkeit && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Gültigkeit: {nachweis.gueltigkeit}
                                    </div>
                                  )}
                                  {nachweis.hinweis && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Hinweis: {nachweis.hinweis}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>

              {/* Zuschlagskriterien */}
              <Card>
                <CardHeader>
                  <CardTitle>Zuschlagskriterien</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {extractedCriteria.zuschlagskriterien.map((los, index) => (
                      <div key={index} className="border rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">
                              {los.los.nummer ? `Los ${los.los.nummer}` : 'Hauptauftrag'}: {los.los.bezeichnung}
                            </h4>
                            <Badge variant="outline">{los.prinzip}</Badge>
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Kriterium</TableHead>
                              <TableHead>Gewichtung</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {los.kriterien.map((kriterium, kIndex) => (
                              <TableRow key={kIndex}>
                                <TableCell>{kriterium.name}</TableCell>
                                <TableCell>{kriterium.gewichtung}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Subunternehmerregelung */}
              <Card>
                <CardHeader>
                  <CardTitle>Subunternehmerregelung</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {extractedCriteria.subunternehmerregelung.map((regel, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm">{regel}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Formale Anforderungen */}
              <Card>
                <CardHeader>
                  <CardTitle>Formale Anforderungen</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {extractedCriteria.formale_anforderungen.map((anforderung, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm">{anforderung}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          {extractedCriteria && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Bearbeitung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Review-Funktionalität wird in der nächsten Version implementiert.</p>
                  <p className="text-sm mt-2">
                    Hier können Sie die extrahierten Kriterien manuell überprüfen und bearbeiten.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug-Informationen & Response-Historie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Session Info */}
              {debugInfo.timestamp && (
                <div>
                  <h4 className="font-medium mb-2">Aktuelle Session</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p><strong>Timestamp:</strong> {debugInfo.timestamp}</p>
                    <p><strong>AI Query:</strong> {debugInfo.selectedAiQuery}</p>
                    <p><strong>AAB Datei:</strong> {debugInfo.aabFileName}</p>
                    <p><strong>Content Length:</strong> {debugInfo.aabContentLength?.toLocaleString()} Zeichen</p>
                    <p><strong>API Endpoint:</strong> {debugInfo.apiEndpoint}</p>
                  </div>
                </div>
              )}
              
              {/* Current Raw Response */}
              {debugInfo.rawResponse && (
                <div>
                  <h4 className="font-medium mb-2">Aktuelle AI Response</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm mb-2">
                      <strong>Response Length:</strong> {debugInfo.rawResponse.length.toLocaleString()} Zeichen
                    </p>
                    <div className="bg-white p-3 rounded border max-h-96 overflow-auto">
                      <pre className="text-xs whitespace-pre-wrap">{debugInfo.rawResponse}</pre>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Parse Error */}
              {debugInfo.parseError && (
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Parse Error</h4>
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="text-sm text-red-700">{debugInfo.parseError}</p>
                  </div>
                </div>
              )}
              
              {/* Response History */}
              {debugInfo.responseHistory && debugInfo.responseHistory.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Response-Historie ({debugInfo.responseHistory.length} Einträge)</h4>
                  <div className="space-y-3">
                    {debugInfo.responseHistory.slice().reverse().map((entry, index) => (
                      <Collapsible key={index}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 rounded hover:bg-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {new Date(entry.timestamp).toLocaleString('de-DE')}
                            </span>
                            <Badge variant="outline">{entry.selectedAiQuery}</Badge>
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 p-3 bg-white border rounded">
                          <div className="space-y-2 text-sm">
                            <p><strong>AAB Datei:</strong> {entry.aabFileName}</p>
                            <p><strong>Content Length:</strong> {entry.aabContentLength?.toLocaleString()} Zeichen</p>
                            <p><strong>Response Length:</strong> {entry.rawResponse.length.toLocaleString()} Zeichen</p>
                            <details className="mt-2">
                              <summary className="cursor-pointer font-medium">Request Body anzeigen</summary>
                              <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(entry.requestBody, null, 2)}
                              </pre>
                            </details>
                            <details className="mt-2">
                              <summary className="cursor-pointer font-medium">Raw Response anzeigen</summary>
                              <div className="mt-2 bg-gray-50 p-2 rounded max-h-64 overflow-auto">
                                <pre className="text-xs whitespace-pre-wrap">{entry.rawResponse}</pre>
                              </div>
                            </details>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              {!debugInfo.timestamp && !debugInfo.rawResponse && !debugInfo.parseError && (
                <div className="text-center py-8 text-muted-foreground">
                  <MoreHorizontal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Debug-Informationen verfügbar.</p>
                  <p className="text-sm mt-2">
                    Führen Sie eine Kriterien-Extraktion durch, um Debug-Informationen zu sehen.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
