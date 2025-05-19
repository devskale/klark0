import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-4 p-4 bg-white rounded-md shadow">
      <h2 className="text-2xl font-bold">{trimName(dokName)}</h2>
      <div className="space-y-1">
        <p><strong>Bieter:</strong> {bieterName}</p>
        <p><strong>Kategorie:</strong> Beispielkategorie.</p>
        <p><strong>Aussteller:</strong> Aussteller.</p>
        <p><strong>Name:</strong> Name der automatisch oder durch den Nutzer gegeben wurde.</p>
        <p><strong>Beschreibung:</strong> Beispielbeschreibung.</p>
        <p><strong>Strukt:</strong> {parserDetList.length > 0 ? parserDetList.join(", ") : "Keine"}</p>
        <p><strong>Dok ID:</strong> {dokPathDecoded}</p>
        <p><strong>Metadaten</strong> Liste mit extrahierten Metadaten</p>
      </div>
      <div className="flex justify-end gap-4 p-4 border-t">
        <Button variant="outline" className="flex items-center gap-2">
          Bearbeiten
        </Button>
        <Button className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Init
        </Button>
      </div>
    </div>
  );
}
