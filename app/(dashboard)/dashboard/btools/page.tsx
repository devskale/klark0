"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { CheckCircle2, Clock, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { trimName } from "@/lib/trim";

const toolsList = [
  {
    id: 1,
    name: "Markdown Konvertierung",
    description: "Konvertiert Markdown zu JSON im Projektverzeichnis",
    status: "pending",
    owner: "",
  },
  {
    id: 2,
    name: "Benennung",
    description: "Extrahiert Bewertungskriterien aus Dokumenten",
    status: "pending",
    owner: "",
  },
  {
    id: 3,
    name: "Kriterien Extraktion",
    description: "Extrahiert Bewertungskriterien aus Dokumenten",
    status: "pending",
    owner: "",
  },
  {
    id: 4,
    name: "Kriterien Review",
    description: "Überprüfung und Bewertung der extrahierten Kriterien",
    status: "pending",
    owner: "",
  },
];

export default function BtoolsPage() {
  const { selectedProject, selectedBieter, selectedDok } = useProject();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
        Tools für Bieter
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Für die Bieterdokumente <b>{trimName(selectedBieter ?? "")}</b> der
        Ausschreibung <b>{trimName(selectedProject ?? "")}</b> sind die
        folgenden Aktionen und Tools anwendbar.
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {toolsList.map((tool) => (
              <TableRow key={tool.id}>
                <TableCell className="font-medium">
                  <span className="hover:underline" title={tool.description}>
                    {tool.name}
                  </span>
                </TableCell>
                <TableCell>{tool.owner || "-"}</TableCell>
                <TableCell>
                  {tool.status === "completed" ? (
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
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Starten</DropdownMenuItem>
                      <DropdownMenuItem>Zuweisen</DropdownMenuItem>
                      <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
