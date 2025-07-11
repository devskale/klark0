import React from "react";
import { Sparkles, RefreshCw, Loader2, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trimName } from "@/lib/trim";
import { useProject } from "@/context/ProjectContext";
import useSWR from "swr";
import {
  fileTreeFetcher,
  normalizePath,
  PDF2MD_INDEX_FILE_NAME,
} from "@/lib/fs/fileTreeUtils-new";
import { EditableText } from "@/components/ui/editable-text";
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
  const metadataFileName = "projekt.meta.json";
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
  const { data: projectContents } = useSWR(
    aDirectory ? [aDirectory, { fileSystemType: "webdav" }] : null,
    fileTreeFetcher,
    { revalidateOnFocus: false }
  );

  // Editable state for project fields
  const [vergabestelle, setVergabestelle] = React.useState("");
  const [adresse, setAdresse] = React.useState("");
  const [projektName, setProjektName] = React.useState("");
  const [startDatum, setStartDatum] = React.useState("");
  const [bieterabgabe, setBieterabgabe] = React.useState("");
  const [endDatum, setEndDatum] = React.useState("");
  const [beschreibung, setBeschreibung] = React.useState("");
  const [metadataList, setMetadataList] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = React.useState<string>("");
  const [aiContext, setAiContext] = React.useState<string>("");
  const [aiRaw, setAiRaw] = React.useState<string>("");
  const [isSavingMeta, setIsSavingMeta] = React.useState(false);

  // Populate form when metadata (.meta.json) loads
  React.useEffect(() => {
    if (!projectMeta) return;
    if (projectMeta.vergabestelle != null) {
      setVergabestelle(projectMeta.vergabestelle);
    }
    if (projectMeta.adresse != null) {
      setAdresse(projectMeta.adresse);
    }
    if (projectMeta.projektName != null) {
      setProjektName(projectMeta.projektName);
    }
    if (projectMeta.startDatum != null) {
      setStartDatum(projectMeta.startDatum);
    }
    if (projectMeta.bieterabgabe != null) {
      setBieterabgabe(projectMeta.bieterabgabe);
    }
    if (projectMeta.endDatum != null) {
      setEndDatum(projectMeta.endDatum);
    }
    if (projectMeta.beschreibung != null) {
      setBeschreibung(projectMeta.beschreibung);
    }
    if (Array.isArray(projectMeta.metadaten)) {
      setMetadataList(projectMeta.metadaten.join(", "));
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
        vergabestelle: vergabestelle || null,
        adresse: adresse || null,
        projektName: projektName || null,
        startDatum: startDatum || null,
        bieterabgabe: bieterabgabe || null,
        endDatum: endDatum || null,
        beschreibung: beschreibung || null,
        metadaten: metadataList
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
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
    if (!selectedProject || !projectDir) {
      setAiError(
        "Erforderliche Informationen (Projekt) fehlen."
      );
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiPrompt(""); // Clear previous debug info
    setAiContext("");
    setAiRaw("");

    try {
      // Find AAB files in the project directory
      const aabFiles = projectContents?.filter((item: any) => 
        item.type === "file" && item.name.toUpperCase().includes("AAB")
      ) || [];

      if (aabFiles.length === 0) {
        setAiError("Keine AAB-Datei im Projektverzeichnis gefunden. AAB-Dateien werden für die AI-Analyse benötigt.");
        return;
      }

      // Use the first AAB file found
      const aabFile = aabFiles[0];
      const aabFilePath = aabFile.path;
      
      console.log("Found AAB file:", aabFile.name, "at path:", aabFilePath);

      // Fetch the AAB file content
      const fileResponse = await fetch("/api/fs/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: aabFilePath }),
      });

      if (!fileResponse.ok) {
        throw new Error(`Fehler beim Lesen der AAB-Datei: ${fileResponse.statusText}`);
      }

      const fileData = await fileResponse.json();
      const aabContent = fileData.content || "";
      
      if (!aabContent.trim()) {
        setAiError("AAB-Datei ist leer oder konnte nicht gelesen werden.");
        return;
      }

      // Prepare AI query for project metadata extraction
      const queryPrompt = `Analysiere die folgende Ausschreibungsbekanntmachung (AAB) und extrahiere die wichtigsten Projektinformationen. Gib die Antwort als JSON-Objekt mit folgenden Feldern zurück:

{
  "Vergabestelle": "Name der ausschreibenden Stelle",
  "Adresse": "Vollständige Adresse der Vergabestelle",
  "ProjektName": "Titel/Name des Projekts oder der Ausschreibung",
  "StartDatum": "Projektstart im Format YYYY-MM-DD (falls verfügbar)",
  "Bieterabgabe": "Abgabefrist für Angebote im Format YYYY-MM-DD",
  "EndDatum": "Projektende im Format YYYY-MM-DD (falls verfügbar)",
  "Beschreibung": "Kurze Zusammenfassung des Projekts/der Ausschreibung"
}

Falls ein Feld nicht verfügbar ist, verwende null als Wert.`;
      
      setAiContext(aabContent.slice(0, 4000)); // Limit context size
      setAiPrompt(queryPrompt);

      // Call AI API for analysis
      const aiResponse = await fetch("/api/ai/gem/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryType: "CUSTOM",
          prompt: queryPrompt,
          context: aabContent,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI-Fehler: ${aiResponse.status} ${aiResponse.statusText}`);
      }

      // Stream the AI response
      const reader = aiResponse.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;
      }

      setAiRaw(accumulatedResponse);

      // Clean and parse AI response
      let cleanedResponse = accumulatedResponse.trim();
      
      // Remove markdown code fences if present
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/gm, "");
      cleanedResponse = cleanedResponse.replace(/\n?```$/gm, "");
      
      // Try to parse JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        setAiError("AI-Antwort konnte nicht als JSON geparst werden. Siehe Raw Response in Dev Info.");
        return;
      }

      // Populate fields with AI results
      if (parsedResponse.Vergabestelle) setVergabestelle(parsedResponse.Vergabestelle);
      if (parsedResponse.Adresse) setAdresse(parsedResponse.Adresse);
      if (parsedResponse.ProjektName) setProjektName(parsedResponse.ProjektName);
      if (parsedResponse.StartDatum) setStartDatum(parsedResponse.StartDatum);
      if (parsedResponse.Bieterabgabe) setBieterabgabe(parsedResponse.Bieterabgabe);
      if (parsedResponse.EndDatum) setEndDatum(parsedResponse.EndDatum);
      if (parsedResponse.Beschreibung) setBeschreibung(parsedResponse.Beschreibung);
      
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
        <EditableText
          label="Vergabestelle:"
          value={vergabestelle}
          onChange={setVergabestelle}
          placeholder="Vergabestelle eingeben"
        />
        <EditableText
          label="Adresse:"
          value={adresse}
          onChange={setAdresse}
          placeholder="Adresse eingeben"
        />
        <div className="flex items-start">
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">
            Projekt ID:
          </strong>
          <span className="py-1.5 px-3 min-h-[36px] w-full break-all flex items-center">
            {projektPathDecoded}
          </span>
        </div>
        <EditableText
          label="Projektname:"
          value={projektName}
          onChange={setProjektName}
          placeholder="Projektname eingeben"
        />
        <EditableText
          label="Start:"
          value={startDatum}
          onChange={setStartDatum}
          placeholder="Startdatum (YYYY-MM-DD)"
        />
        <EditableText
          label="Bieterabgabe:"
          value={bieterabgabe}
          onChange={setBieterabgabe}
          placeholder="Bieterabgabe (YYYY-MM-DD)"
        />
        <EditableText
          label="Ende:"
          value={endDatum}
          onChange={setEndDatum}
          placeholder="Enddatum (YYYY-MM-DD)"
        />
        <EditableText
          label="Beschreibung:"
          value={beschreibung}
          onChange={setBeschreibung}
          as="textarea"
          placeholder="Projektbeschreibung hinzufügen"
          inputClassName="min-h-[70px]"
        />
        <EditableText
          label="Metadaten:"
          value={metadataList}
          onChange={setMetadataList}
          as="textarea"
          placeholder="Einträge kommasepariert (z.B. Tag1, Tag2)"
          inputClassName="min-h-[70px]"
        />
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
              AAB files found: {projectContents?.filter((item: any) => 
                item.type === "file" && item.name.toUpperCase().includes("AAB")
              ).map((file: any) => file.name).join(", ") || "None"}
            </li>
            <li>
              AI Prompt:
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs break-all whitespace-pre-wrap">
                {aiPrompt}
              </pre>
            </li>
            <li>
              AI Context:
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
