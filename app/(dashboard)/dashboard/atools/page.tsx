"use client"; // Make it a client component

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useProject } from "@/context/ProjectContext"; // Example: import useProject

export default function AtoolsPage() {
  const { selectedProject, selectedBieter, selectedDok } = useProject(); // Example: consume context

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
        Tools
      </h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            Tools für Projekt: {selectedProject || "Kein Projekt ausgewählt"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Hier können Sie Nachrichten für ATools verwalten.
            {selectedBieter && <p>Ausgewählter Bieter: {selectedBieter}</p>}
            {selectedDok && <p>Ausgewähltes Dokument: {selectedDok}</p>}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
