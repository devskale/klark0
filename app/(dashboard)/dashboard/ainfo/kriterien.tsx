"use client";

import { useProject } from "@/context/ProjectContext";
import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  fileTreeFetcher,
  normalizePath,
} from "@/lib/fs/fileTreeUtils-new";
import { saveKriterienToFile, loadKriterienFromFile, KriterienMetadata } from "@/lib/kriterien/persistence";
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
import { CheckCircle2, Clock, Edit, Sparkles, MoreHorizontal, FileText, ChevronDown, ChevronRight, Eye, User, Bot, Loader2, AlertCircle, Save } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KriterienExtraktion, validateKriterienExtraktion, KriteriumObjekt } from "@/types/kriterien";
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
  
  // Load saved criteria from filesystem using SWR
  const { data: savedKriterienData, mutate: mutateSavedKriterien } = useSWR(
    projectDir ? `kriterien-${projectDir}` : null,
    async () => {
      if (!projectDir) return null;
      return await loadKriterienFromFile(projectDir);
    },
    { revalidateOnFocus: false }
  );
  
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
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
    responseHistory?: any[];
    selectedAiQuery?: string;
    aabFileName?: string;
    aabContentLength?: number;
    apiEndpoint?: string;
    requestBody?: any;
  }>({});
  
  // Effect to load saved criteria when component mounts or project changes
  useEffect(() => {
    if (savedKriterienData?.extractedCriteria) {
      setExtractedCriteria(savedKriterienData.extractedCriteria);
      setLastSaved(savedKriterienData.lastModified);
    }
  }, [savedKriterienData]);

  const handleSaveKriterien = async () => {
    if (!extractedCriteria || !projectDir) {
      setSaveError("Keine Kriterien zum Speichern vorhanden");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const metadata = {
        aabFileName: selectedAabFile?.name || "unknown",
        extractionMethod: "KRITERIEN_EXTRAKTION",
        reviewStatus: {
          aiReviewed: true,
          humanReviewed: false,
        }
      };

      const result = await saveKriterienToFile(projectDir, extractedCriteria, metadata);
      
      if (result.success) {
        setLastSaved(new Date().toISOString());
        // Revalidate SWR cache
        await mutateSavedKriterien();
        toast.success("Kriterien erfolgreich gespeichert");
      } else {
        setSaveError(result.error || "Fehler beim Speichern");
        toast.error("Fehler beim Speichern der Kriterien");
      }
    } catch (err) {
      console.error("Error saving criteria:", err);
      setSaveError(
        err instanceof Error ? err.message : "Unbekannter Fehler beim Speichern"
      );
      toast.error("Fehler beim Speichern der Kriterien");
    } finally {
      setIsSaving(false);
    }
  };

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
   * Berechnet die Gesamtanzahl aller nummerierten Kriterien-Elemente
   */
  const calculateTotalCriteria = (criteria: KriterienExtraktion | null): number => {
    if (!criteria) return 0;
    
    let total = 0;
    
    // Eignungskriterien: Kategorien + Kriterien + Nachweise zählen
    const eignungsCategories = Object.keys(criteria.eignungskriterien).length;
    total += eignungsCategories; // Kategorien (1.1, 1.2, etc.)
    
    Object.values(criteria.eignungskriterien).forEach(categoryItems => {
      if (Array.isArray(categoryItems)) {
        total += categoryItems.length; // Kriterien (1.1.1, 1.1.2, etc.)
        // Nachweise in Eignungskriterien zählen (1.1.1.1, 1.1.1.2, etc.)
        categoryItems.forEach(item => {
          if (item.nachweise && Array.isArray(item.nachweise)) {
            total += item.nachweise.length;
          }
        });
      }
    });
    
    // Zuschlagskriterien: Los + Kriterien + Unterkriterien zählen
    if (Array.isArray(criteria.zuschlagskriterien)) {
      total += criteria.zuschlagskriterien.length; // Los-Ebene (2.1, 2.2, etc.)
      
      criteria.zuschlagskriterien.forEach(los => {
        if (los.kriterien && Array.isArray(los.kriterien)) {
          total += los.kriterien.length; // Kriterien (2.1.1, 2.1.2, etc.)
          
          // Unterkriterien zählen (2.1.1.1, 2.1.1.2, etc.)
          los.kriterien.forEach(kriterium => {
            if (kriterium.unterkriterien && Array.isArray(kriterium.unterkriterien)) {
              total += kriterium.unterkriterien.length;
            }
          });
        }
      });
    }
    
    // Formale Anforderungen zählen (4.1, 4.2, etc.)
    if (Array.isArray(criteria.formale_anforderungen)) {
      total += criteria.formale_anforderungen.length;
    }
    
    // Subunternehmerregelung zählen (3.1, 3.2, etc.)
    if (Array.isArray(criteria.subunternehmerregelung)) {
      total += criteria.subunternehmerregelung.length;
    }
    
    return total;
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
          {lastSaved && (
            <div className="flex items-center gap-2 mt-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">
                Zuletzt gespeichert: {new Date(lastSaved).toLocaleString('de-DE')}
              </span>
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 mt-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">
                Fehler beim Speichern: {saveError}
              </span>
            </div>
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
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleExtractCriteria}
              disabled={isExtracting || isLoadingDocument || !aabContent || !selectedAiQuery}
              className="flex items-center gap-2"
            >
              {(isExtracting || isLoadingDocument) && <Loader2 className="h-4 w-4 animate-spin" />}
              <Sparkles className="h-4 w-4" />
              {isExtracting ? "Extrahiere..." : isLoadingDocument ? "Lade Dokument..." : "Kriterien extrahieren"}
            </Button>
            
            {extractedCriteria && (
              <Button 
                onClick={handleSaveKriterien}
                disabled={isSaving}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "Speichere..." : "Kriterien speichern"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Saved Criteria Status */}
      {savedKriterienData && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-800">Gespeicherte Kriterien gefunden</h3>
                  <p className="text-sm text-green-600">
                    Extrahiert am: {new Date(savedKriterienData.extractionTimestamp).toLocaleString('de-DE')}
                    {savedKriterienData.aabFileName && ` aus ${savedKriterienData.aabFileName}`}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {savedKriterienData.reviewStatus?.humanReviewed ? 'Geprüft' : 'AI-Extraktion'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

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
              {/* Kriterien-Statistiken */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-blue-800">Kriterien-Übersicht</h3>
                        <p className="text-sm text-blue-600">
                          Insgesamt {calculateTotalCriteria(extractedCriteria)} Kriterien extrahiert
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-blue-800">
                          {Object.values(extractedCriteria.eignungskriterien).reduce((acc, cat) => 
                            acc + (Array.isArray(cat) ? cat.length : 0), 0
                          )}
                        </div>
                        <div className="text-blue-600">Eignungskriterien</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-blue-800">
                          {Array.isArray(extractedCriteria.zuschlagskriterien) ? 
                            extractedCriteria.zuschlagskriterien.reduce((acc, los) => 
                              acc + (los.kriterien ? los.kriterien.length : 0), 0
                            ) : 0
                          }
                        </div>
                        <div className="text-blue-600">Zuschlagskriterien</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Eignungskriterien */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-sm">
                      1.
                    </Badge>
                    Eignungskriterien
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(extractedCriteria.eignungskriterien).map(([category, criteria], categoryIndex) => {
                    const categoryNumber = `1.${categoryIndex + 1}`;
                    return (
                      <Collapsible 
                        key={category}
                        open={expandedSections[category]}
                        onOpenChange={() => toggleSection(category)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-2">
                            <span className="font-medium capitalize flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {categoryNumber}
                              </Badge>
                              {category.replace(/_/g, ' ')}
                            </span>
                            {expandedSections[category] ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mt-2">
                          {criteria.map((kriterium: KriteriumObjekt, index: number) => {
                            const kriteriumNumber = `${categoryNumber}.${index + 1}`;
                            return (
                              <div key={index} className="border rounded p-3 space-y-2">
                                <div className="flex items-start gap-3">
                                  <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
                                    {kriteriumNumber}
                                  </Badge>
                                  <div className="font-medium flex-1">{kriterium.kriterium}</div>
                                </div>
                                <div className="space-y-1 ml-12">
                                  {kriterium.nachweise.map((nachweis, nIndex) => {
                                    const nachweisNumber = `${kriteriumNumber}.${nIndex + 1}`;
                                    return (
                                      <div key={nIndex} className="text-sm bg-muted p-2 rounded">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="font-mono text-xs">
                                            {nachweisNumber}
                                          </Badge>
                                          <Badge variant={nachweis.typ === 'PFLICHT' ? 'default' : 'secondary'}>
                                            {nachweis.typ}
                                          </Badge>
                                          <span>{nachweis.dokument}</span>
                                        </div>
                                        {nachweis.gueltigkeit && (
                                          <div className="text-xs text-muted-foreground mt-1 ml-16">
                                            Gültigkeit: {nachweis.gueltigkeit}
                                          </div>
                                        )}
                                        {nachweis.hinweis && (
                                          <div className="text-xs text-muted-foreground mt-1 ml-16">
                                            Hinweis: {nachweis.hinweis}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Zuschlagskriterien */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-sm">
                      2.
                    </Badge>
                    Zuschlagskriterien
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {extractedCriteria.zuschlagskriterien.map((los, index) => {
                    const losNumber = `2.${index + 1}`;
                    return (
                      <Collapsible 
                        key={index}
                        open={expandedSections[`los-${index}`]}
                        onOpenChange={() => toggleSection(`los-${index}`)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-2">
                            <span className="font-medium flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {losNumber}
                              </Badge>
                              {los.los.nummer ? `Los ${los.los.nummer}` : 'Hauptauftrag'}: {los.los.bezeichnung}
                            </span>
                            {expandedSections[`los-${index}`] ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mt-2">
                          <div className="border rounded p-4">
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant="outline">{los.prinzip}</Badge>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nr.</TableHead>
                                  <TableHead>Kriterium</TableHead>
                                  <TableHead>Gewichtung</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {los.kriterien.map((kriterium, kIndex) => {
                                  const kriteriumNumber = `${losNumber}.${kIndex + 1}`;
                                  return (
                                    <TableRow key={kIndex}>
                                      <TableCell>
                                        <Badge variant="outline" className="font-mono text-xs">
                                          {kriteriumNumber}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{kriterium.name}</TableCell>
                                      <TableCell>{kriterium.gewichtung}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Subunternehmerregelung */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-sm">
                      3.
                    </Badge>
                    Subunternehmerregelung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {extractedCriteria.subunternehmerregelung.map((regel, index) => {
                      const regelNumber = `3.${index + 1}`;
                      return (
                        <li key={index} className="flex items-start gap-3">
                          <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
                            {regelNumber}
                          </Badge>
                          <span className="text-sm flex-1">{regel}</span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>

              {/* Formale Anforderungen */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-sm">
                      4.
                    </Badge>
                    Formale Anforderungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {extractedCriteria.formale_anforderungen.map((anforderung, index) => {
                      const anforderungNumber = `4.${index + 1}`;
                      return (
                        <li key={index} className="flex items-start gap-3">
                          <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
                            {anforderungNumber}
                          </Badge>
                          <span className="text-sm flex-1">{anforderung}</span>
                        </li>
                      );
                    })}
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
