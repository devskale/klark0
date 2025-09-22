"use client";

import { useProject } from "@/context/ProjectContext";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { loadKriterienFromFile, updateKriteriumPruefung } from "@/lib/kriterien/persistence";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, Edit, AlertCircle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ProjektKriterium, 
  groupKriterienByCategory, 
  groupKriterienByType 
} from "@/types/kriterien";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Kriterien page component for displaying and managing criteria from projekt.json
 */
export default function AKriterienPage() {
  const { selectedProject } = useProject();
  
  // State für geladene Kriterien aus projekt.json
  const [kriterienData, setKriterienData] = useState<ProjektKriterium[] | null>(null);
  const [lastLoaded, setLastLoaded] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // State für Kriterien-Updates
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // State für UI
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // SWR für das Laden der Kriterien aus projekt.json
  const { data: loadedKriterien, error: kriterienLoadError, mutate: mutateKriterien } = useSWR(
    selectedProject ? `projekt-kriterien-${selectedProject}` : null,
    () => loadKriterienFromFile(selectedProject!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Effekt zum Setzen der geladenen Daten
  useEffect(() => {
    if (loadedKriterien) {
      setKriterienData(loadedKriterien);
      setLastLoaded(new Date().toISOString());
      setLoadError(null);
    } else if (kriterienLoadError) {
      setLoadError(kriterienLoadError.message || 'Fehler beim Laden der Kriterien');
    }
  }, [loadedKriterien, kriterienLoadError]);

  /**
   * Update the review status of a specific kriterium
   */
  const handleUpdateKriterium = async (kriteriumId: string, newStatus: string, bemerkung?: string) => {
    if (!selectedProject) {
      setUpdateError("Kein Projekt ausgewählt");
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const pruefung = {
        status: newStatus,
        bemerkung: bemerkung || null,
        pruefer: "System", // TODO: Get actual user name
        datum: new Date().toISOString()
      };

      await updateKriteriumPruefung(selectedProject, kriteriumId, pruefung);
      
      // Revalidate SWR cache to refresh the data
      await mutateKriterien();
      toast.success("Kriterium erfolgreich aktualisiert");
    } catch (err) {
      console.error("Error updating kriterium:", err);
      setUpdateError(
        err instanceof Error ? err.message : "Unbekannter Fehler beim Aktualisieren"
      );
      toast.error("Fehler beim Aktualisieren des Kriteriums");
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Get badge variant based on status
   */
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "erfüllt":
        return <Badge variant="default" className="bg-green-100 text-green-800">Erfüllt</Badge>;
      case "nicht_erfüllt":
        return <Badge variant="destructive">Nicht erfüllt</Badge>;
      case "teilweise_erfüllt":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Teilweise erfüllt</Badge>;
      case "in_prüfung":
        return <Badge variant="outline" className="border-blue-200 text-blue-800">In Prüfung</Badge>;
      default:
        return <Badge variant="outline">Nicht geprüft</Badge>;
    }
  };

  /**
   * Filter kriterien based on selected filters
   */
  const getFilteredKriterien = () => {
    if (!kriterienData) return [];
    
    let filtered = kriterienData;
    
    if (selectedStatus !== "all") {
      filtered = filtered.filter(k => k.pruefung.status === selectedStatus);
    }
    
    return filtered;
  };

  /**
   * Group kriterien for display
   */
  const getGroupedKriterien = () => {
    const filtered = getFilteredKriterien();
    
    switch (activeTab) {
      case "category":
        return groupKriterienByCategory(filtered);
      case "type":
        return groupKriterienByType(filtered);
      default:
        return { "Alle Kriterien": filtered };
    }
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Bitte wählen Sie ein Projekt aus.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Fehler beim Laden der Kriterien</p>
          <p className="text-sm text-muted-foreground">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!kriterienData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Lade Kriterien...</p>
        </div>
      </div>
    );
  }

  const groupedKriterien = getGroupedKriterien();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kriterien</h1>
          <p className="text-muted-foreground">
            {kriterienData.length} Kriterien aus projekt.json
            {lastLoaded && ` • Geladen: ${new Date(lastLoaded).toLocaleString('de-DE')}`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="erfüllt">Erfüllt</SelectItem>
              <SelectItem value="nicht_erfüllt">Nicht erfüllt</SelectItem>
              <SelectItem value="teilweise_erfüllt">Teilweise erfüllt</SelectItem>
              <SelectItem value="in_prüfung">In Prüfung</SelectItem>
              <SelectItem value={null as any}>Nicht geprüft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Display */}
      {updateError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Fehler beim Aktualisieren</h3>
                <p className="text-sm text-red-600">{updateError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="category">Nach Kategorie</TabsTrigger>
          <TabsTrigger value="type">Nach Typ</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {Object.entries(groupedKriterien).map(([groupName, kriterien]) => (
            <Card key={groupName}>
              <CardHeader>
                <CardTitle className="text-lg">{groupName}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Anforderung</TableHead>
                      <TableHead>Dokumente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kriterien.map((kriterium) => (
                      <TableRow key={kriterium.id}>
                        <TableCell className="font-mono text-sm">{kriterium.id}</TableCell>
                        <TableCell className="font-medium">{kriterium.name}</TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate" title={kriterium.anforderung}>
                            {kriterium.anforderung}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {kriterium.dokumente.map((doc, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {doc}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(kriterium.pruefung.status)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={isUpdating}>
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Edit className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateKriterium(kriterium.id, "erfüllt")}
                              >
                                Als erfüllt markieren
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateKriterium(kriterium.id, "nicht_erfüllt")}
                              >
                                Als nicht erfüllt markieren
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateKriterium(kriterium.id, "teilweise_erfüllt")}
                              >
                                Als teilweise erfüllt markieren
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateKriterium(kriterium.id, "in_prüfung")}
                              >
                                In Prüfung setzen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
