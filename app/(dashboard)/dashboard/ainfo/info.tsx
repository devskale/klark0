import React from "react";
import { Sparkles, RefreshCw, Loader2, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trimName } from "@/lib/trim";
import { useProject } from "@/context/ProjectContext";
import useSWR from "swr";
import {
  fileTreeFetcher,
  normalizePath,
  OFS_INDEX_FILE_NAME,
} from "@/lib/fs/fileTreeUtils";
import { EditableText } from "@/components/ui/editable-text";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AI_QUERIES } from "@/app/api/ai/config";

/**
 * Info component for Ausschreibungsprojekt (tender project) information
 * Provides editable fields for project metadata with AI-powered initialization
 */
export default function Info() {
  const { selectedProject } = useProject();
  const projektPath = selectedProject ?? "Projektname nicht verfügbar";

  // Decode URL-encoded project path for display
  const projektPathDecoded = selectedProject ? decodeURIComponent(selectedProject) : "N/A";

  // Derive project directory path
  const projectDir = selectedProject ? normalizePath(selectedProject) : null;

  // Side-car metadata JSON for project
  const metadataFileName = "projekt.json";
  const metadataPath = projectDir ? projectDir + metadataFileName : null;
  const { data: projectMeta, mutate: mutateMeta } = useSWR(
    metadataPath,
    async (path) => {
      const params = new URLSearchParams({ path });
      const res = await fetch(`/api/fs/metadata?${params.toString()}`);
      if (!res.ok) return null;
      return res.json();
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
  const selectedAabPath = selectedAabFile?.path || null;
  
  // Get basename of a file without extension
  const getBaseName = (filePath: string): string => {
    const fileName = filePath.split("/").pop() || "";
    return fileName.replace(/\.[^/.]+$/, "");
  };
  
  const fileBaseName = selectedAabFile ? getBaseName(selectedAabFile.name) : "";
  const parserEntry = selectedAabFile ? projectContents?.find((e: any) => e.name === selectedAabFile.name) : null;
  const hasParser = parserEntry?.hasParser ?? false;
  const parserStatus = parserEntry?.parserStatus ?? "N/A";
  const parserDetList = parserEntry?.parserDet ?? [];
  const parserDefault = parserEntry?.parserDefault;

  // Editable state for project fields (projekt.json structure)
  const [auftraggeber, setAuftraggeber] = React.useState("");
  const [aktenzeichen, setAktenzeichen] = React.useState("");
  const [ausschreibungsgegenstand, setAusschreibungsgegenstand] = React.useState("");
  const [datum, setDatum] = React.useState("");
  const [lose, setLose] = React.useState<string[]>([]);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = React.useState<string>("");
  const [aiContext, setAiContext] = React.useState<string>("");
  const [aiRaw, setAiRaw] = React.useState<string>("");
  const [aiContextPath, setAiContextPath] = React.useState<string>("");
  const [selectedParser, setSelectedParser] = React.useState<string>("");
  const [isSavingMeta, setIsSavingMeta] = React.useState(false);

  // Populate form when metadata loads
  React.useEffect(() => {
    if (!projectMeta) return;
    
    // projekt.json structure fields
    if (projectMeta.auftraggeber != null) {
      setAuftraggeber(projectMeta.auftraggeber);
    }
    if (projectMeta.aktenzeichen != null) {
      setAktenzeichen(projectMeta.aktenzeichen);
    }
    if (projectMeta.ausschreibungsgegenstand != null) {
      setAusschreibungsgegenstand(projectMeta.ausschreibungsgegenstand);
    }
    if (projectMeta.datum != null) {
      setDatum(projectMeta.datum);
    }
    if (Array.isArray(projectMeta.lose)) {
      // Handle both string arrays (legacy) and object arrays (new format)
      if (projectMeta.lose.length > 0 && typeof projectMeta.lose[0] === 'object') {
        // New format: array of objects with nummer, bezeichnung, etc.
        setLose(projectMeta.lose.map((los: any) => `${los.nummer}: ${los.bezeichnung}`));
      } else {
        // Legacy format: simple string array
        setLose(projectMeta.lose);
      }
    }
    if (projectMeta.selectedParser != null) {
      setSelectedParser(projectMeta.selectedParser);
    }
  }, [projectMeta]);

  /**
   * Save project metadata to filesystem
   */
  const handleSaveMeta = async () => {
    if (!metadataPath) return;
    setIsSavingMeta(true);
    try {
      const metaObj = {
        // projekt.json structure fields
        auftraggeber: auftraggeber || null,
        aktenzeichen: aktenzeichen || null,
        ausschreibungsgegenstand: ausschreibungsgegenstand || null,
        datum: datum || null,
        lose: lose || [],
        selectedParser: selectedParser || null,
      };
      
      // Call metadata API
      const res = await fetch("/api/fs/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: metadataPath,
          metadata: metaObj,
        }),
      });
      const json = await res.json();
      if (json.success && json.metadata) {
        // Update SWR cache without revalidation
        mutateMeta(() => json.metadata, false);
      }
    } catch (error) {
      console.error("Error saving project metadata:", error);
      setAiError("Fehler beim Speichern der Projektmetadaten.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  /**
   * AI-powered initialization of project fields
   * Analyzes AAB documents in the project to extract metadata
   */
  const handleInit = async () => {
    const activeParser = selectedParser || parserDefault;
    if (!selectedProject || !projectDir || !selectedAabFile || !activeParser) {
      setAiError(
        "Erforderliche Informationen (Projekt, AAB-Datei, Parser) fehlen."
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
        selectedParserMdPath = `${aDirectory}md/${baseNameWithoutExt}/${baseNameWithoutExt}.marker.md`;
      } else if (activeParser.toLowerCase() === "md") {
        // Special case for md parser: md/[baseName].md
        selectedParserMdPath = `${aDirectory}md/${baseNameWithoutExt}.md`;
      } else {
        selectedParserMdPath = `${aDirectory}md/${baseNameWithoutExt}.${activeParser}.md`;
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

      // 3) prepare & store prompt using A_INFO query
      const queryPrompt = AI_QUERIES.A_INFO;
      const fullPrompt = `${queryPrompt}\n\nContext:\n${parserMdContent}`;
      setAiPrompt(fullPrompt);

      // 4) stream AI JSON
      const aiRes = await fetch("/api/ai/gem/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryType: "A_INFO",
          context: parserMdContent, // Use parser's markdown content
          maxContextLength: 200000, // Limit context to 500,000 characters for project analysis
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

      // Populate fields with AI results from A_INFO query (projekt.json structure)
      if (aiJson.auftraggeber) setAuftraggeber(aiJson.auftraggeber);
      if (aiJson.aktenzeichen) setAktenzeichen(aiJson.aktenzeichen);
      if (aiJson.ausschreibungsgegenstand) setAusschreibungsgegenstand(aiJson.ausschreibungsgegenstand);
      if (aiJson.datum) setDatum(aiJson.datum);
      if (Array.isArray(aiJson.lose)) {
        setLose(aiJson.lose);
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
        <h2 className="text-2xl font-bold">{trimName(projektPath)}</h2>
      </div>
      <div className="space-y-0.5">
        {/* New projekt.json structure fields */}
        <EditableText
          label="Auftraggeber:"
          value={auftraggeber}
          onChange={setAuftraggeber}
          placeholder="Auftraggeber eingeben"
        />
        <EditableText
          label="Aktenzeichen:"
          value={aktenzeichen}
          onChange={setAktenzeichen}
          placeholder="Aktenzeichen eingeben"
        />
        <EditableText
          label="Ausschreibungsgegenstand:"
          value={ausschreibungsgegenstand}
          onChange={setAusschreibungsgegenstand}
          placeholder="Ausschreibungsgegenstand eingeben"
        />
        <EditableText
          label="Datum:"
          value={datum}
          onChange={setDatum}
          placeholder="Datum (YYYY-MM-DD)"
        />
        <EditableText
          label="Lose:"
          value={lose.join(", ")}
          onChange={(value) => setLose(value.split(",").map(s => s.trim()).filter(Boolean))}
          placeholder="Lose kommasepariert"
        />
        
        <div className="flex items-start">
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">
            Projektpfad:
          </strong>
          <span className="py-1.5 px-3 min-h-[36px] w-full break-all flex items-center">
            {projektPathDecoded}
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
            <li>projectDir: {projectDir}</li>
            <li>aDirectory: {aDirectory}</li>
            <li>metadataPath: {metadataPath}</li>
            <li>
              projectMeta keys: {projectMeta ? Object.keys(projectMeta).join(", ") : "N/A"}
            </li>
            <li>
              projectContents (A-Dir) count: {projectContents?.length ?? "N/A"}
            </li>
            <li>
              AAB PDF files found: {aabPdfFiles.map((file: any) => file.name).join(", ") || "None"}
            </li>
            <li>selectedAabFile: {selectedAabFile?.name || "None"}</li>
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
