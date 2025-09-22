/**
 * Kriterien Persistence Layer
 * Handles loading of criteria from projekt.json and saving updates
 */

/**
 * Interface for individual kriterium from projekt.json
 */
export interface ProjektKriterium {
  id: string;
  typ: string;
  kategorie: string;
  name: string;
  anforderung: string;
  schwellenwert: string | null;
  gewichtung_punkte: number | null;
  dokumente: string[];
  geltung_lose: string[];
  pruefung: {
    status: string | null;
    bemerkung: string | null;
    pruefer: string | null;
    datum: string | null;
  };
  quelle: string;
}

/**
 * Interface for the ids section in projekt.json
 */
export interface ProjektIds {
  schema_version: string;
  kriterien: ProjektKriterium[];
}

/**
 * Interface for the complete projekt.json structure
 */
export interface ProjektJson {
  meta: any;
  bdoks: any;
  ids: ProjektIds;
}

/**
 * Loads kriterien from projekt.json via API
 */
export async function loadKriterienFromFile(projectPath: string): Promise<ProjektKriterium[] | null> {
  try {
    const response = await fetch('/api/fs/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: `${projectPath}/projekt.json`
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // File doesn't exist
      }
      throw new Error(`Failed to load projekt.json: ${response.status}`);
    }

    const data = await response.json();
    const projektData: ProjektJson = JSON.parse(data.content);
    
    // Return the kriterien from the ids section
    return projektData.ids?.kriterien || null;
  } catch (error) {
    console.error('Error loading kriterien from projekt.json:', error);
    return null;
  }
}

/**
 * Updates a specific kriterium's pruefung status in projekt.json
 */
export async function updateKriteriumPruefung(
  projectPath: string,
  kriteriumId: string,
  pruefung: ProjektKriterium['pruefung']
): Promise<void> {
  try {
    // First, load the current projekt.json
    const response = await fetch('/api/fs/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: `${projectPath}/projekt.json`
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to load projekt.json: ${response.status}`);
    }

    const data = await response.json();
    const projektData: ProjektJson = JSON.parse(data.content);
    
    // Find and update the specific kriterium
    const kriterium = projektData.ids.kriterien.find(k => k.id === kriteriumId);
    if (!kriterium) {
      throw new Error(`Kriterium with ID ${kriteriumId} not found`);
    }

    kriterium.pruefung = {
      ...kriterium.pruefung,
      ...pruefung,
      datum: new Date().toISOString()
    };

    // Save the updated projekt.json
    const saveResponse = await fetch('/api/fs/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: `${projectPath}/projekt.json`,
        content: JSON.stringify(projektData, null, 2)
      }),
    });

    if (!saveResponse.ok) {
      throw new Error(`Failed to save projekt.json: ${saveResponse.status}`);
    }
  } catch (error) {
    console.error('Error updating kriterium pruefung:', error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility - now returns null
 * @deprecated Use loadKriterienFromFile instead
 */
export async function saveKriterienToFile(): Promise<void> {
  console.warn('saveKriterienToFile is deprecated. Kriterien are now managed in projekt.json');
  throw new Error('Kriterien saving is now handled through projekt.json updates');
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Use ProjektKriterium instead
 */
export interface KriterienMetadata {
  extractedCriteria: any;
  extractionTimestamp: string;
  aabFileName?: string;
  extractionMethod: 'ai' | 'manual';
  reviewStatus?: {
    aiReviewed: boolean;
    humanReviewed: boolean;
    lastModified: string;
    notes?: string;
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use updateKriteriumPruefung instead
 */
export async function updateKriterienReviewStatus(
  projectDir: string,
  reviewStatus: Partial<KriterienMetadata['reviewStatus']>
): Promise<{ success: boolean; error?: string }> {
  console.warn('updateKriterienReviewStatus is deprecated. Use updateKriteriumPruefung instead');
  return { success: false, error: 'Function is deprecated' };
}