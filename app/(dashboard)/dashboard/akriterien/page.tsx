"use client";

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

export default function AKriterien() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Ausschreibungskriterien</h1>

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
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Abgeschlossen
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1">
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
    </div>
  );
}
