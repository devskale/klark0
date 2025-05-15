"use client";

import { useProject } from "@/context/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";

const sampleCriteria = [
  {
    id: 1,
    name: "Preis",
    description: "Angebotspreis inkl. aller Nebenkosten",
    weight: 40,
    type: "numeric",
    status: "completed",
  },
  {
    id: 2,
    name: "Qualität",
    description: "Qualität der angebotenen Leistung",
    weight: 30,
    type: "text",
    status: "pending",
  },
  {
    id: 3,
    name: "Lieferzeit",
    description: "Zeit bis zur vollständigen Lieferung",
    weight: 20,
    type: "numeric",
    status: "completed",
  },
  {
    id: 4,
    name: "Referenzen",
    description: "Nachweis ähnlicher Projekte",
    weight: 10,
    type: "text",
    status: "pending",
  },
];

export default function AKriterienPage() {
  const { selectedProject, selectedBieter } = useProject();

  return (
    <section className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Kriterien für {selectedProject ?? "kein Projekt"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kriterium</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Gewichtung</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleCriteria.map((criterion) => (
                  <TableRow key={criterion.id}>
                    <TableCell className="font-medium">{criterion.name}</TableCell>
                    <TableCell>{criterion.description}</TableCell>
                    <TableCell>{criterion.weight}%</TableCell>
                    <TableCell>
                      {criterion.status === "completed" ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Abgeschlossen
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-4 w-4" />
                          Ausstehend
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
