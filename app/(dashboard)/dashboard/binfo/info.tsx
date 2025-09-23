import React from "react";
import { Sparkles, RefreshCw, Loader2, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trimName } from "@/lib/trim";
import { useProject } from "@/context/ProjectContext";
import useSWR from "swr";
import {
  fileTreeFetcher,
  normalizePath,
} from "@/lib/fs/fileTreeUtils";
import { EditableText } from "@/components/ui/editable-text";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AI_QUERIES } from "@/app/api/ai/config";

/**
 * Info component for Bieter (bidder) information
 * Provides editable fields for bieter metadata with AI-powered initialization
 */
export default function Info() {
  const { selectedProject, selectedBieter } = useProject();
  const bieterName = selectedBieter ?? "Bieter nicht verfügbar";

  // Decode URL-encoded bieter path for display
  const bieterPathDecoded = selectedBieter ? decodeURIComponent(selectedBieter) : "N/A";

  // Derive bieter directory path
  const bieterDir = selectedBieter ? normalizePath(selectedBieter) : null;

  // Side-car metadata JSON for bieter
  const metadataFileName = "audit.json";
  const metadataPath = bieterDir ? normalizePath(`${bieterDir}/${metadataFileName}`) : null;
  const { data: bieterMeta, mutate: mutateMeta } = useSWR(
    metadataPath,
    async (path) => {
      const res = await fetch('/api/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return JSON.parse(data.content);
    },
    { revalidateOnFocus: false }
  );

  // Fetch B directory contents to find bieter documents (B = Bieter directory)
  const bDirectory = bieterDir ? `${bieterDir}B/` : null;
  const { data: bieterContents, error: entriesError } = useSWR(
    bDirectory ? [bDirectory, { fileSystemType: "webdav" }] : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  // Find bieter PDF documents
  const bieterPdfFiles = bieterContents?.filter((item: any) => 
    item.type === "file" && 
    item.name.toLowerCase().endsWith(".pdf")
  ) || [];
  
  const selectedBieterFile = bieterPdfFiles.length > 0 ? bieterPdfFiles[0] : null;
  
  // Get basename of a file without extension
  const getBaseName = (filePath: string): string => {
    const fileName = filePath.split("/").pop() || "";
    return fileName.replace(/\.[^/.]+$/, "");
  };
  
  const fileBaseName = selectedBieterFile ? getBaseName(selectedBieterFile.name) : "";
  const parserEntry = selectedBieterFile ? bieterContents?.find((e: any) => e.name === selectedBieterFile.name) : null;
  const hasParser = parserEntry?.hasParser ?? false;
  const parserStatus = parserEntry?.parserStatus ?? "N/A";
  const parserDetList = parserEntry?.parserDet ?? [];
  const parserDefault = parserEntry?.parserDefault;

  // State for bieter metadata fields (bieter is the default field in audit.json)
  const [bieter, setBieter] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = React.useState<string>("");
  const [aiContext, setAiContext] = React.useState<string>("");
  const [aiRaw, setAiRaw] = React.useState<string>("");
  const [aiContextPath, setAiContextPath] = React.useState<string>("");
  const [selectedParser, setSelectedParser] = React.useState<string>("");
  const [isSavingMeta, setIsSavingMeta] = React.useState(false);

  /**
   * Populate form fields when bieterMeta loads
   */
  React.useEffect(() => {
    if (bieterMeta) {
      // Check if meta exists and has bieter field
      if (bieterMeta.meta && bieterMeta.meta.bieter) {
        setBieter(bieterMeta.meta.bieter);
      } else if (bieterMeta.bieter) {
        // Fallback: check if bieter is at root level
        setBieter(bieterMeta.bieter);
      } else {
        setBieter(""); // Clear the field if no bieter found
      }
      
      // Set parser
      const parser = bieterMeta.meta?.selectedParser || parserDefault || "";
      setSelectedParser(parser);
    } else {
      // Reset fields when no metadata
      setBieter("");
      setSelectedParser(parserDefault || "");
    }
  }, [bieterMeta, parserDefault]);

  /**
   * Save bieter metadata to audit.json
   */
  const handleSaveMeta = async () => {
    if (!metadataPath) return;

    setIsSavingMeta(true);
    setAiError(null);

    try {
      // Prepare audit.json structure with meta section
      const auditData = {
        meta: {
          schema_version: "1.0-bieter-kriterien",
          projekt: selectedProject || "",
          bieter: bieter,
          selectedParser: selectedParser
        },
        // Preserve existing kriterien and bdoks if they exist
        ...(bieterMeta?.kriterien && { kriterien: bieterMeta.kriterien }),
        ...(bieterMeta?.bdoks && { bdoks: bieterMeta.bdoks })
      };

      // Create a JSON blob and upload it
      const jsonContent = JSON.stringify(auditData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const formData = new FormData();
      formData.append('files', blob, 'audit.json');

      const params = new URLSearchParams({ path: bieterDir || '' });
      const res = await fetch(`/api/fs/upload?${params.toString()}`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error(`Fehler beim Speichern der Audit-Metadaten: ${res.statusText}`);
      }
      
      const json = await res.json();
      console.log("Audit-Metadaten erfolgreich gespeichert:", auditData);
      
      // Update SWR cache with the new data
      mutateMeta(() => auditData, false);
    } catch (error) {
      console.error("Error saving audit metadata:", error);
      setAiError("Fehler beim Speichern der Audit-Metadaten.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  /**
   * AI-powered initialization of bieter fields
   * Analyzes bieter documents to extract metadata
   */
  const handleInit = async () => {
    const activeParser = selectedParser || parserDefault;
    if (!selectedBieter || !bieterDir || !selectedBieterFile || !activeParser) {
      setAiError(
        "Erforderliche Informationen (Bieter, Bieter-Datei, Parser) fehlen."
      );
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiPrompt(""); // Clear previous debug info
    setAiContext("");
    setAiRaw("");
    setAiContextPath(""); // Clear previous context path

    try {
      // 1) Construct path to selected parser's markdown file
      const baseNameWithoutExt = fileBaseName;
      let selectedParserMdPath: string;

      if (activeParser.toLowerCase() === "marker") {
        // Marker files are in a subdirectory: md/[baseName]/[baseName].marker.md
        selectedParserMdPath = `${bDirectory}md/${baseNameWithoutExt}/${baseNameWithoutExt}.marker.md`;
      } else if (activeParser.toLowerCase() === "md") {
        // Special case for md parser: md/[baseName].md
        selectedParserMdPath = `${bDirectory}md/${baseNameWithoutExt}.md`;
      } else {
        selectedParserMdPath = `${bDirectory}md/${baseNameWithoutExt}.${activeParser}.md`;
      }

      setAiContextPath(selectedParserMdPath); // Store the path for dev info

      // 2) Load selected parser's markdown content
      const readRes = await fetch("/api/fs/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedParserMdPath,
        }),
      });

      if (!readRes.ok) {
        throw new Error(
          `Fehler beim Laden der Parser-Markdown-Datei (${selectedParserMdPath}): ${readRes.statusText}`
        );
      }
      const readJson = await readRes.json();
      const parserMdContent = readJson.content || "";

      if (!parserMdContent) {
         throw new Error(
           `Die Parser-Markdown-Datei (${selectedParserMdPath}) ist leer oder konnte nicht gelesen werden.`
         );
       }
       setAiContext(parserMdContent);

      // 3) prepare & store prompt using B_INFO query (assuming it exists)
      const queryPrompt = AI_QUERIES.B_INFO || AI_QUERIES.A_INFO; // Fallback to A_INFO if B_INFO doesn't exist
      const fullPrompt = `${queryPrompt}\n\nContext:\n${parserMdContent}`;
      setAiPrompt(fullPrompt);

      // 4) stream AI JSON
      const aiRes = await fetch("/api/ai/gem/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryType: "B_INFO",
          context: parserMdContent, // Use parser's markdown content
          maxContextLength: 200000, // Limit context to 200,000 characters for bieter analysis
        }),
      });

      if (!aiRes.ok) {
        let errorMessage = `AI Error ${aiRes.status}: ${aiRes.statusText}`;
        try {
          const errorText = await aiRes.text();
          if (errorText) {
            errorMessage += ` - ${errorText}`;
          }
        } catch (e) {
          // Could not read error response
        }
        throw new Error(errorMessage);
      }

      // 5) accumulate stream
      const reader = aiRes.body!.getReader();
      const decoder = new TextDecoder();
      let aiRawLocal = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiRawLocal += decoder.decode(value, { stream: true });
      }
      setAiRaw(aiRawLocal);

      // Clean the raw response: remove markdown fences if present
      let cleanedJsonString = aiRawLocal.trim();
      if (cleanedJsonString.startsWith("```json")) {
        cleanedJsonString = cleanedJsonString.substring(7); // Remove ```json
      }
      if (cleanedJsonString.startsWith("```")) {
        // Handle if it's just ```
        cleanedJsonString = cleanedJsonString.substring(3);
      }
      if (cleanedJsonString.endsWith("```")) {
        cleanedJsonString = cleanedJsonString.substring(
          0,
          cleanedJsonString.length - 3
        );
      }
      cleanedJsonString = cleanedJsonString.trim(); // Trim again after stripping

      // More robust: find the first '{' and last '}'
      const firstBrace = cleanedJsonString.indexOf("{");
      const lastBrace = cleanedJsonString.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedJsonString = cleanedJsonString.substring(
          firstBrace,
          lastBrace + 1
        );
      }

      // 6) parse & populate fields
      const aiJson = JSON.parse(cleanedJsonString); // Use cleaned string

      // Populate bieter field with AI results from B_INFO query
      if (aiJson.bieter || aiJson.firmenname) {
        // Use bieter field if available, otherwise use firmenname as fallback
        setBieter(aiJson.bieter || aiJson.firmenname || "");
      }
      
    } catch (err: any) {
      console.error("AI initialization error:", err);
      setAiError(
        err.message || "Unbekannter AI-Fehler. Rohantwort siehe Dev Info."
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-white rounded-md shadow">
      <div className="flex items-center">
        <Building className="mr-2 h-6 w-6 text-gray-500" />
        <h2 className="text-2xl font-bold">{trimName(bieterName)}</h2>
      </div>
      <div className="space-y-0.5">
        {/* Bieter.json structure fields */}
        <EditableText
          label="Bieter:"
          value={bieter}
          onChange={setBieter}
          placeholder="Bieter eingeben"
        />
        
        <div className="flex items-start">
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">
            Bieterpfad:
          </strong>
          <span className="py-1.5 px-3 min-h-[36px] w-full break-all flex items-center">
            {bieterPathDecoded}
          </span>
        </div>
        
        <div className="flex items-start">
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">
            Strukt:
          </strong>
          <div className="flex-1">
            <Select value={selectedParser || parserDefault || ""} onValueChange={setSelectedParser}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Parser auswählen" />
              </SelectTrigger>
              <SelectContent>
                {parserDetList.length > 0 ? (
                  parserDetList.map((parser) => (
                    <SelectItem key={parser} value={parser}>
                      {parser} {parser === parserDefault && "(Standard)"}
                    </SelectItem>
                  ))
                ) : (
                  parserDefault && (
                    <SelectItem value={parserDefault}>
                      {parserDefault} (Standard)
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

      </div>
      <div className="flex justify-end gap-4 p-4 border-t">
        <Button
          variant="outline"
          onClick={handleSaveMeta}
          disabled={isSavingMeta}>
          {isSavingMeta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Speichern
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => mutateMeta()}
          title="Metadaten neu laden">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          className="flex items-center gap-2"
          onClick={handleInit}
          disabled={aiLoading}>
          {aiLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <Sparkles className="h-4 w-4" />
          Init
        </Button>
      </div>
      {aiError && (
        <div className="text-destructive text-sm mt-2">{aiError}</div>
      )}

      {/* Dev-Info */}
      <details className="mt-4 border border-gray-200 rounded-md overflow-hidden">
        <summary className="bg-gray-50 px-4 py-2 cursor-pointer text-sm font-medium">
          Dev Info
        </summary>
        <div className="p-4 bg-gray-50 text-xs font-mono space-y-1">
          <ul className="list-disc pl-5">
            <li>selectedProject: {selectedProject}</li>
            <li>selectedBieter: {selectedBieter}</li>
            <li>bieterDir: {bieterDir}</li>
            <li>bDirectory: {bDirectory}</li>
            <li>metadataPath: {metadataPath}</li>
            <li>
              auditMeta structure: {bieterMeta ? Object.keys(bieterMeta).join(", ") : "N/A"}
            </li>
            <li>
              bieter (meta.bieter): {bieterMeta?.meta?.bieter || "none"}
            </li>
            <li>
              projekt (meta.projekt): {bieterMeta?.meta?.projekt || "none"}
            </li>
            <li>
              schema_version: {bieterMeta?.meta?.schema_version || "none"}
            </li>
            <li>
              kriterien count: {bieterMeta?.kriterien ? bieterMeta.kriterien.length : 0}
            </li>
            <li>
              bdoks count: {bieterMeta?.bdoks ? bieterMeta.bdoks.length : 0}
            </li>
            <li>
              bieterContents (B-Dir) count: {bieterContents?.length ?? "N/A"}
            </li>
            <li>
              Bieter PDF files found: {bieterPdfFiles.map((file: any) => file.name).join(", ") || "None"}
            </li>
            <li>selectedBieterFile: {selectedBieterFile?.name || "None"}</li>
            <li>fileBaseName: {fileBaseName}</li>
            <li>parserStatus: {parserStatus}</li>
            <li>hasParser: {hasParser.toString()}</li>
            <li>parserDetList: {parserDetList.join(", ")}</li>
            <li>parserDefault: {parserDefault}</li>
            <li>
              AI Context Path:
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs break-all whitespace-pre-wrap">
                {aiContextPath || "(not set)"}
              </pre>
            </li>
            <li>
              AI Prompt:
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs break-all whitespace-pre-wrap">
                {aiPrompt}
              </pre>
            </li>
            <li>
              AI Context (first 200 chars from default parser's .md):
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs break-all whitespace-pre-wrap">
                {aiContext.slice(0, 200)}
                {aiContext.length > 200 ? "…" : ""}
              </pre>
            </li>
            <li>
              AI Raw Response:
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs break-all whitespace-pre-wrap">
                {(() => {
                  try {
                    // Attempt to parse and pretty-print if it's JSON
                    return JSON.stringify(JSON.parse(aiRaw || "{}"), null, 2);
                  } catch (e) {
                    // If not valid JSON or empty, show raw (or placeholder if empty)
                    return aiRaw || "(empty)";
                  }
                })()}
              </pre>
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
}
