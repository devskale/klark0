"use client";

import { useState } from "react";
import useSWR from "swr";
import { useProject } from "@/context/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  FileCheck,
} from "lucide-react";

interface BieterDokument {
  anforderungstyp: string;
  dokumenttyp: string;
  bezeichnung: string;
  beilage_nummer: string | null;
  beschreibung: string;
  unterzeichnung_erforderlich: boolean;
  fachliche_pruefung: boolean;
}

interface ProjektData {
  meta?: {
    schema_version: string;
    meta: {
      auftraggeber: string;
      aktenzeichen: string;
      ausschreibungsgegenstand: string;
      datum: string;
      lose: Array<{
        nummer: string;
        bezeichnung: string;
        beschreibung: string;
        bewertungsprinzip: string;
      }>;
    };
    Autor: string;
  };
  bdoks?: {
    schema_version: string;
    bieterdokumente: BieterDokument[];
  };
}

const fetcher = async (path: string) => {
  const response = await fetch("/api/fs/read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return JSON.parse(result.content);
};

export default function BDoksPage() {
  const { selectedProject } = useProject();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("alle");
  const [filterAnforderung, setFilterAnforderung] = useState<string>("alle");

  const projektPath = selectedProject
    ? `${selectedProject}/projekt.json`
    : null;

  const {
    data: projektData,
    error,
    isLoading,
  } = useSWR<ProjektData>(projektPath, fetcher, { revalidateOnFocus: false });

  if (!selectedProject) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Bitte wählen Sie ein Projekt aus.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Lade Bieterdokumente...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Fehler beim Laden: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!projektData?.bdoks?.bieterdokumente) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Keine Bieterdokumente gefunden.
          </p>
        </CardContent>
      </Card>
    );
  }

  const dokumente = projektData.bdoks.bieterdokumente;

  // Filter und Suche
  const filteredDokumente = dokumente.filter((dok) => {
    const matchesSearch =
      dok.bezeichnung.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dok.beschreibung.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dok.beilage_nummer &&
        dok.beilage_nummer.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === "alle" || dok.dokumenttyp === filterType;
    const matchesAnforderung =
      filterAnforderung === "alle" || dok.anforderungstyp === filterAnforderung;

    return matchesSearch && matchesType && matchesAnforderung;
  });

  // Eindeutige Werte für Filter
  const dokumenttypen = [...new Set(dokumente.map((d) => d.dokumenttyp))];
  const anforderungstypen = [
    ...new Set(dokumente.map((d) => d.anforderungstyp)),
  ];

  const getAnforderungsBadge = (typ: string) => {
    switch (typ) {
      case "Pflichtdokument":
        return (
          <Badge variant="destructive" className="text-xs">
            Pflicht
          </Badge>
        );
      case "Bedarfsfall":
        return (
          <Badge variant="secondary" className="text-xs">
            Bedarfsfall
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {typ}
          </Badge>
        );
    }
  };

  const getDokumenttypIcon = (typ: string) => {
    switch (typ) {
      case "Formblatt":
        return <FileCheck className="h-4 w-4 text-blue-500" />;
      case "Nachweis":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Angebot":
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bieterdokumente
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Übersicht aller erforderlichen Dokumente für die Angebotsabgabe
          </p>
        </CardHeader>
      </Card>

      {/* Filter und Suche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Dokumente durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Dokumenttyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Typen</SelectItem>
                {dokumenttypen.map((typ) => (
                  <SelectItem key={typ} value={typ}>
                    {typ}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterAnforderung}
              onValueChange={setFilterAnforderung}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Anforderungstyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Anforderungen</SelectItem>
                {anforderungstypen.map((typ) => (
                  <SelectItem key={typ} value={typ}>
                    {typ}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{dokumente.length}</div>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {
                dokumente.filter((d) => d.anforderungstyp === "Pflichtdokument")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">Pflichtdokumente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {dokumente.filter((d) => d.unterzeichnung_erforderlich).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Unterzeichnung erforderlich
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {dokumente.filter((d) => d.fachliche_pruefung).length}
            </div>
            <p className="text-xs text-muted-foreground">Fachliche Prüfung</p>
          </CardContent>
        </Card>
      </div>

      {/* Dokumententabelle */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Bezeichnung</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Anforderung</TableHead>
                <TableHead>Beilage</TableHead>
                <TableHead className="text-center">Unterzeichnung</TableHead>
                <TableHead className="text-center">Fachprüfung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDokumente.map((dok, index) => (
                <TableRow key={index}>
                  <TableCell>{getDokumenttypIcon(dok.dokumenttyp)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{dok.bezeichnung}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {dok.beschreibung}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {dok.dokumenttyp}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getAnforderungsBadge(dok.anforderungstyp)}
                  </TableCell>
                  <TableCell>
                    {dok.beilage_nummer ? (
                      <Badge variant="secondary" className="text-xs">
                        {dok.beilage_nummer}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {dok.unterzeichnung_erforderlich ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {dok.fachliche_pruefung ? (
                      <AlertCircle className="h-4 w-4 text-orange-500 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredDokumente.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine Dokumente gefunden.</p>
              <p className="text-sm">
                Versuchen Sie andere Suchbegriffe oder Filter.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
