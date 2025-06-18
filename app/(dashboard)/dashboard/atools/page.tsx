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
import { CheckCircle2, Clock, Play, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { trimName } from "@/lib/trim";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const toolsList = [
  {
    id: 0,
    name: "FakeTool",
    type: "fakejob",
    description:
      "Dauert einige Sekunden und gibt ein zufälliges Ergebnis zurück.",
    status: "",
    owner: "",
  },
  {
    id: 1,
    name: "StruktText",
    type: "parsing",
    description:
      "Konvertiert alle Projektdokumente in strukturierte Textformate, die als Basis für weitere Analysen dienen.",
    status: "",
    owner: "",
  },
  {
    id: 2,
    name: "Kategorisierung",
    type: "analysis",
    description:
      "Kategorisierung von Dokumenten auf Basis einer Inhaltsanalyse.",
    status: "",
    owner: "",
  },
  {
    id: 3,
    name: "Kriterien Extraktion",
    type: "analysis",
    description:
      "Erstellung eines Kriterienkatalogs aus Analyse von Ausschreibungsinformationen",
    status: "pending",
    owner: "",
  },
  {
    id: 4,
    name: "Kriterien Überprüfung",
    type: "analysis",
    description: "Überprüfung der extrahierten Kriterien",
    status: "pending",
    owner: "",
  },
  {
    id: 5,
    name: "List Tool",
    type: "utility",
    description: "Lists all available tools from a web API and displays them in a modal.",
    status: "",
    owner: "",
  },
];

export default function AtoolsPage() {
  const { selectedProject, selectedBieter, selectedDok } = useProject();
  const [runningJobs, setRunningJobs] = useState<Set<number>>(new Set());

  const startJob = async (tool: typeof toolsList[0]) => {
    if (runningJobs.has(tool.id)) return;

    setRunningJobs(prev => new Set([...prev, tool.id]));

    try {
      const response = await fetch('/api/worker/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: tool.type,
          name: tool.name,
          project: selectedProject,
          parameters: tool.type === 'fakejob' ? { maxDuration: 10 } : {},
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${tool.name} gestartet`, {
          description: `Job ID: ${result.data.id}`,
        });
        
        // For fakejob, poll for completion
        if (tool.type === 'fakejob') {
          pollJobStatus(result.data.id, tool.id);
        }
      } else {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
    } catch (error) {
      console.error('Error starting job:', error);
      toast.error(`Fehler beim Starten von ${tool.name}`, {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
      setRunningJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(tool.id);
        return newSet;
      });
    }
  };

  const pollJobStatus = (jobId: string, toolId: number) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/worker/jobs/${jobId}`);
        const result = await response.json();

        if (result.success) {
          const job = result.data;
          
          if (job.status === 'completed') {
            clearInterval(interval);
            setRunningJobs(prev => {
              const newSet = new Set(prev);
              newSet.delete(toolId);
              return newSet;
            });
            toast.success('FakeJob abgeschlossen!', {
              description: `Ergebnis: ${job.result?.message || 'Erfolgreich'}`,
            });
          } else if (job.status === 'failed') {
            clearInterval(interval);
            setRunningJobs(prev => {
              const newSet = new Set(prev);
              newSet.delete(toolId);
              return newSet;
            });
            toast.error('FakeJob fehlgeschlagen', {
              description: job.error || 'Unbekannter Fehler',
            });
          } else if (job.status === 'cancelled') {
            clearInterval(interval);
            setRunningJobs(prev => {
              const newSet = new Set(prev);
              newSet.delete(toolId);
              return newSet;
            });
            toast.info('FakeJob abgebrochen');
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 1000); // Poll every second

    // Cleanup after 2 minutes to prevent memory leaks
    setTimeout(() => {
      clearInterval(interval);
      setRunningJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolId);
        return newSet;
      });
    }, 120000);
  };

  const [isListModalOpen, setIsListModalOpen] = useState(false);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
        Ausschreibungsprojekt Aktionen
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Für das Ausschreibungsprojekt <b>{trimName(selectedProject ?? "")}</b>{" "}
        sind die folgenden Aktionen und Tools anwendbar.
      </p>

      {/* Modal for List Tool - Ensure it doesn't interfere with dropdown focus */}
      {isListModalOpen && (
        <Dialog open={isListModalOpen} onOpenChange={setIsListModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Available Tools</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              {/* Placeholder for tools list from API */}
              <p>Tools list will be fetched and displayed here.</p>
              {/* Add logic here to fetch and render tools from web API */}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsListModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
                <TableCell className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={runningJobs.has(tool.id)}
                      >
                        {runningJobs.has(tool.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => startJob(tool)}
                        disabled={runningJobs.has(tool.id) || tool.id === 5}
                      >
                        Starten
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>Zuweisen</DropdownMenuItem>
                      <DropdownMenuItem disabled>Bearbeiten</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {tool.id === 5 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsListModalOpen(true)}
                    >
                      List
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
