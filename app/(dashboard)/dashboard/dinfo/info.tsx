import React from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trimName } from "@/lib/trim";
import { useProject } from "@/context/ProjectContext";
import useSWR from "swr";
import {
  fileTreeFetcher,
  normalizePath,
  FileSystemSettings,
  PDF2MD_INDEX_FILE_NAME,
} from "@/lib/fs/fileTreeUtils";
import { EditableText } from "@/components/ui/editable-text";

export default function Info() {
  const {
    selectedDok,
    selectedProject,
    selectedBieter,
  } = useProject();
  const dokName = selectedDok ?? "Dokname nicht verfügbar";

  // decode URL‐encoded dok path for display
  const dokPathDecoded = selectedDok
    ? decodeURIComponent(selectedDok)
    : "N/A";

  // derive dynamic names
  const projectName = selectedProject
    ? decodeURIComponent(
        selectedProject.replace(/^\/klark0\//, "").split("/")[0]
      )
    : "N/A";
  const bieterName = selectedBieter
    ? decodeURIComponent(
        selectedBieter.replace(/\/$/, "").split("/").pop()!
      )
    : "N/A";

  // fetch filesystem settings
  const { data: fsSettings } = useSWR<FileSystemSettings>(
    "/api/settings?key=fileSystem",
    (url) => fetch(url).then((res) => res.json())
  );

  // fetch directory listing (includes parser info)
  const parentDir = selectedDok
    ? normalizePath(selectedDok.replace(/\/[^\/]+$/, ""))
    : null;
  const { data: entries } = useSWR(
    fsSettings && parentDir
      ? [parentDir, fsSettings, { fileSystemType: fsSettings.type }]
      : null,
    fileTreeFetcher
  );
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
    fsSettings && metadataPath ? [metadataPath, fsSettings] : null,
    async ([path, settings]) => {
      const params = new URLSearchParams({
        type: settings.type || "webdav",
        path,
        host: settings.host || "",
        username: settings.username || "",
        password: settings.password || "",
      });
      const res = await fetch(`/api/fs/metadata?${params.toString()}`);
      if (!res.ok) return null;
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  // fetch index JSON
  const { data: idxJson, mutate: mutateIndex } = useSWR(
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

  // editable state
  const [issuer, setIssuer] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [metadataList, setMetadataList] = React.useState("");
  const [category, setCategory] = React.useState("");

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
    if (!fsSettings || !metadataPath) return;
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
        type: fsSettings.type,
        host: fsSettings.host,
        username: fsSettings.username,
        password: fsSettings.password,
      }),
    });
    const json = await res.json();
    if (json.success && json.metadata) {
      // update SWR cache without revalidation
      mutateMeta(() => json.metadata, false);
    }

    // update .pdf2md_index.json
    if (fsSettings && parentDir) {
      const idxPath = parentDir + PDF2MD_INDEX_FILE_NAME;
      await fetch("/api/fs/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indexPath: idxPath,
          fileName: fileBaseName,
          meta: { kategorie: category, name: title },
          type: fsSettings.type,
          host: fsSettings.host,
          username: fsSettings.username,
          password: fsSettings.password,
        }),
      });
      // re-fetch index to reflect saved category
      mutateIndex();
    }
  };

  return (
    <div className="space-y-3 p-4 bg-white rounded-md shadow">
      <h2 className="text-2xl font-bold">{trimName(dokName)}</h2>
      <div className="space-y-0.5">
        <div className="flex items-start">
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">Projekt:</strong>
          <span className="py-1.5 px-3 min-h-[36px] w-full flex items-center">{projectName}</span>
        </div>
        <div className="flex items-start">
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">Bieter:</strong>
          <span className="py-1.5 px-3 min-h-[36px] w-full flex items-center">{bieterName}</span>
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
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">Strukt:</strong>
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
          <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">Dok ID:</strong>
          <span className="py-1.5 px-3 min-h-[36px] w-full break-all flex items-center">{dokPathDecoded}</span>
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
        <Button variant="outline" onClick={handleSaveMeta}>
          Speichern
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => mutateMeta()}
          title="Metadaten neu laden"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Init
        </Button>
      </div>
    </div>
  );
}
