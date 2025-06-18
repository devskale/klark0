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
import { AlertCircle, Loader2, Eye, Check, Wand2 } from "lucide-react";
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

export default function Aidok() {
  const { selectedProject, selectedDok } = useProject();
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [availableVariants, setAvailableVariants] = useState<
    Array<{ key: string; label: string; path: string }>
  >([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
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

  const parentDir = selectedDok
    ? normalizePath(selectedDok.replace(/\/[^\/]+$/, ""))
    : null;

  const { data: indexData, mutate: mutateIndex } = useSWR(
    parentDir ? parentDir + PDF2MD_INDEX_FILE_NAME : null,
    async (path) => {
      const params = new URLSearchParams({ path });
      const res = await fetch(`/api/fs?${params.toString()}`);
      if (!res.ok) return null;
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  const [parserOptions, setParserOptions] = useState<string[]>([]);
  const [defaultParser, setDefaultParser] = useState<string>("");
  const fileBaseName = selectedDok
    ? decodeURIComponent(selectedDok.split("/").pop()!)
    : "";
  const baseName = fileBaseName.replace(/\.[^/.]+$/, "");

  // Check KI configuration status
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

  useEffect(() => {
    if (!indexData || !selectedDok) return;
    const fileBase = decodeURIComponent(selectedDok.split("/").pop()!);
    const entry = indexData.files?.find((f: any) => f.name === fileBase);
    if (entry) {
      setParserOptions(entry.parsers?.det || []);
      setDefaultParser(entry.parsers?.default || "");
    }
  }, [indexData, selectedDok]);

  useEffect(() => {
    const loadMarkdown = async () => {
      if (selectedVariant === "") {
        setLoading(false);
        setError(null);
        setDebugInfo([]);
        setMarkdown("");
        return;
      }

      if (!selectedDok || !indexData) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setDebugInfo([]);

        const fileBaseName = selectedDok
          ? decodeURIComponent(selectedDok.split("/").pop()!)
          : "";

        const debugLog: string[] = [];
        debugLog.push(`Looking for markdown file for: ${fileBaseName}`);

        const fileEntry = indexData.files?.find(
          (f: any) => f.name === fileBaseName
        );
        if (!fileEntry) {
          throw new Error(`File entry not found in index for: ${fileBaseName}`);
        }

        const parserDefault = fileEntry.parsers?.default || "docling";
        const parserDet = fileEntry.parsers?.det || [parserDefault];
        debugLog.push(`Default parser type: ${parserDefault}`);
        debugLog.push(`Available parsers: ${parserDet.join(", ")}`);

        const baseName = fileBaseName.replace(/\.[^/.]+$/, "");
        debugLog.push(`Base name without extension: ${baseName}`);

        const variants: Array<{ key: string; label: string; path: string }> =
          [];

        debugLog.push(
          `MARKER DEBUG: Checking for marker files regardless of parser list`
        );
        try {
          const mdBaseParams = new URLSearchParams({
            path: `${parentDir}md/${baseName}/`,
          });

          const mdBaseResponse = await fetch(
            `/api/fs?${mdBaseParams.toString()}`
          );
          if (mdBaseResponse.ok) {
            const baseContents = await mdBaseResponse.json();
            debugLog.push(
              `MARKER DEBUG: Found subdirectory md/${baseName}/ with ${baseContents.length} items`
            );

            const markerFile = baseContents.find(
              (item: any) =>
                item.type === "file" && item.name.endsWith(".marker.md")
            );

            if (markerFile) {
              debugLog.push(
                `MARKER DEBUG: Found marker file: ${markerFile.name}`
              );

              const markerPath = `${parentDir}md/${baseName}/${markerFile.name}`;
              variants.push({
                key: `${baseName}.marker.found`,
                label: "Marker",
                path: markerPath,
              });

              if (!parserDet.includes("marker")) {
                debugLog.push(`MARKER DEBUG: Adding marker to parser list`);
                parserDet.push("marker");
              }
            } else {
              debugLog.push(
                `MARKER DEBUG: No marker file found in md/${baseName}/ directory`
              );
            }
          } else {
            debugLog.push(
              `MARKER DEBUG: Subdirectory md/${baseName}/ does not exist`
            );
          }
        } catch (markerCheckError) {
          debugLog.push(
            `MARKER DEBUG: Error checking for marker files: ${
              markerCheckError instanceof Error
                ? markerCheckError.message
                : String(markerCheckError)
            }`
          );
        }

        for (const parser of parserDet) {
          if (
            parser === "marker" &&
            variants.some((v) => v.label === "Marker")
          ) {
            continue;
          }

          if (parser === "marker") {
            const markerPath = `${parentDir}md/${baseName}/${baseName}.marker.md`;
            debugLog.push(`Adding marker file at: ${markerPath}`);
            debugLog.push(`VERBOSE: Looking for marker file:`);
            debugLog.push(`VERBOSE: Parent dir: ${parentDir}`);
            debugLog.push(`VERBOSE: Base name: ${baseName}`);
            debugLog.push(`VERBOSE: Full path constructed: ${markerPath}`);
            debugLog.push(
              `VERBOSE: Expected directory structure: parentDir/md/baseName/baseName.marker.md`
            );

            const altMarkerPaths = [
              `${parentDir}${baseName}/md/${baseName}/${baseName}.marker.md`,
              `${parentDir}${baseName}/md/${baseName}.marker.md`,
              `${parentDir}md/${baseName}.marker.md`,
            ];

            debugLog.push(`VERBOSE: Will also try alternative paths:`);
            altMarkerPaths.forEach((path, idx) => {
              debugLog.push(`VERBOSE: Alt path ${idx + 1}: ${path}`);
            });

            variants.push({
              key: `${baseName}.marker`,
              label: "Marker",
              path: markerPath,
            });

            altMarkerPaths.forEach((path, idx) => {
              variants.push({
                key: `${baseName}.marker.alt${idx + 1}`,
                label: `Marker (Alt ${idx + 1})`,
                path: path,
              });
            });
          } else {
            let path: string;
            if (parser === "md") {
              path = `${parentDir}md/${baseName}.md`;
            } else {
              path = `${parentDir}md/${baseName}.${parser}.md`;
            }
            debugLog.push(`Adding ${parser} at: ${path}`);

            variants.push({
              key: `${parser}-0`,
              label: parser,
              path: path,
            });
          }
        }

        try {
          const params = new URLSearchParams({
            path: `${parentDir}md/`,
          });

          const dirResponse = await fetch(`/api/fs?${params.toString()}`);

          if (dirResponse.ok) {
            const dirListing = await dirResponse.json();

            const mdFilePattern = new RegExp(
              `^${baseName}(?:_red)?\\.([a-zA-Z0-9]+)\\.md$`
            );

            for (const file of dirListing) {
              if (file.type !== "file") continue;

              const match = file.name.match(mdFilePattern);
              if (!match) continue;

              const parserType = match[1].toLowerCase();

              if (parserDet.includes(parserType)) continue;

              variants.push({
                key: `discovered-${parserType}`,
                label: `${parserType} (Entdeckt)`,
                path: `${parentDir}md/${file.name}`,
              });

              debugLog.push(
                `Discovered additional parser: ${parserType} at ${file.name}`
              );
            }
          }
        } catch (dirError) {
          debugLog.push(
            `Error scanning md directory: ${
              dirError instanceof Error ? dirError.message : String(dirError)
            }`
          );
        }

        setAvailableVariants(variants);

        debugLog.push(`DEBUG: Available variants (${variants.length}):`);
        variants.forEach((v, idx) => {
          debugLog.push(`DEBUG: Variant ${idx + 1}: ${v.label} - ${v.path}`);
        });

        if (!selectedVariant && variants.length > 0) {
          const defaultVariant = variants.find(
            (v) => v.label.toLowerCase() === parserDefault
          );
          setSelectedVariant(
            defaultVariant ? defaultVariant.label : variants[0].label
          );
        }

        const variantToLoad =
          selectedVariant !== null
            ? variants.find((v) => v.label === selectedVariant)
            : variants[0];

        if (!variantToLoad) {
          throw new Error("Keine gültigen Markdown-Varianten gefunden");
        }

        debugLog.push(
          `DEBUG: Selected variant to load: ${variantToLoad.label} at ${variantToLoad.path}`
        );

        if (fileEntry.parsers?.det && Array.isArray(fileEntry.parsers.det)) {
          debugLog.push(
            `DEBUG: Parser types in index: ${fileEntry.parsers.det.join(", ")}`
          );
          debugLog.push(
            `DEBUG: Marker in index: ${fileEntry.parsers.det.includes(
              "marker"
            )}`
          );
        }

        try {
          const response = await fetch("/api/fs/read", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: variantToLoad.path,
            }),
          });

          if (!response.ok) {
            debugLog.push(`Fetch failed with status: ${response.status}`);
            debugLog.push(
              `VERBOSE: Failed to load path: ${variantToLoad.path}`
            );

            if (
              variantToLoad.label === "Marker" ||
              variantToLoad.label.includes("Marker (Alt")
            ) {
              debugLog.push(`MARKER DEBUG: Failed to load marker file`);
              debugLog.push(
                `MARKER DEBUG: Checking if marker is in parserDet array: ${parserDet.includes(
                  "marker"
                )}`
              );

              try {
                const mdDirParams = new URLSearchParams({
                  path: `${parentDir}md/`,
                });

                const mdDirResponse = await fetch(
                  `/api/fs?${mdDirParams.toString()}`
                );
                if (mdDirResponse.ok) {
                  const mdDirContents = await mdDirResponse.json();
                  debugLog.push(
                    `MARKER DEBUG: md/ directory exists and contains ${mdDirContents.length} items`
                  );

                  const baseNameDir = mdDirContents.find(
                    (item: any) =>
                      item.type === "directory" && item.name === baseName
                  );

                  if (baseNameDir) {
                    debugLog.push(
                      `MARKER DEBUG: Found directory ${baseName}/ inside md/`
                    );

                    const baseNameDirParams = new URLSearchParams({
                      path: `${parentDir}md/${baseName}/`,
                    });

                    const baseNameDirResponse = await fetch(
                      `/api/fs?${baseNameDirParams.toString()}`
                    );
                    if (baseNameDirResponse.ok) {
                      const baseNameDirContents =
                        await baseNameDirResponse.json();
                      debugLog.push(
                        `MARKER DEBUG: ${baseName}/ contains ${baseNameDirContents.length} items`
                      );

                      const markerFile = baseNameDirContents.find((item: any) =>
                        item.name.endsWith(".marker.md")
                      );

                      if (markerFile) {
                        debugLog.push(
                          `MARKER DEBUG: Found marker file: ${markerFile.name} - adding correct path`
                        );

                        const correctPath = `${parentDir}md/${baseName}/${markerFile.name}`;
                        variants.push({
                          key: `${baseName}.marker.correct`,
                          label: `Marker (Gefunden)`,
                          path: correctPath,
                        });
                      } else {
                        debugLog.push(
                          `MARKER DEBUG: No marker file found in ${baseName}/ directory`
                        );
                      }
                    } else {
                      debugLog.push(
                        `MARKER DEBUG: Could not read ${baseName}/ directory`
                      );
                    }
                  } else {
                    debugLog.push(
                      `MARKER DEBUG: No directory named ${baseName}/ found in md/ directory`
                    );
                  }
                } else {
                  debugLog.push(`MARKER DEBUG: Could not read md/ directory`);
                }
              } catch (dirCheckError) {
                debugLog.push(
                  `MARKER DEBUG: Error checking directories: ${
                    dirCheckError instanceof Error
                      ? dirCheckError.message
                      : String(dirCheckError)
                  }`
                );
              }
            }

            throw new Error(
              `Fehler beim Laden der Markdown-Datei: ${response.statusText}`
            );
          }

          const data = await response.json();

          if (data.content) {
            setMarkdown(data.content);
            debugLog.push(
              `Successfully loaded markdown content (${data.content.length} chars)`
            );
          } else {
            throw new Error(
              "Markdown-Datei ist leer oder hat ein ungültiges Format"
            );
          }
        } catch (fetchError) {
          debugLog.push(
            `Error fetching content: ${
              fetchError instanceof Error
                ? fetchError.message
                : String(fetchError)
            }`
          );

          let foundContent = false;

          for (const variant of variants) {
            if (variant.path === variantToLoad.path) continue;

            debugLog.push(`Trying alternative path: ${variant.path}`);

            try {
              const altResponse = await fetch("/api/fs/read", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  path: variant.path,
                }),
              });

              if (!altResponse.ok) {
                debugLog.push(
                  `Alternative fetch failed with status: ${altResponse.status}`
                );
                continue;
              }

              const altData = await altResponse.json();

              if (altData.content) {
                setSelectedVariant(variant.label);
                setMarkdown(altData.content);
                debugLog.push(
                  `Successfully loaded markdown from alternative path (${altData.content.length} chars)`
                );
                foundContent = true;
                break;
              }
            } catch (altError) {
              debugLog.push(
                `Error with alternative: ${
                  altError instanceof Error
                    ? altError.message
                    : String(altError)
                }`
              );
            }
          }

          if (!foundContent) {
            throw new Error(`Keine Markdown-Inhalte für ${baseName} gefunden`);
          }
        }

        setDebugInfo(debugLog);
        setError(null);
      } catch (err) {
        console.error("Failed to load markdown:", err);
        setError(
          "Fehler beim Laden der Strukturdaten. Details siehe Debug-Informationen unten."
        );
        setDebugInfo((prev) => [
          ...prev,
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        ]);
        setMarkdown("");
      } finally {
        setLoading(false);
      }
    };

    loadMarkdown();
  }, [selectedDok, indexData, parentDir, selectedVariant]);

  const handleVariantChange = async (variantLabel: string) => {
    if (variantLabel === selectedVariant) return;
    setSelectedVariant(variantLabel);
  };

  const handleSaveDefaultParser = async () => {
    if (!parentDir || !selectedDok || !selectedVariant) return;
    const fileBase = decodeURIComponent(selectedDok.split("/").pop()!);
    const idxPath = parentDir + PDF2MD_INDEX_FILE_NAME;

    const parserKey = selectedVariant.split(" ")[0].toLowerCase();

    await fetch("/api/fs/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        indexPath: idxPath,
        fileName: fileBase,
        parserDefault: parserKey,
      }),
    });
    mutateIndex();
  };
  const handleAiQuerySubmit = async () => {
    if (!selectedAiQuery || !markdown) {
      setAiError(
        "Bitte wählen Sie eine Analyseart aus und stellen Sie sicher, dass Strukturdaten geladen sind."
      );
      return;
    }

    setIsAiLoading(true);
    setAiResponse("");
    setAiError(null);

    try {
      console.log("Starting AI analysis with queryType:", selectedAiQuery);
      console.log("Context length:", markdown.length);
      
      const response = await fetch("/api/ai/gem/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queryType: selectedAiQuery,
          context: markdown,
        }),
      });

      if (!response.ok) {
        let errorMessage = `API-Fehler: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          if (errorData.details) {
            errorMessage += ` - ${errorData.details}`;
          }
        } catch (e) {
          // Could not parse error response
        }
        throw new Error(errorMessage);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          result += chunk;
          setAiResponse((prev) => prev + chunk);
        }
        
        console.log("AI analysis completed, total response length:", result.length);
      } else {
        throw new Error("Antwort des Servers enthält keinen Body.");
      }
    } catch (err: any) {
      console.error("AI query error:", err);
      let errorMessage = "Ein unbekannter Fehler ist aufgetreten.";
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Add specific error handling for common AI configuration issues
      if (err.message?.includes("Bearer token not configured")) {
        errorMessage = "KI-API-Token nicht konfiguriert. Bitte prüfen Sie die KI-Einstellungen.";
      } else if (err.message?.includes("User not authenticated")) {
        errorMessage = "Benutzer nicht authentifiziert. Bitte melden Sie sich erneut an.";
      } else if (err.message?.includes("KI-Einstellungen nicht gefunden")) {
        errorMessage = "KI-Einstellungen nicht gefunden. Bitte konfigurieren Sie die KI-Einstellungen in den Systemeinstellungen.";
      }
      
      setAiError(errorMessage);
    } finally {
      setIsAiLoading(false);
    }
  };

  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}>
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
      return (
        <td
          className="px-3 py-2 text-sm whitespace-nowrap border-t border-gray-100"
          {...props}
        />
      );
    },
    img({ node, src, alt, ...props }: any) {
      if (!src || src.match(/^https?:\/\//)) {
        return <img src={src} alt={alt} {...props} />;
      }
      const imagePath = `${parentDir}md/${baseName}/${src}`;
      const params = new URLSearchParams({
        path: imagePath,
      });
      return <img src={`/api/fs?${params.toString()}`} alt={alt} {...props} />;
    },
  };

  const tokenEstimate = markdown ? Math.ceil(markdown.length / 4) : 0;

  if (loading && !selectedVariant) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Lade Strukturdaten...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <h2 className="text-2xl font-bold mb-2">
        Strukturübersicht
        {markdown && (
          <span className="ml-4 text-sm text-gray-500">
            (~{tokenEstimate} Tokens)
          </span>
        )}
      </h2>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {availableVariants.length > 0 && (
        <div className="mb-2 flex items-center justify-between flex-wrap">
          <Tabs
            value={
              selectedVariant !== null
                ? selectedVariant
                : availableVariants[0]?.label
            }
            onValueChange={handleVariantChange}
            className="flex-1 min-w-[200px]">
            <TabsList className="flex flex-wrap">
              <TabsTrigger key="none" value="">
                None
              </TabsTrigger>
              {availableVariants.map((variant) => (
                <TabsTrigger key={variant.key} value={variant.label}>
                  {variant.label.toLowerCase() === defaultParser ? (
                    <strong>{variant.label}</strong>
                  ) : (
                    variant.label
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            {selectedVariant && (
              <Button
                onClick={handleSaveDefaultParser}
                className="whitespace-nowrap">
                <Check className="h-4 w-4 mr-2" />
              </Button>
            )}
            {markdown && selectedVariant && (
              <Dialog
                open={showPreviewModal}
                onOpenChange={setShowPreviewModal}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Vorschau anzeigen">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl w-[90vw] h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Vorschau: {selectedVariant}</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="flex-grow rounded-md border">
                    <div className="p-6 prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}>
                        {markdown}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 self-end">
                      Schließen
                    </Button>
                  </DialogClose>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      )}

      {!loading &&
        availableVariants.length === 0 &&
        !error &&
        markdown === "" && (
          <div className="p-8 text-center text-gray-500 border border-dashed rounded-md">
            <p>
              Keine Strukturdaten-Varianten für dieses Dokument gefunden oder
              ausgewählt.
            </p>
          </div>
        )}

      {markdown && selectedVariant && (
        <Card>          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Wand2 className="h-5 w-5 mr-2" />
                KI-Analyse der Strukturdaten
              </div>
              <div className="flex items-center space-x-2">
                {kiConfigStatus && (
                  <div className="flex items-center space-x-1 text-sm">
                    <div 
                      className={`w-2 h-2 rounded-full ${
                        kiConfigStatus.configured 
                          ? 'bg-green-500' 
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-muted-foreground">
                      {kiConfigStatus.configured 
                        ? `KI: ${kiConfigStatus.framework || 'OK'}` 
                        : 'KI: Nicht konfiguriert'
                      }
                    </span>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Select
                onValueChange={setSelectedAiQuery}
                value={selectedAiQuery}>
                <SelectTrigger>
                  <SelectValue placeholder="Analyseart auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AI_QUERIES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {key
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>            </div>
            
            {kiConfigStatus && !kiConfigStatus.configured && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>KI nicht konfiguriert</AlertTitle>
                <AlertDescription className="space-y-2">
                  <div>Die KI-Einstellungen sind noch nicht konfiguriert. Bitte richten Sie zunächst Ihren API-Token ein.</div>
                  <div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('/dashboard/einstellungen', '_blank')}
                    >
                      KI-Einstellungen öffnen
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
              <Button
              onClick={handleAiQuerySubmit}
              disabled={
                isAiLoading || 
                !selectedAiQuery || 
                (kiConfigStatus !== null && !kiConfigStatus.configured)
              }>
              {isAiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {kiConfigStatus && !kiConfigStatus.configured 
                ? "KI nicht konfiguriert" 
                : "Analyse starten"
              }
            </Button>{aiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysefehler</AlertTitle>
                <AlertDescription className="space-y-2">
                  <div>{aiError}</div>
                  {(aiError.includes("KI-API-Token nicht konfiguriert") || 
                    aiError.includes("KI-Einstellungen nicht gefunden")) && (
                    <div className="mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('/dashboard/einstellungen', '_blank')}
                      >
                        KI-Einstellungen öffnen
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {aiResponse && (
              <div className="mt-4 p-4 border rounded-md bg-muted/30">
                <h3 className="text-lg font-semibold mb-2">Analyseergebnis:</h3>
                <ScrollArea className="max-h-[40vh] w-full">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}>
                      {aiResponse}
                    </ReactMarkdown>
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
