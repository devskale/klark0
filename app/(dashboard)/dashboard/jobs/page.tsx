"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { CheckCircle2, Clock, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { trimName } from "@/lib/trim";
import { toast } from "sonner";

interface Job {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  project?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  progress: number;
  result?: any;
  error?: string;
  parameters?: Record<string, any>;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/worker/jobs');
      const result = await response.json();
      
      if (result.success) {
        setJobs(result.data);
      } else {
        toast.error('Fehler beim Laden der Jobs');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Fehler beim Laden der Jobs');
    } finally {
      setLoading(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/worker/jobs/${jobId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success('Job abgebrochen');
        fetchJobs(); // Refresh the jobs list
      } else {
        toast.error('Fehler beim Abbrechen des Jobs');
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Fehler beim Abbrechen des Jobs');
    }
  };

  useEffect(() => {
    fetchJobs();
    
    // Auto-refresh every 2 seconds
    const interval = setInterval(fetchJobs, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: Job['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            {getStatusIcon(status)}
            Warteschlange
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="secondary" className="gap-1">
            {getStatusIcon(status)}
            Läuft
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            {getStatusIcon(status)}
            Fertig
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            {getStatusIcon(status)}
            Fehler
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="gap-1">
            {getStatusIcon(status)}
            Abgebrochen
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
            Worker Jobs
          </h1>
          <p className="text-sm text-gray-500">
            Übersicht über alle laufenden und abgeschlossenen Jobs
          </p>
        </div>
        <Button onClick={fetchJobs} variant="outline" size="sm">
          Aktualisieren
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Jobs vorhanden
              </h3>
              <p className="text-gray-500">
                Starten Sie einen Job über die Tools-Seite.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Projekt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fortschritt</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Dauer</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{job.name}</div>
                      <div className="text-sm text-gray-500">{job.type}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {job.project ? trimName(job.project) : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>
                    {job.status === 'running' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">
                          {Math.round(job.progress)}%
                        </span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(job.createdAt).toLocaleString('de-DE')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {job.duration ? `${job.duration}s` : "-"}
                  </TableCell>
                  <TableCell>
                    {(job.status === 'pending' || job.status === 'running') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelJob(job.id)}
                      >
                        Abbrechen
                      </Button>
                    )}
                    {job.status === 'completed' && job.result && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast.info('Job-Ergebnis', {
                            description: JSON.stringify(job.result, null, 2),
                          });
                        }}
                      >
                        Ergebnis
                      </Button>
                    )}
                    {job.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast.error('Job-Fehler', {
                            description: job.error || 'Unbekannter Fehler',
                          });
                        }}
                      >
                        Fehler
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
