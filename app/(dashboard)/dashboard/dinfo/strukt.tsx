import React, { useState, useEffect } from "react";
import { useProject } from "@/context/ProjectContext";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks"; // <--- Add this import
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
import { AlertCircle, Loader2, Eye, Edit3 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Strukt() {
  const { selectedProject, selectedDok } = useProject();
  const [markdown, setMarkdown] = useState<string>("");
  const [editedMarkdown, setEditedMarkdown] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [availableVariants, setAvailableVariants] = useState<
    Array<{ key: string; label: string; path: string }>
  >([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditingView, setIsEditingView] = useState<boolean>(false);

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
    setEditedMarkdown(markdown);
  }, [markdown]);

  useEffect(() => {
    const loadMarkdown = async () => {
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

        const variantToLoad = selectedVariant
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

  const handleSaveMarkdown = async () => {
    if (!selectedVariant || !parentDir) {
      setError("Speichern nicht möglich: Fehlende Konfiguration.");
      return;
    }

    const variantToSave = availableVariants.find(
      (v) => v.label === selectedVariant
    );
    if (!variantToSave) {
      setError("Speichern nicht möglich: Ausgewählte Variante nicht gefunden.");
      return;
    }

    setIsSaving(true);
    setDebugInfo((prev) => [
      ...prev,
      `Attempting to save: ${variantToSave.path}`,
    ]);

    try {
      const fullPath = variantToSave.path;
      const pathParts = fullPath.split("/");
      const fileName = pathParts.pop();
      const directoryPath = pathParts.join("/") + "/";

      if (!fileName) {
        throw new Error("Ungültiger Dateipfad zum Speichern.");
      }

      const file = new File([editedMarkdown], fileName, {
        type: "text/markdown",
      });
      const formData = new FormData();
      formData.append("files", file);

      const params = new URLSearchParams({
        path: directoryPath,
      });

      const response = await fetch(`/api/fs/upload?${params.toString()}`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (
        !response.ok ||
        (Array.isArray(result) && result[0] && !result[0].ok)
      ) {
        const errorMessage =
          Array.isArray(result) && result[0] && result[0].error
            ? result[0].error
            : `Fehler beim Speichern: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      setMarkdown(editedMarkdown);
      setDebugInfo((prev) => [
        ...prev,
        `Successfully saved ${fileName} to ${directoryPath}`,
      ]);
      setError(null);
      setIsEditingView(false);
    } catch (err) {
      console.error("Failed to save markdown:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Fehler beim Speichern: ${errorMessage}`);
      setDebugInfo((prev) => [...prev, `Save Error: ${errorMessage}`]);
    } finally {
      setIsSaving(false);
    }
  };

  const markdownComponents = {
    h1: ({ node, ...props }: any) => (
      <h1 className="text-lg font-bold mt-4 mb-2" {...props} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 className="text-base font-bold mt-3 mb-1" {...props} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 className="text-base font-bold mt-2 mb-1" {...props} />
    ),
    h4: ({ node, ...props }: any) => (
      <h4 className="text-sm font-bold mt-2 mb-1" {...props} />
    ),
    h5: ({ node, ...props }: any) => (
      <h5 className="text-sm font-bold mt-1 mb-1" {...props} />
    ),
    h6: ({ node, ...props }: any) => (
      <h6 className="text-xs font-bold mt-1 mb-1" {...props} />
    ),
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
        <div className="w-full my-4 overflow-x-auto border border-gray-200 rounded-md">
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
          className="px-3 py-2 text-sm whitespace-normal border-t border-gray-100"
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
        <div className="mb-2 flex flex-wrap items-center gap-y-2">
          <Tabs
            value={selectedVariant || availableVariants[0]?.label}
            onValueChange={handleVariantChange}
            className="min-w-0 flex-grow-0">
            <TabsList className="flex flex-wrap">
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

          <div className="flex items-center ml-auto flex-shrink-0">
            {selectedVariant && (
              <Button
                onClick={handleSaveDefaultParser}
                className="whitespace-nowrap mr-2">
                Setze Default Strukt
              </Button>
            )}
            {isEditingView && (
              <Button
                onClick={handleSaveMarkdown}
                disabled={isSaving || !selectedVariant}
                className="mr-2">
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isSaving ? "Speichern..." : "Speichern"}
              </Button>
            )}
            {(markdown || editedMarkdown) && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsEditingView(!isEditingView)}
                title={isEditingView ? "Vorschau anzeigen" : "Bearbeiten"}>
                {isEditingView ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {markdown || editedMarkdown ? (
        <Card className="border border-gray-200 min-w-0">
          <CardContent className="p-0 overflow-hidden">
            <ScrollArea className="h-[70vh] rounded-md min-w-0">
              <div className="p-6">
                {isEditingView ? (
                  <>
                    <Textarea
                      value={editedMarkdown}
                      onChange={(e) => setEditedMarkdown(e.target.value)}
                      className="min-h-[60vh] w-full font-mono text-sm border rounded-md p-2 prose prose-xs"
                      placeholder="Markdown-Inhalt hier bearbeiten..."
                    />
                  </>
                ) : (
                  (() => {
                    const frontmatterRegex =
                      /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
                    let infoHeader: string | null = null;
                    let contentForMarkdown: string = editedMarkdown;

                    const matchResult = editedMarkdown.match(frontmatterRegex);

                    if (matchResult && typeof matchResult[1] === "string") {
                      infoHeader = matchResult[1].trim();
                      // Ensure contentForMarkdown is a string, even if matchResult[2] is undefined (though unlikely with current regex)
                      contentForMarkdown =
                        typeof matchResult[2] === "string"
                          ? matchResult[2]
                          : "";
                    }

                    return (
                      <>
                        {infoHeader && (
                          <details className="mb-4 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                            <summary className="bg-gray-100 dark:bg-gray-800 px-4 py-2 cursor-pointer text-sm font-medium">
                              Info Header
                            </summary>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700">
                              <pre className="text-xs font-mono whitespace-pre-wrap">
                                {infoHeader}
                              </pre>
                            </div>
                          </details>
                        )}
                        <div className="prose dark:prose-invert max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={markdownComponents}>
                            {contentForMarkdown}
                          </ReactMarkdown>
                        </div>
                      </>
                    );
                  })()
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <div className="p-8 text-center text-gray-500">
          <p>Keine Strukturdaten verfügbar.</p>
        </div>
      )}

      {debugInfo.length > 0 && (
        <details className="mt-8 border border-gray-200 rounded-md overflow-hidden">
          <summary className="bg-gray-50 px-4 py-2 cursor-pointer text-sm font-medium">
            Dev Info
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
