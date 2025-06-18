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
import { useState, useEffect, memo } from "react";
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
    type: "fake_task",
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
      string,
      {
        jobId: string;
        toolId: string;
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

  // Constants for timeouts
  const JOB_SUBMISSION_DELAY = 1000; // Delay before removing from running jobs for external fake jobs
  const INTERNAL_FAKEJOB_COMPLETION_DELAY = 1500; // Delay for internal fake job completion simulation
  const OTHER_JOB_SUBMISSION_DELAY = 2000; // Delay for other job types submission

  // Utility function to add a tool to running jobs
  const addToRunningJobs = (toolId: number) => {
    setRunningJobs((prev) => new Set([...prev, toolId]));
  };

  // Utility function to remove a tool from running jobs
  const removeFromRunningJobs = (toolId: number) => {
    setRunningJobs((prev) => {
      const newSet = new Set(prev);
      newSet.delete(toolId);
      return newSet;
    });
  };

  // Utility function to handle job API request
  const submitJobRequest = async (tool: Tool) => {
    return await fetch("/api/worker/jobs", {
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
  };

  // Utility function to handle job success response
  const handleJobSuccess = (tool: Tool, result: any) => {
    const job = { id: result.data.id, ...result.data };
    setExternalJobStatus(prev => new Map(prev.set(tool.id.toString(), { jobId: job.id, toolId: tool.id.toString(), status: "initiated" })));
    toast.success(`${tool.name} gestartet`, {
      description: `Job ID: ${job.id}`,
    });
    if (tool.type === "fakejob") {
      if (tool.external) {
        setExternalJobStatus(
          (prev) =>
            new Map(
              prev.set(result.data.id, {
                jobId: result.data.id,
                toolId: tool.id.toString(),
                status: "initiated",
                progress: 0,
              })
            )
        );
        toast.info("FakeTool Ext gestartet", {
          description:
            "Job läuft auf externem Parser-Service. Verwenden Sie 'Aktualisieren' zum Status-Check.",
        });
        setTimeout(() => removeFromRunningJobs(tool.id), JOB_SUBMISSION_DELAY);
      } else {
        toast.info("FakeJob läuft...", {
          description: "Wird in 1-2 Sekunden abgeschlossen",
        });
        setTimeout(() => {
          removeFromRunningJobs(tool.id);
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
        }, INTERNAL_FAKEJOB_COMPLETION_DELAY);
      }
    } else {
      toast.info(`${tool.name} wird verarbeitet`, {
        description: "Der Job läuft auf dem externen Parser-Service",
      });
      setTimeout(() => removeFromRunningJobs(tool.id), OTHER_JOB_SUBMISSION_DELAY);
    }
    // Enable refresh button after 250ms delay
    setTimeout(() => {
      setRefreshingJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tool.id);
        return newSet;
      });
    }, 250);
  };

  // Utility function to handle job error
  const handleJobError = (tool: Tool, error: unknown) => {
    console.error("Error starting job:", error);
    let errorMessage = "Unbekannter Fehler";
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes("network")) {
        errorMessage += " - Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.";
      } else if (error.message.includes("permission") || error.message.includes("unauthorized")) {
        errorMessage += " - Überprüfen Sie Ihre Berechtigungen oder melden Sie sich erneut an.";
      }
    }
    toast.error(`Fehler beim Starten von ${tool.name}`, {
      description: errorMessage,
      action: {
        label: "Erneut versuchen",
        onClick: () => startJob(tool),
      },
    });
    removeFromRunningJobs(tool.id);
  };

  const startJob = async (tool: Tool) => {
    if (runningJobs.has(tool.id)) return;
    addToRunningJobs(tool.id);
    try {
      const response = await submitJobRequest(tool);
      const result = await response.json();
      if (result.success) {
        handleJobSuccess(tool, result);
      } else {
        throw new Error(result.error || "Unbekannter Fehler");
      }
    } catch (error) {
      handleJobError(tool, error);
    }
  };

  // Utility function to get job info from external status
  const getJobInfo = (tool: Tool) => {
    return externalJobStatus.get(tool.external ? tool.id.toString() : tool.id.toString());
  };

  // Utility function to handle job status toast notifications
  const showJobStatusToast = (job: any, jobId: string) => {
    if (job.status === "complete") {
      toast.success("Job erfolgreich abgeschlossen!", {
        description: `Job ID: ${jobId}. Status: ${job.status}. Ergebnis: ${job.result?.message || "Erfolgreich"}`,
      });
    } else if (job.status === "failed") {
      toast.error("Externe Job fehlgeschlagen", {
        description: `Job ID: ${jobId}. Status: ${job.status}. Fehler: ${job.error || "Unbekannter Fehler"}`,
      });
    } else if (job.status === "pending" || job.status === "in_progress") {
      toast.info(`Job Status: ${job.status}`, {
        description: `Job ID: ${jobId}. Fortschritt: ${job.progress || 0}%`,
      });
    } else {
      toast.info(`Unerwarteter Job Status: ${job.status}`, {
        description: `Job ID: ${jobId}. Fortschritt: ${job.progress || 0}%. Details: ${job.result?.message || 'Keine spezifische Nachricht'}`,
      });
    }
  };

  // Utility function to handle job status error
  const handleStatusError = (tool: Tool, error: unknown) => {
    console.error("Error refreshing job status:", error);
    let errorMessage = "Unbekannter Fehler";
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes("network") || error.message.includes("timeout")) {
        errorMessage += " - Überprüfen Sie Ihre Internetverbindung.";
      } else if (error.message.includes("404") || error.message.includes("not found")) {
        errorMessage += " - Job-ID nicht gefunden. Möglicherweise wurde der Job gelöscht oder abgeschlossen.";
      }
    }
    toast.error("Fehler beim Aktualisieren", {
      description: errorMessage,
      action: {
        label: "Erneut versuchen",
        onClick: () => refreshJobStatus(tool),
      },
    });
  };

  // Function to refresh external job status
  const refreshJobStatus = async (tool: Tool) => {
    const jobInfo = getJobInfo(tool);
    if (!jobInfo) {
      toast.error("Kein Job zum Aktualisieren gefunden");
      return;
    }

    console.log(
      `🔄 Refreshing job status for tool ${tool.name} (${tool.id}), jobId: ${jobInfo.jobId}`
    );
    setRefreshingJobs((prev) => new Set([...prev, tool.id]));

    // Update status to indicate refresh has started
    const currentJobInfo = externalJobStatus.get(tool.id.toString());
    if (currentJobInfo) {
      setExternalJobStatus(
        (prev) =>
          new Map(
            prev.set(tool.id.toString(), {
              ...currentJobInfo,
              status: "in_progress",
              progress: 0,
            })
          )
      );
    }

    try {
      const apiUrl = `/api/worker/jobs/${jobInfo.jobId}`;
      console.log(`📡 Making request to: ${apiUrl}`);

      const response = await fetch(apiUrl);
      const result = await response.json(); // This is the raw API response

      console.log(`📊 Response from API:`, result);

      if (response.ok && result.job_id && result.status) {
        const job = {
          id: result.job_id,
          status: result.status,
          result: result.info?.result,
          error: result.info?.error,
          progress: result.info?.progress,
          parameters: result.info?.parameters,
        };

        console.log(`✅ Job data received and parsed:`, job);

        setExternalJobStatus(
          (prev) =>
            new Map(
              prev.set(tool.id.toString(), {
                jobId: job.id,
                toolId: tool.id.toString(),
                status: job.status,
                result: job.result,
                error: job.error,
                progress: job.progress || 0,
              })
            )
        );

        showJobStatusToast(job, job.id);
      } else {
        console.error(`❌ API returned error:`, result.error);
        const errorMessage = result.error || result.message || "Fehler beim Abrufen des Job-Status, keine spezifische Fehlermeldung vom Server.";
        throw new Error(errorMessage);
      }
    } catch (error) {
      handleStatusError(tool, error);
    } finally {
      setRefreshingJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tool.id);
        return newSet;
      });
    }
  };

  // Polling has been removed. Refresh button directly calls the proxy route.
  // Fetch tools when modal opens, only re-fetch if modal is opened anew
  useEffect(() => {
    if (isListModalOpen && fetchedTools.length === 0 && !fetching) {
      setFetching(true);
      setFetchError(null);
      fetch("/api/worker/list")
        .then(async (res) => {
          if (!res.ok) throw new Error(`Fehler beim Laden der Tools: Status ${res.status}`);
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
          let errorMessage = err.message || "Unbekannter Fehler";
          if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
            errorMessage += " - Bitte überprüfen Sie Ihre Internetverbindung.";
          }
          setFetchError(errorMessage);
          setFetching(false);
        });
    }
  }, [isListModalOpen, fetchedTools.length, fetching]);

  // Memoized Table Row component to prevent unnecessary re-renders
  const ToolRow = memo(({ tool }: { tool: Tool }) => (
    <TableRow key={tool.id}>
      <TableCell className="font-medium">
        <span className="hover:underline" title={tool.description}>
          {tool.name}
        </span>
      </TableCell>
      <TableCell>{tool.owner || "-"}</TableCell>
      <TableCell className="text-center">
        {Object.values(externalJobStatus).find(j => j.toolId === tool.id.toString())?.jobId || "-"}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-4 w-4" />
          Bereit
        </Badge>
      </TableCell>
        <TableCell className="flex gap-2">
        <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={runningJobs.has(tool.id)}
                        aria-label={runningJobs.has(tool.id) ? "Job läuft" : "Aktionen für " + tool.name}>
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
                        disabled={runningJobs.has(tool.id) || tool.id === 6}
                        aria-label={`Starten von ${tool.name}`}>
                        Starten
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled aria-label="Zuweisen (nicht verfügbar)">Zuweisen</DropdownMenuItem>
                      <DropdownMenuItem disabled aria-label="Bearbeiten (nicht verfügbar)">Bearbeiten</DropdownMenuItem>
                    </DropdownMenuContent>
        </DropdownMenu>
        {/* Refresh button for all tools */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refreshJobStatus(tool)}
          disabled={
            refreshingJobs.has(tool.id) ||
            !externalJobStatus.has(tool.id.toString())
          }
          title="Job-Status aktualisieren"
          aria-label={`Aktualisieren des Job-Status für ${tool.name}`}>
          {refreshingJobs.has(tool.id) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
        {/* System Tools buttons */}
        {tool.id === 6 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsListModalOpen(true)}
              aria-label="Liste der verfügbaren Tools anzeigen">
              List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsModalOpen(true)}
              aria-label="Dokument-Parser-Einstellungen anzeigen">
              Einstellungen
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  ));

  ToolRow.displayName = 'ToolRow';

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
        <Dialog open={isListModalOpen} onOpenChange={setIsListModalOpen} aria-labelledby="list-modal-title">
          <DialogContent aria-describedby="list-modal-description">
            {" "}
            <DialogHeader>
              <DialogTitle id="list-modal-title">Verfügbare Tools (API)</DialogTitle>
              <DialogDescription id="list-modal-description">
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
                <ul className="list-disc pl-5 space-y-1" role="list" aria-label="Liste der verfügbaren Tools">
                  {fetchedTools.length === 0 && (
                    <li className="text-gray-500">
                      Keine Tools verfügbar oder Parser nicht konfiguriert.
                    </li>
                  )}
                  {fetchedTools.map((tool) => (
                    <li key={tool.id} role="listitem">
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
                onClick={() => setIsListModalOpen(false)}
                aria-label="Modal schließen">
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
          onOpenChange={setIsSettingsModalOpen}
          aria-labelledby="settings-modal-title">
          <DialogContent className="max-w-2xl" aria-describedby="settings-modal-description">
            <DialogHeader>
              <DialogTitle id="settings-modal-title">Dokument Parser Einstellungen</DialogTitle>
              <DialogDescription id="settings-modal-description">
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
                    <label className="text-sm font-medium" htmlFor="parser-url-status">
                      Parser URL Status
                    </label>
                    {workerSettings.data.documentParser?.parserUrl ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded" id="parser-url-status">
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
                      <div className="p-3 bg-red-50 border border-red-200 rounded" id="parser-url-status">
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
                    <label className="text-sm font-medium" htmlFor="active-parsers">
                      Aktivierte Parser
                    </label>
                    <div className="grid grid-cols-2 gap-2" id="active-parsers">
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
                onClick={() => setIsSettingsModalOpen(false)}
                aria-label="Einstellungen-Modal schließen">
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
              <TableHead>Job ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {toolsList.map((tool) => (
              <ToolRow key={tool.id} tool={tool} />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
