import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import useSWR from "swr";
import { useProject } from "@/context/ProjectContext";
import { normalizePath } from "@/lib/fs/fileTreeUtils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, FileText, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// PDF.js worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// File type detection utilities
const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

const getFileType = (filename: string): 'pdf' | 'image' | 'docx' | 'xlsx' | 'office' | 'unsupported' => {
  const ext = getFileExtension(filename);
  
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
  if (['docx', 'doc'].includes(ext)) return 'docx';
  if (['xlsx', 'xls'].includes(ext)) return 'xlsx';
  if (['pptx', 'ppt'].includes(ext)) return 'office';
  return 'unsupported';
};

// Image preview component
const ImagePreview: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [imageError, setImageError] = useState(false);
  
  if (imageError) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="p-8 text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-red-500">Fehler beim Laden des Bildes</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="p-4">
        <img 
          src={src} 
          alt={alt}
          className="w-full h-auto max-h-[80vh] object-contain"
          onError={() => setImageError(true)}
        />
      </CardContent>
    </Card>
  );
};

// DOCX document preview component
const DocxPreview: React.FC<{ filePath: string; filename: string; downloadUrl: string }> = ({ filePath, filename, downloadUrl }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const convertDocx = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/preview/docx', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filePath }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to convert DOCX file');
        }
        
        setHtmlContent(data.html);
      } catch (err) {
        console.error('Error converting DOCX:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    convertDocx();
  }, [filePath]);
  
  if (loading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="p-8 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-gray-600">Word-Dokument wird konvertiert...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="p-8 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2 text-red-600">Fehler beim Laden</h3>
          <p className="text-gray-600 mb-4">{filename}</p>
          <p className="text-sm text-red-500 mb-6">{error}</p>
          <Button asChild>
            <a href={downloadUrl} download={filename}>
              <Download className="h-4 w-4 mr-2" />
              Dokument herunterladen
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="p-6">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">{filename}</h3>
          <Button asChild size="sm">
            <a href={downloadUrl} download={filename}>
              <Download className="h-4 w-4 mr-2" />
              Herunterladen
            </a>
          </Button>
        </div>
        <div 
          className="max-w-none overflow-auto max-h-[70vh] border rounded p-4 bg-white"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </CardContent>
    </Card>
  );
};

// XLSX document preview component
const XlsxPreview: React.FC<{ filePath: string; filename: string; downloadUrl: string }> = ({ filePath, filename, downloadUrl }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetInfo, setSheetInfo] = useState<{ sheetNames: string[]; sheetCount: number } | null>(null);
  
  useEffect(() => {
    const convertXlsx = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/preview/xlsx', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filePath }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to convert XLSX file');
        }
        
        setHtmlContent(data.html);
        setSheetInfo({
          sheetNames: data.sheetNames,
          sheetCount: data.sheetCount
        });
      } catch (err) {
        console.error('Error converting XLSX:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    convertXlsx();
  }, [filePath]);
  
  if (loading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="p-8 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-green-500 animate-pulse" />
          <p className="text-gray-600">Excel-Tabelle wird konvertiert...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="p-8 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2 text-red-600">Fehler beim Laden</h3>
          <p className="text-gray-600 mb-4">{filename}</p>
          <p className="text-sm text-red-500 mb-6">{error}</p>
          <Button asChild>
            <a href={downloadUrl} download={filename}>
              <Download className="h-4 w-4 mr-2" />
              Tabelle herunterladen
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="p-6">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{filename}</h3>
            {sheetInfo && (
              <p className="text-sm text-gray-600">
                {sheetInfo.sheetCount} Arbeitsblatt{sheetInfo.sheetCount !== 1 ? 'er' : ''}
                {sheetInfo.sheetCount > 1 && `: ${sheetInfo.sheetNames.join(', ')}`}
              </p>
            )}
          </div>
          <Button asChild size="sm">
            <a href={downloadUrl} download={filename}>
              <Download className="h-4 w-4 mr-2" />
              Herunterladen
            </a>
          </Button>
        </div>
        <div 
          className="overflow-auto max-h-[70vh] border rounded bg-white p-4 [&_table]:w-full"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </CardContent>
    </Card>
  );
};

// Office document preview component (for PowerPoint and other unsupported Office formats)
const OfficePreview: React.FC<{ filename: string; downloadUrl: string }> = ({ filename, downloadUrl }) => {
  const ext = getFileExtension(filename);
  const isPowerPoint = ['ppt', 'pptx'].includes(ext);
  
  const getDocumentTypeLabel = () => {
    if (isPowerPoint) return 'PowerPoint-Präsentation';
    return 'Office-Dokument';
  };
  
  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="p-8 text-center">
        <FileText className="h-16 w-16 mx-auto mb-4 text-blue-500" />
        <h3 className="text-lg font-semibold mb-2">{getDocumentTypeLabel()}</h3>
        <p className="text-gray-600 mb-4">{filename}</p>
        <p className="text-sm text-gray-500 mb-6">
          Dieses Office-Dokument kann nicht direkt im Browser angezeigt werden.
        </p>
        <Button asChild>
          <a href={downloadUrl} download={filename}>
            <Download className="h-4 w-4 mr-2" />
            Dokument herunterladen
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

// Unsupported file type component
const UnsupportedPreview: React.FC<{ filename: string; downloadUrl: string }> = ({ filename, downloadUrl }) => {
  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="p-8 text-center">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">Nicht unterstützter Dateityp</h3>
        <p className="text-gray-600 mb-4">{filename}</p>
        <p className="text-sm text-gray-500 mb-6">
          Diese Datei kann nicht in der Vorschau angezeigt werden.
        </p>
        <Button asChild>
          <a href={downloadUrl} download={filename}>
            <Download className="h-4 w-4 mr-2" />
            Datei herunterladen
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

export default function Dok() {
  const { selectedDok } = useProject();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'docx' | 'xlsx' | 'office' | 'unsupported'>('pdf');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDok) {
      // Determine file type and construct appropriate URL
      const pathIsFile = selectedDok.includes("."); // Basic check if it's a file
      const documentPath = pathIsFile
        ? selectedDok
        : normalizePath(selectedDok);

      const params = new URLSearchParams({
        path: documentPath,
      });
      
      const url = `/api/fs/read?${params.toString()}`;
      const detectedFileType = pathIsFile ? getFileType(selectedDok) : 'unsupported';
      
      setFileUrl(url);
      setFileType(detectedFileType);
      setPageNumber(1); // Reset to first page when document changes
      setError(null);
    } else {
      setFileUrl(null);
    }
  }, [selectedDok]);
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading document:", error);
    setError(
      `Fehler beim Laden des Dokuments: ${error.message}. Überprüfen Sie, ob die Datei gültig ist und der Pfad korrekt ist.`
    );
    setFileUrl(null); // Clear URL on error to prevent retrying with a bad URL
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

  if (!fileUrl) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Dokumentenansicht</h2>
        <p>Lade Dokument...</p>
      </div>
    );
  }

  // Render different preview components based on file type
  const renderPreview = () => {
    const filename = selectedDok?.split('/').pop() || 'document';
    
    switch (fileType) {
      case 'image':
        return <ImagePreview src={fileUrl} alt={filename} />;
      
      case 'docx':
        return <DocxPreview filePath={selectedDok} filename={filename} downloadUrl={fileUrl} />;
      
      case 'xlsx':
        return <XlsxPreview filePath={selectedDok} filename={filename} downloadUrl={fileUrl} />;
      
      case 'office':
        return <OfficePreview filename={filename} downloadUrl={fileUrl} />;
      
      case 'unsupported':
        return <UnsupportedPreview filename={filename} downloadUrl={fileUrl} />;
      
      case 'pdf':
      default:
        return (
          <div className="w-full max-w-4xl border rounded-md overflow-hidden">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading="Lade PDF..."
              error="Fehler beim Laden des PDFs.">
              <Page pageNumber={pageNumber} renderTextLayer={true} />
            </Document>
          </div>
        );
    }
  };

  return (
    <div className="p-4 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Dokumentenansicht</h2>
      
      {/* Show pagination controls only for PDFs */}
      {fileType === 'pdf' && numPages && (
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
      
      {/* Render appropriate preview component */}
      {renderPreview()}
      
      {/* Show pagination controls at bottom only for PDFs */}
      {fileType === 'pdf' && numPages && (
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
