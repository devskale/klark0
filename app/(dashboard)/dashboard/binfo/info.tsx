import React from "react";
import { useProject } from "@/context/ProjectContext";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";


export default function Info() {
  const { selectedProject } = useProject();
  const projektName = selectedProject ?? "Projektname nicht verfügbar";

  return (
    <div className="space-y-4 p-4 bg-white rounded-md shadow">
      <h2 className="text-2xl font-bold">{projektName}</h2>
      <div className="space-y-1">
        <p><strong>Vergabestelle:</strong> Muster Vergabestelle</p>
        <p><strong>Adresse:</strong> Muster Straße 1, 12345 Musterstadt</p>
        <p><strong>Projekt ID:</strong> {selectedProject ?? "N/A"}</p>
        <p><strong>Start:</strong> 01.01.2023</p>
        <p><strong>Bieterabgabe:</strong> 15.01.2023</p>
        <p><strong>Ende:</strong> 31.12.2023</p>
        <p><strong>Beschreibung:</strong> Dies ist eine Beispielbeschreibung.</p>
      </div>
      <div className="flex justify-end gap-4 p-4 border-t">
        <Button variant="outline" className="flex items-center gap-2">Bearbeiten</Button>
          <Button className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Init
          </Button>
      </div>
    </div>
  );
}
