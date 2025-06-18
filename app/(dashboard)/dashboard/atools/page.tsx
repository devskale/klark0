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
import { CheckCircle2, Clock, Play, Loader2, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { trimName } from "@/lib/trim";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Tool = {
  id: number;
  name: string;
  type: string;
  description: string;
  status: string;
  owner: string;
  external?: boolean;
};

const toolsList: Tool[] = [
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
    name: "FakeTool Ext",
    type: "fakejob",
    description:
      "Externes FakeTool - macht Request an externe API und kann Status abfragen.",
    status: "",
    owner: "",
    external: true, // Mark as external tool
  },
  {
    id: 2,
    name: "StruktText",
    type: "parsing",
    description:
      "Konvertiert alle Projektdokumente in strukturierte Textformate, die als Basis für weitere Analysen dienen.",
    status: "",
    owner: "",
  },
  {
    id: 3,
    name: "Kategorisierung",
    type: "analysis",
    description:
      "Kategorisierung von Dokumenten auf Basis einer Inhaltsanalyse.",
    status: "",
    owner: "",
  },
  {
    id: 4,
    name: "Kriterien Extraktion",
    type: "analysis",
    description:
      "Erstellung eines Kriterienkatalogs aus Analyse von Ausschreibungsinformationen",
    status: "pending",
    owner: "",
  },
  {
    id: 5,
    name: "Kriterien Überprüfung",
    type: "analysis",
    description: "Überprüfung der extrahierten Kriterien",
    status: "pending",
    owner: "",
  },
  {
    id: 6,
    name: "System Tools",
    type: "utility",
    description:
      "Zeigt verfügbare Worker-Tools und Dokument-Parser Einstellungen an.",
    status: "",
    owner: "",
  },
];

export default function AtoolsPage() {
  const { selectedProject, selectedBieter, selectedDok } = useProject();
  const [runningJobs, setRunningJobs] = useState<Set<number>>(new Set());
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // State for tracking external job status
  const [externalJobStatus, setExternalJobStatus] = useState<
    Map<
      number,
      {
        jobId: string;
        status: string;
        result?: any;
        error?: string;
        progress?: number;
      }
    >
  >(new Map());
  const [refreshingJobs, setRefreshingJobs] = useState<Set<number>>(new Set());

  // State for fetched tools
  const [fetchedTools, setFetchedTools] = useState<{ id: string }[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch worker settings including document parser configuration
  const { data: workerSettings, error: workerSettingsError } = useSWR(
    "/api/worker/settings",
    fetcher,
    { revalidateOnFocus: false }
  );

  const startJob = async (tool: Tool) => {
    if (runningJobs.has(tool.id)) return;

    setRunningJobs((prev) => new Set([...prev, tool.id]));

    try {
      const response = await fetch("/api/worker/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: tool.type,
          name: tool.name,
          project: selectedProject,
          parameters:
            tool.type === "fakejob"
              ? {
                  maxDuration: 2,
                  external: tool.external || false, // Add external flag
                }
              : {}, // Reduced to 2 seconds max
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`${tool.name} gestartet`, {
          description: `Job ID: ${result.data.id}`,
        }); // For fakejob, handle internal vs external differently
        if (tool.type === "fakejob") {
          if (tool.external) {
            // For external FakeTool, store job info for status tracking
            setExternalJobStatus(
              (prev) =>
                new Map(
                  prev.set(tool.id, {
                    jobId: result.data.id,
                    status: result.data.status || "pending",
                    progress: result.data.progress || 0,
                  })
                )
            );
            toast.info("FakeTool Ext gestartet", {
              description:
                "Job läuft auf externem Parser-Service (5-15 Sekunden). Verwenden Sie 'Aktualisieren' zum Status-Check.",
            });

            // Remove from running jobs after submission
            setTimeout(() => {
              setRunningJobs((prev) => {
                const newSet = new Set(prev);
                newSet.delete(tool.id);
                return newSet;
              });
            }, 1000);
          } else {
            // Internal fakejob - same as before
            toast.info("FakeJob läuft...", {
              description: "Wird in 1-2 Sekunden abgeschlossen",
            });

            setTimeout(() => {
              setRunningJobs((prev) => {
                const newSet = new Set(prev);
                newSet.delete(tool.id);
                return newSet;
              });

              // Simulate random success (95% success rate)
              const success = Math.random() > 0.05;

              if (success) {
                toast.success("FakeJob erfolgreich abgeschlossen!", {
                  description: `Simulierte Verarbeitung erfolgreich (Job: ${result.data.id})`,
                });
              } else {
                toast.error("FakeJob fehlgeschlagen", {
                  description: "Simulierter Fehler (5% Wahrscheinlichkeit)",
                });
              }
            }, 1500); // Show completion after 1.5 seconds
          }
        } else {
          // For other job types, inform user about remote processing
          toast.info(`${tool.name} wird verarbeitet`, {
            description: "Der Job läuft auf dem externen Parser-Service",
          });

          // Remove from running jobs after a short delay to show it was submitted
          setTimeout(() => {
            setRunningJobs((prev) => {
              const newSet = new Set(prev);
              newSet.delete(tool.id);
              return newSet;
            });
          }, 2000);
        }
      } else {
        throw new Error(result.error || "Unbekannter Fehler");
      }
    } catch (error) {
      console.error("Error starting job:", error);
      toast.error(`Fehler beim Starten von ${tool.name}`, {
        description:
          error instanceof Error ? error.message : "Unbekannter Fehler",
      });
      setRunningJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tool.id);
        return newSet;
      });
    }
  }; // Function to refresh external job status
  const refreshJobStatus = async (tool: Tool) => {
    const jobInfo = externalJobStatus.get(tool.id);
    if (!jobInfo) {
      toast.error("Kein Job zum Aktualisieren gefunden");
      return;
    }

    console.log(
      `🔄 Refreshing job status for tool ${tool.name} (${tool.id}), jobId: ${jobInfo.jobId}`
    );
    setRefreshingJobs((prev) => new Set([...prev, tool.id]));

    try {
      const apiUrl = `/api/worker/jobs/${jobInfo.jobId}`;
      console.log(`📡 Making request to: ${apiUrl}`);

      const response = await fetch(apiUrl);
      const result = await response.json();

      console.log(`📊 Response from API:`, result);

      if (result.success) {
        const job = result.data;

        console.log(`✅ Job data received:`, {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          hasRemoteJobId: !!job.parameters?.remoteJobId,
          remoteStatus: result.remoteStatus,
        });

        // Update job status
        setExternalJobStatus(
          (prev) =>
            new Map(
              prev.set(tool.id, {
                jobId: jobInfo.jobId,
                status: job.status,
                result: job.result,
                error: job.error,
                progress: job.progress || 0,
              })
            )
        );

        // Show toast based on status
        if (job.status === "completed") {
          toast.success("Externe Job abgeschlossen!", {
            description: `${tool.name}: ${
              job.result?.message || "Erfolgreich"
            }`,
          });
        } else if (job.status === "failed") {
          toast.error("Externe Job fehlgeschlagen", {
            description: job.error || "Unbekannter Fehler",
          });
        } else {
          toast.info(`Job Status: ${job.status}`, {
            description: `Fortschritt: ${job.progress || 0}%`,
          });
        }
      } else {
        console.error(`❌ API returned error:`, result.error);
        throw new Error(result.error || "Fehler beim Abrufen des Job-Status");
      }
    } catch (error) {
      console.error("Error refreshing job status:", error);
      toast.error("Fehler beim Aktualisieren", {
        description:
          error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    } finally {
      setRefreshingJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tool.id);
        return newSet;
      });
    }
  };

  // Simplified polling function (only used for non-fakejob types if needed)
  const pollJobStatus = (jobId: string, toolId: number) => {
    // For fakejob, we don't need polling anymore as it's handled above
    // For other job types, you could implement polling here if needed
    console.log(
      `Polling for job ${jobId} (tool ${toolId}) - not implemented for non-fakejob types`
    );
  };
  // Fetch tools when modal opens
  useEffect(() => {
    if (isListModalOpen) {
      setFetching(true);
      setFetchError(null);
      fetch("/api/worker/list")
        .then(async (res) => {
          if (!res.ok) throw new Error("Fehler beim Laden der Tools");
          return res.json();
        })
        .then((data) => {
          setFetchedTools(data.tasks || []);
          // Handle API errors returned in response
          if (data.error) {
            setFetchError(
              data.error + (data.fallback ? " (Fallback-Daten angezeigt)" : "")
            );
          }
          setFetching(false);
        })
        .catch((err) => {
          setFetchError(err.message || "Unbekannter Fehler");
          setFetching(false);
        });
    }
  }, [isListModalOpen]);

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
            {" "}
            <DialogHeader>
              <DialogTitle>Verfügbare Tools (API)</DialogTitle>
              <DialogDescription>
                Diese Liste wird von der konfigurierten Parser-URL abgerufen und
                zeigt alle verfügbaren Worker-Typen des externen Systems.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              {fetching && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  <p>Lade Tools von externer API...</p>
                </div>
              )}
              {fetchError && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 text-sm">
                    <strong>Warnung:</strong> {fetchError}
                  </p>
                </div>
              )}
              {!fetching && (
                <ul className="list-disc pl-5 space-y-1">
                  {fetchedTools.length === 0 && (
                    <li className="text-gray-500">
                      Keine Tools verfügbar oder Parser nicht konfiguriert.
                    </li>
                  )}
                  {fetchedTools.map((tool) => (
                    <li key={tool.id}>
                      <span className="font-mono bg-gray-100 px-1 rounded">
                        {tool.id}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsListModalOpen(false)}>
                Schließen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal for Document Parser Settings */}
      {isSettingsModalOpen && (
        <Dialog
          open={isSettingsModalOpen}
          onOpenChange={setIsSettingsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Dokument Parser Einstellungen</DialogTitle>
              <DialogDescription>
                Diese Einstellungen steuern, wie der externe Parser mit
                Dokumenten arbeitet und welche Optionen verfügbar sind.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 space-y-4">
              {workerSettingsError && (
                <p className="text-red-500">
                  Fehler beim Laden der Einstellungen:{" "}
                  {workerSettingsError.message}
                </p>
              )}
              {!workerSettings?.success && !workerSettingsError && (
                <p>Lade Einstellungen...</p>
              )}{" "}
              {workerSettings?.success && (
                <div className="space-y-4">
                  {/* Parser URL Status */}
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-sm font-medium">
                      Parser URL Status
                    </label>
                    {workerSettings.data.documentParser?.parserUrl ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-800 text-sm font-medium">
                            Konfiguriert
                          </span>
                        </div>
                        <div className="mt-2 font-mono text-sm bg-white p-2 rounded border">
                          {workerSettings.data.documentParser.parserUrl}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-red-800 text-sm font-medium">
                            Nicht konfiguriert
                          </span>
                        </div>
                        <p className="text-red-600 text-sm mt-1">
                          Remote Worker-API kann nicht erreicht werden.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Parser Options */}
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-sm font-medium">
                      Aktivierte Parser
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(workerSettings.data.documentParser || {})
                        .filter(
                          ([key, value]) =>
                            key !== "parserUrl" &&
                            typeof value === "boolean" &&
                            value
                        )
                        .map(([key]) => (
                          <div
                            key={key}
                            className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm">{key}</span>
                          </div>
                        ))}
                    </div>
                    {Object.entries(
                      workerSettings.data.documentParser || {}
                    ).filter(
                      ([key, value]) =>
                        key !== "parserUrl" &&
                        typeof value === "boolean" &&
                        value
                    ).length === 0 && (
                      <p className="text-gray-500 text-sm">
                        Keine Parser aktiviert
                      </p>
                    )}
                  </div>

                  {/* Status Information */}
                  <div className="p-3 bg-blue-50 rounded border">
                    <p className="text-sm text-blue-800">
                      <strong>Status:</strong>{" "}
                      {workerSettings.data.documentParser?.parserUrl
                        ? "Konfiguriert"
                        : "Nicht konfiguriert"}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Einstellungen können unter "Einstellungen" → "Dokument
                      Parser" verwaltet werden.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSettingsModalOpen(false)}>
                Schließen
              </Button>
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
                <TableCell>{tool.owner || "-"}</TableCell>{" "}
                <TableCell>
                  {(() => {
                    // Check for external job status first
                    const jobInfo = externalJobStatus.get(tool.id);
                    if (jobInfo) {
                      switch (jobInfo.status) {
                        case "completed":
                          return (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              Abgeschlossen
                            </Badge>
                          );
                        case "failed":
                          return (
                            <Badge variant="destructive" className="gap-1">
                              <Clock className="h-4 w-4" />
                              Fehlgeschlagen
                            </Badge>
                          );
                        case "running":
                          return (
                            <Badge variant="secondary" className="gap-1">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Läuft ({jobInfo.progress || 0}%)
                            </Badge>
                          );
                        case "pending":
                          return (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-4 w-4" />
                              Wartend
                            </Badge>
                          );
                        default:
                          return (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-4 w-4" />
                              {jobInfo.status}
                            </Badge>
                          );
                      }
                    }

                    // Fallback to original status logic
                    if (tool.status === "completed") {
                      return (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Abgeschlossen
                        </Badge>
                      );
                    } else {
                      return (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-4 w-4" />
                          Ausstehend
                        </Badge>
                      );
                    }
                  })()}
                </TableCell>
                <TableCell className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={runningJobs.has(tool.id)}>
                        {runningJobs.has(tool.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>{" "}
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => startJob(tool)}
                        disabled={runningJobs.has(tool.id) || tool.id === 6}>
                        Starten
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>Zuweisen</DropdownMenuItem>
                      <DropdownMenuItem disabled>Bearbeiten</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* Refresh button for external tools */}
                  {tool.external && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshJobStatus(tool)}
                      disabled={
                        refreshingJobs.has(tool.id) ||
                        !externalJobStatus.has(tool.id)
                      }
                      title="Job-Status aktualisieren">
                      {refreshingJobs.has(tool.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {/* System Tools buttons */}
                  {tool.id === 6 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsListModalOpen(true)}>
                        List
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSettingsModalOpen(true)}>
                        Einstellungen
                      </Button>
                    </>
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
