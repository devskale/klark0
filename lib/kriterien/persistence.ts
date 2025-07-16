import { KriterienExtraktion } from "@/types/kriterien";

/**
 * Interface für erweiterte Kriterien-Metadaten mit Persistierung-Informationen
 */
export interface KriterienMetadata {
  extractedCriteria: KriterienExtraktion;
  extractionTimestamp: string;
  extractionMethod: string; // z.B. "KRITERIEN_EXTRAKTION", "A_INFO", etc.
  aabFileName?: string;
  parserUsed?: string;
  lastModified: string;
  version: string;
  reviewStatus?: {
    aiReviewed: boolean;
    humanReviewed: boolean;
    lastReviewDate?: string;
    reviewNotes?: string;
  };
}

/**
 * Speichert extrahierte Kriterien als JSON-Sidecar-Datei im Projektverzeichnis
 * @param projectDir - Projektverzeichnis-Pfad
 * @param criteria - Extrahierte Kriterien
 * @param metadata - Zusätzliche Metadaten
 * @returns Promise mit Erfolgs-Status
 */
export async function saveKriterienToFile(
  projectDir: string,
  criteria: KriterienExtraktion,
  metadata: Partial<KriterienMetadata> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const kriterienPath = `${projectDir}kriterien.meta.json`;
    
    const kriterienMetadata: KriterienMetadata = {
      extractedCriteria: criteria,
      extractionTimestamp: new Date().toISOString(),
      extractionMethod: metadata.extractionMethod || "KRITERIEN_EXTRAKTION",
      aabFileName: metadata.aabFileName,
      parserUsed: metadata.parserUsed,
      lastModified: new Date().toISOString(),
      version: "1.0",
      reviewStatus: {
        aiReviewed: true, // AI hat die Kriterien extrahiert
        humanReviewed: false,
        lastReviewDate: new Date().toISOString(),
        ...metadata.reviewStatus
      },
      ...metadata
    };

    const response = await fetch("/api/fs/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: kriterienPath,
        metadata: kriterienMetadata,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return { success: result.success };
  } catch (error) {
    console.error("Error saving criteria to file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler beim Speichern"
    };
  }
}

/**
 * Lädt gespeicherte Kriterien aus JSON-Sidecar-Datei
 * @param projectDir - Projektverzeichnis-Pfad
 * @returns Promise mit geladenen Kriterien oder null
 */
export async function loadKriterienFromFile(
  projectDir: string
): Promise<KriterienMetadata | null> {
  try {
    const kriterienPath = `${projectDir}kriterien.meta.json`;
    const params = new URLSearchParams({ path: kriterienPath });
    
    const response = await fetch(`/api/fs/metadata?${params.toString()}`);
    
    if (!response.ok) {
      // Datei existiert nicht oder anderer Fehler
      return null;
    }

    const data = await response.json();
    return data as KriterienMetadata;
  } catch (error) {
    console.error("Error loading criteria from file:", error);
    return null;
  }
}

/**
 * Aktualisiert den Review-Status von gespeicherten Kriterien
 * @param projectDir - Projektverzeichnis-Pfad
 * @param reviewStatus - Neuer Review-Status
 * @returns Promise mit Erfolgs-Status
 */
export async function updateKriterienReviewStatus(
  projectDir: string,
  reviewStatus: Partial<KriterienMetadata['reviewStatus']>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Lade aktuelle Kriterien
    const currentData = await loadKriterienFromFile(projectDir);
    if (!currentData) {
      return { success: false, error: "Keine gespeicherten Kriterien gefunden" };
    }

    // Aktualisiere Review-Status
    const updatedData: KriterienMetadata = {
      ...currentData,
      lastModified: new Date().toISOString(),
      reviewStatus: {
        ...currentData.reviewStatus,
        ...reviewStatus,
        lastReviewDate: new Date().toISOString()
      }
    };

    // Speichere aktualisierte Daten
    const kriterienPath = `${projectDir}kriterien.meta.json`;
    const response = await fetch("/api/fs/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: kriterienPath,
        metadata: updatedData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return { success: result.success };
  } catch (error) {
    console.error("Error updating criteria review status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler beim Aktualisieren"
    };
  }
}