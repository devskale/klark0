"use client";

import { useProject } from "@/context/ProjectContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Edit,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function AuditPage() {
  const { selectedProject, selectedBieter } = useProject();

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Kriterien für {selectedProject ?? "kein Projekt"}
      </h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">ID</TableHead>
              <TableHead>Klasse</TableHead>
              <TableHead>Kriterium</TableHead>
              <TableHead>Gewichtung</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleCriteria.map((criterion) => (
              <TableRow key={criterion.id}>
                <TableCell className="text-muted-foreground text-sm">
                  {criterion.id}
                </TableCell>
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
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Menu öffnen</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
                      <DropdownMenuItem>Bewertungen anzeigen</DropdownMenuItem>
                      <DropdownMenuItem>Details</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end gap-4 p-4 border-t">
          <Button variant="outline" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Bearbeiten
          </Button>
          <Button className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Init
          </Button>
        </div>
      </div>
    </section>
  );
}
