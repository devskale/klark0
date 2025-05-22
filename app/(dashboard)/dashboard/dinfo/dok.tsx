import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import useSWR from "swr";
import { useProject } from "@/context/ProjectContext";
import { normalizePath } from "@/lib/fs/fileTreeUtils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// PDF.js worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface FileSystemSettings {
  type?: string;
  host?: string;
  username?: string;
  password?: string;
}

export default function Dok() {
  const { selectedDok } = useProject();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: fsSettings } = useSWR<FileSystemSettings>(
    "/api/settings?key=fileSystem",
    (url: string) => fetch(url).then((res) => res.json())
  );

  useEffect(() => {
    if (selectedDok && fsSettings) {
      // Construct the URL to fetch the PDF file
      // Ensure the path is not normalized if it's a file, as normalizePath adds a trailing slash
      const pathIsFile = selectedDok.includes("."); // Basic check if it's a file
      const documentPath = pathIsFile
        ? selectedDok
        : normalizePath(selectedDok);

      const params = new URLSearchParams({
        type: fsSettings.type || "webdav",
        path: documentPath,
        host: fsSettings.host || "",
        username: fsSettings.username || "",
        password: fsSettings.password || "",
      });
      setPdfUrl(`/api/fs/read?${params.toString()}`);
      setPageNumber(1); // Reset to first page when document changes
      setError(null);
    } else {
      setPdfUrl(null);
    }
  }, [selectedDok, fsSettings]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    setError(
      `Failed to load PDF: ${error.message}. Check if the file is a valid PDF and the path is correct.`
    );
    setPdfUrl(null); // Clear URL on error to prevent retrying with a bad URL
  }

  const goToPrevPage = () =>
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));

  const goToNextPage = () =>
    setPageNumber((prevPageNumber) =>
      numPages ? Math.min(prevPageNumber + 1, numPages) : prevPageNumber
    );

  if (!selectedDok) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Dokumentenansicht</h2>
        <p>Kein Dokument ausgewählt.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Dokumentenansicht</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Dokumentenansicht</h2>
        <p>Lade Dokument...</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Dokumentenansicht</h2>
      {numPages && (
        <div className="flex items-center space-x-2 mb-4">
          <Button onClick={goToPrevPage} disabled={pageNumber <= 1}>
            <ChevronLeft className="h-4 w-4" />
            Vorherige
          </Button>
          <span>
            Seite {pageNumber} von {numPages}
          </span>
          <Button onClick={goToNextPage} disabled={pageNumber >= numPages}>
            Nächste
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="w-full max-w-4xl border rounded-md overflow-hidden">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading="Lade PDF..."
          error="Fehler beim Laden des PDFs.">
          <Page pageNumber={pageNumber} renderTextLayer={true} />
        </Document>
      </div>
      {numPages && (
        <div className="flex items-center space-x-2 mt-4">
          <Button onClick={goToPrevPage} disabled={pageNumber <= 1}>
            <ChevronLeft className="h-4 w-4" />
            Vorherige
          </Button>
          <span>
            Seite {pageNumber} von {numPages}
          </span>
          <Button onClick={goToNextPage} disabled={pageNumber >= numPages}>
            Nächste
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
