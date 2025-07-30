import React from "react";
import { Sparkles, RefreshCw, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trimName } from "@/lib/trim";
import { useProject } from "@/context/ProjectContext";
import useSWR from "swr";
import {
  fileTreeFetcher,
  normalizePath,
  PDF2MD_INDEX_FILE_NAME,
} from "@/lib/fs/fileTreeUtils";
import { EditableText } from "@/components/ui/editable-text";
import { AI_QUERIES } from "@/app/api/ai/config";

export default function Info() {
  const { selectedDok, selectedProject, selectedBieter } = useProject();
  const dokName = selectedDok ?? "Dokname nicht verfügbar";

  // decode URL‐encoded dok path for display
  const dokPathDecoded = selectedDok ? decodeURIComponent(selectedDok) : "N/A";

  // derive dynamic names
  const projectName = selectedProject
    ? decodeURIComponent(
        selectedProject.replace(/^\/klark0\//, "").split("/")[0]
      )
    : "N/A";
  const bieterName = selectedBieter
    ? decodeURIComponent(selectedBieter.replace(/\/$/, "").split("/").pop()!)
    : "N/A"; // fetch directory listing (includes parser info)
  const parentDir = selectedDok
    ? normalizePath(selectedDok.replace(/\/[^\/]+$/, ""))
    : null;
  const { data: entries, error: entriesError } = useSWR(
    parentDir ? [parentDir, { fileSystemType: "webdav" }] : null,
    fileTreeFetcher
  );

  // Debug logging
  console.log("Debug Info Component:", {
    selectedDok,
    parentDir,
    entries,
    entriesError,
    hasData: !!entries,
    entriesLength: entries?.length,
  });
  const fileBaseName = selectedDok
    ? decodeURIComponent(selectedDok.split("/").pop()!)
    : "";
  const parserEntry = entries?.find((e) => e.name === fileBaseName);
  const hasParser = parserEntry?.hasParser ?? false;
  const parserStatus = parserEntry?.parserStatus ?? "N/A";
  const parserDetList = parserEntry?.parserDet ?? [];
  const parserDefault = parserEntry?.parserDefault;

  // side-car metadata JSON
  const metadataFileName = `${fileBaseName}.meta.json`;
  const metadataPath = parentDir ? parentDir + metadataFileName : null;
  const { data: docMeta, mutate: mutateMeta } = useSWR(
    metadataPath,
    async (path) => {
      const params = new URLSearchParams({ path });
      const res = await fetch(`/api/fs/metadata?${params.toString()}`);
      if (!res.ok) return null;
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  // fetch index JSON
  const { data: idxJson, mutate: mutateIndex } = useSWR(
    parentDir ? parentDir + PDF2MD_INDEX_FILE_NAME : null,
    async (path) => {
      const params = new URLSearchParams({ path });
      const res = await fetch(`/api/fs?${params.toString()}`);
      if (!res.ok) return null;
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  // editable state
  const [issuer, setIssuer] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [metadataList, setMetadataList] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = React.useState<string>("");
  const [aiContext, setAiContext] = React.useState<string>("");
  const [aiRaw, setAiRaw] = React.useState<string>("");
  const [aiContextPath, setAiContextPath] = React.useState<string>("");
  const [isSavingMeta, setIsSavingMeta] = React.useState(false);

  // populate form when metadata (.meta.json) loads
  React.useEffect(() => {
    if (!docMeta) return;
    if (docMeta.aussteller != null) {
      setIssuer(docMeta.aussteller);
    }
    if (docMeta.beschreibung != null) {
      setDescription(docMeta.beschreibung);
    }
    if (Array.isArray(docMeta.metadaten)) {
      setMetadataList(docMeta.metadaten.join(", "));
    }
  }, [docMeta]);

  // populate category and name from index JSON
  React.useEffect(() => {
    if (idxJson?.files) {
      const entry = idxJson.files.find((f: any) => f.name === fileBaseName);
      if (entry?.meta?.kategorie != null) {
        setCategory(entry.meta.kategorie);
      }
      if (entry?.meta?.name != null) {
        setTitle(entry.meta.name);
      }
    }
  }, [idxJson, fileBaseName]);

  // save handler uses existing upload endpoint
  const handleSaveMeta = async () => {
    if (!metadataPath) return;
    setIsSavingMeta(true);
    try {
      const metaObj = {
        aussteller: issuer || null,
        beschreibung: description || null,
        metadaten: metadataList
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      // call our new metadata API
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
        // update SWR cache without revalidation
        mutateMeta(() => json.metadata, false);
      }

      // update .pdf2md_index.json
      if (parentDir) {
        const idxPath = parentDir + PDF2MD_INDEX_FILE_NAME;
        await fetch("/api/fs/index", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            indexPath: idxPath,
            fileName: fileBaseName,
            meta: { kategorie: category, name: title },
          }),
        });
        // re-fetch index to reflect saved category
        mutateIndex();
      }
    } catch (error) {
      console.error("Error saving metadata:", error);
      setAiError("Fehler beim Speichern der Metadaten."); // Or a more specific error state for meta saving
    } finally {
      setIsSavingMeta(false);
    }
  };

  // new: fetch doc text + AI call
  const handleInit = async () => {
    if (!selectedDok || !parentDir || !parserDefault) {
      setAiError(
        "Erforderliche Informationen (FS-Einstellungen, Dokument, Standardparser) fehlen."
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
      // 1) Construct path to default parser's markdown file
      const baseNameWithoutExt = fileBaseName.replace(/\.[^/.]+$/, "");
      let defaultParserMdPath: string;

      if (parserDefault.toLowerCase() === "marker") {
        // Marker files are in a subdirectory: md/[baseName]/[baseName].marker.md
        defaultParserMdPath = `${parentDir}md/${baseNameWithoutExt}/${baseNameWithoutExt}.marker.md`;
      } else if (parserDefault.toLowerCase() === "md") {
        // Special case for md parser: md/[baseName].md
        defaultParserMdPath = `${parentDir}md/${baseNameWithoutExt}.md`;
      } else {
        defaultParserMdPath = `${parentDir}md/${baseNameWithoutExt}.${parserDefault}.md`;
      }

      setAiContextPath(defaultParserMdPath); // Store the path for dev info

      // 2) Load default parser's markdown content
      const readRes = await fetch("/api/fs/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: defaultParserMdPath,
        }),
      });

      if (!readRes.ok) {
        throw new Error(
          `Fehler beim Laden der Standard-Parser-Markdown-Datei (${defaultParserMdPath}): ${readRes.statusText}`
        );
      }
      const readJson = await readRes.json();
      const parserMdContent = readJson.content || "";

      if (!parserMdContent) {
        throw new Error(
          `Die Standard-Parser-Markdown-Datei (${defaultParserMdPath}) ist leer oder konnte nicht gelesen werden.`
        );
      }
      setAiContext(parserMdContent);

      // 3) Determine prompt and query type based on document type
      // If selectedBieter is set, it's a Bieterdokument, otherwise it's an Ausschreibungsdokument
      const isBieterDokument = !!selectedBieter;
      const queryType = isBieterDokument ? "DOKUMENTTYP_JSON" : "A_DOKUMENTTYP_JSON";
      const queryPrompt = isBieterDokument ? AI_QUERIES.DOKUMENTTYP_JSON : AI_QUERIES.A_DOKUMENTTYP_JSON;
      
      const fullPrompt = `${queryPrompt}\n\nContext:\n${parserMdContent}`;
      setAiPrompt(fullPrompt); 
      
      // 4) stream AI JSON
      const aiRes = await fetch("/api/ai/gem/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryType: queryType,
          context: parserMdContent, // Use parser's markdown content
          maxContextLength: 10000, // Limit context to 10,000 characters for document analysis
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
      setCategory(aiJson.Kategorie ?? "");
      setIssuer(aiJson.Aussteller ?? "");
      setTitle(aiJson.Dokumententyp ?? "");
      setDescription(aiJson.Begründung ?? "");
    } catch (err: any) {
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
        <FileText className="mr-2 h-6 w-6 text-gray-500" />
        <h2 className="text-2xl font-bold">{trimName(dokName)}</h2>
      </div>
      <div className="space-y-0.5">
        <div className="flex items-start">
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">
            Projekt:
          </strong>
          <span className="py-1.5 px-3 min-h-[36px] w-full flex items-center">
            {projectName}
          </span>
        </div>
        <div className="flex items-start">
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">
            Bieter:
          </strong>
          <span className="py-1.5 px-3 min-h-[36px] w-full flex items-center">
            {bieterName}
          </span>
        </div>

        <EditableText
          label="Kategorie:"
          value={category}
          onChange={setCategory}
          placeholder="Kategorie eingeben"
        />
        <EditableText
          label="Aussteller:"
          value={issuer}
          onChange={setIssuer}
          placeholder="Aussteller eingeben"
        />
        <EditableText
          label="Name:"
          value={title}
          onChange={setTitle}
          placeholder="Dokumentname eingeben"
        />
        <EditableText
          label="Beschreibung:"
          value={description}
          onChange={setDescription}
          as="textarea"
          placeholder="Beschreibung hinzufügen"
          inputClassName="min-h-[70px]"
        />

        <div className="flex items-start">
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">
            Strukt:
          </strong>
          <span className="py-1.5 px-3 min-h-[36px] w-full flex items-center">
            {parserDetList.length > 0 ? (
              parserDetList.map((name, i) => (
                <span key={name}>
                  {i > 0 && ", "}
                  {name === parserDefault ? <strong>{name}</strong> : name}
                </span>
              ))
            ) : parserDefault ? (
              <strong>{parserDefault}</strong>
            ) : (
              <span className="italic text-muted-foreground">Keine</span>
            )}
          </span>
        </div>

        <div className="flex items-start">
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">
            Dok ID:
          </strong>
          <span className="py-1.5 px-3 min-h-[36px] w-full break-all flex items-center">
            {dokPathDecoded}
          </span>
        </div>

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
            <li>parserStatus: {parserStatus}</li>
            <li>hasParser: {hasParser.toString()}</li>
            <li>parserDetList: {parserDetList.join(", ")}</li>
            <li>parserDefault: {parserDefault}</li>
            <li>entries count: {entries?.length ?? "N/A"}</li>
            <li>idxJson files: {idxJson?.files?.length ?? "N/A"}</li>
            <li>
              docMeta keys: {docMeta ? Object.keys(docMeta).join(", ") : "N/A"}
            </li>
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
