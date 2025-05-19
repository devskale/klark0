import React from "react";
import { Sparkles } from "lucide-react";
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
} from "@/lib/fs/fileTreeUtils";

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
  const { data: docMeta } = useSWR(
    fsSettings && metadataPath ? [metadataPath, fsSettings] : null,
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
    }
  );

  // editable state
  const [issuer, setIssuer] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [metadataList, setMetadataList] = React.useState("");

  // populate form when metadata loads
  React.useEffect(() => {
    if (docMeta) {
      setIssuer(docMeta.aussteller ?? "");
      setTitle(docMeta.name ?? "");
      setDescription(docMeta.beschreibung ?? "");
      setMetadataList((docMeta.metadaten || []).join(", "));
    }
  }, [docMeta]);

  // save handler uses existing upload endpoint
  const handleSaveMeta = async () => {
    if (!fsSettings || !metadataPath) return;
    const metaObj = {
      aussteller: issuer || null,
      name: title || null,
      beschreibung: description || null,
      metadaten: metadataList
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const blob = new Blob([JSON.stringify(metaObj, null, 2)], {
      type: "application/json",
    });
    const file = new File([blob], metadataFileName);
    const formData = new FormData();
    formData.append("files", file);
    const params = new URLSearchParams({
      type: fsSettings.type || "webdav",
      path: metadataPath,
      host: fsSettings.host || "",
      username: fsSettings.username || "",
      password: fsSettings.password || "",
    });
    await fetch(`/api/fs/upload?${params.toString()}`, {
      method: "POST",
      body: formData,
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-md shadow">
      <h2 className="text-2xl font-bold">{trimName(dokName)}</h2>
      <div className="space-y-1">
        <p><strong>Bieter:</strong> {bieterName}</p>
        <p><strong>Kategorie:</strong> Beispielkategorie.</p>
        <label>
          <strong>Aussteller:</strong>
          <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
        </label>
        <label>
          <strong>Name:</strong>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <strong>Beschreibung:</strong>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <p>
          <strong>Strukt:</strong>{" "}
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
            "Keine"
          )}
        </p>
        <p><strong>Dok ID:</strong> {dokPathDecoded}</p>
        <label>
          <strong>Metadaten:</strong>
          <Textarea
            value={metadataList}
            placeholder="Einträge kommasepariert"
            onChange={(e) => setMetadataList(e.target.value)}
          />
        </label>
      </div>
      <div className="flex justify-end gap-4 p-4 border-t">
        <Button variant="outline" onClick={handleSaveMeta}>
          Speichern
        </Button>
        <Button className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Init
        </Button>
      </div>
    </div>
  );
}
