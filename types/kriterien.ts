/**
 * Type definitions for Kriterien (Criteria) system
 * Updated to work with projekt.json structure
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
 * Validates if an object matches the ProjektKriterium interface
 */
export function validateProjektKriterium(obj: any): obj is ProjektKriterium {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check required string fields
  const requiredStringFields = ['id', 'typ', 'kategorie', 'name', 'anforderung', 'quelle'];
  for (const field of requiredStringFields) {
    if (!obj[field] || typeof obj[field] !== 'string') {
      return false;
    }
  }

  // Check nullable fields
  if (obj.schwellenwert !== null && typeof obj.schwellenwert !== 'string') {
    return false;
  }

  if (obj.gewichtung_punkte !== null && typeof obj.gewichtung_punkte !== 'number') {
    return false;
  }

  // Check array fields
  if (!Array.isArray(obj.dokumente) || !Array.isArray(obj.geltung_lose)) {
    return false;
  }

  // Check pruefung object
  if (!obj.pruefung || typeof obj.pruefung !== 'object') {
    return false;
  }

  const pruefungFields = ['status', 'bemerkung', 'pruefer', 'datum'];
  for (const field of pruefungFields) {
    if (obj.pruefung[field] !== null && typeof obj.pruefung[field] !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Validates if an array contains valid ProjektKriterium objects
 */
export function validateKriterienArray(arr: any): arr is ProjektKriterium[] {
  if (!Array.isArray(arr)) {
    return false;
  }

  return arr.every(item => validateProjektKriterium(item));
}

/**
 * Groups kriterien by category
 */
export function groupKriterienByCategory(kriterien: ProjektKriterium[]): Record<string, ProjektKriterium[]> {
  return kriterien.reduce((groups, kriterium) => {
    const category = kriterium.kategorie;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(kriterium);
    return groups;
  }, {} as Record<string, ProjektKriterium[]>);
}

/**
 * Groups kriterien by type
 */
export function groupKriterienByType(kriterien: ProjektKriterium[]): Record<string, ProjektKriterium[]> {
  return kriterien.reduce((groups, kriterium) => {
    const type = kriterium.typ;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(kriterium);
    return groups;
  }, {} as Record<string, ProjektKriterium[]>);
}

/**
 * Filters kriterien by los (lot)
 */
export function filterKriterienByLos(kriterien: ProjektKriterium[], losNummer: string): ProjektKriterium[] {
  return kriterien.filter(kriterium => 
    kriterium.geltung_lose.includes('alle') || 
    kriterium.geltung_lose.includes(losNummer)
  );
}

// Legacy types for backward compatibility
/**
 * @deprecated Use ProjektKriterium instead
 */
export interface KriteriumNachweis {
  typ: 'PFLICHT' | 'OPTIONAL' | 'BEDARFSFALL';
  dokument: string;
  gueltigkeit?: string;
  hinweis?: string;
}

/**
 * @deprecated Use ProjektKriterium instead
 */
export interface KriteriumObjekt {
  kriterium: string;
  nachweise: KriteriumNachweis[];
}

/**
 * @deprecated Use groupKriterienByCategory instead
 */
export interface EignungsKriterien {
  [category: string]: KriteriumObjekt[];
}

/**
 * @deprecated Use ProjektKriterium instead
 */
export interface ZuschlagsKriterium {
  kriterium: string;
  gewichtung: number;
  bewertungsart: string;
  hinweis?: string;
}

/**
 * @deprecated Use ProjektKriterium instead
 */
export interface Los {
  nummer: string;
  bezeichnung: string;
  zuschlagskriterien: ZuschlagsKriterium[];
}

/**
 * @deprecated Use groupKriterienByType instead
 */
export interface ZuschlagsKriterienLos {
  [losNummer: string]: Los;
}

/**
 * @deprecated Use ProjektKriterium[] instead
 */
export interface KriterienExtraktion {
  eignungskriterien: EignungsKriterien;
  zuschlagskriterien: ZuschlagsKriterienLos;
}

/**
 * @deprecated Use validateKriterienArray instead
 */
export function validateKriterienExtraktion(obj: any): obj is KriterienExtraktion {
  console.warn('validateKriterienExtraktion is deprecated. Use validateKriterienArray instead');
  return false;
}