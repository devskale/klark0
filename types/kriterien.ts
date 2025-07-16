/**
 * TypeScript interfaces for Kriterien-Extraktion JSON schema
 */

export interface KriteriumNachweis {
  dokument: string;
  typ: 'PFLICHT' | 'ODER';
  gueltigkeit?: string;
  hinweis?: string;
}

export interface KriteriumObjekt {
  kriterium: string;
  nachweise: KriteriumNachweis[];
}

export interface EignungsKriterien {
  befugnis: KriteriumObjekt[];
  berufliche_zuverlaessigkeit: KriteriumObjekt[];
  technische_leistungsfaehigkeit: KriteriumObjekt[];
  finanzielle_und_wirtschaftliche_leistungsfaehigkeit: KriteriumObjekt[];
}

export interface ZuschlagsKriterium {
  name: string;
  gewichtung: string;
  unterkriterien?: ZuschlagsKriterium[];
}

export interface Los {
  nummer: string | null;
  bezeichnung: string;
}

export interface ZuschlagsKriterienLos {
  los: Los;
  prinzip: 'Bestbieterprinzip' | 'Billigstbieterprinzip';
  kriterien: ZuschlagsKriterium[];
}

export interface KriterienExtraktion {
  eignungskriterien: EignungsKriterien;
  zuschlagskriterien: ZuschlagsKriterienLos[];
  subunternehmerregelung: string[];
  formale_anforderungen: string[];
}

/**
 * Validation function for KriterienExtraktion
 */
export function validateKriterienExtraktion(data: any): data is KriterienExtraktion {
  if (!data || typeof data !== 'object') return false;
  
  // Check main keys
  const requiredKeys = ['eignungskriterien', 'zuschlagskriterien', 'subunternehmerregelung', 'formale_anforderungen'];
  if (!requiredKeys.every(key => key in data)) return false;
  
  // Validate eignungskriterien
  const eignungsKeys = ['befugnis', 'berufliche_zuverlaessigkeit', 'technische_leistungsfaehigkeit', 'finanzielle_und_wirtschaftliche_leistungsfaehigkeit'];
  if (!eignungsKeys.every(key => Array.isArray(data.eignungskriterien[key]))) return false;
  
  // Validate zuschlagskriterien is array
  if (!Array.isArray(data.zuschlagskriterien)) return false;
  
  // Validate subunternehmerregelung is array of strings
  if (!Array.isArray(data.subunternehmerregelung) || !data.subunternehmerregelung.every((item: any) => typeof item === 'string')) return false;
  
  // Validate formale_anforderungen is array of strings
  if (!Array.isArray(data.formale_anforderungen) || !data.formale_anforderungen.every((item: any) => typeof item === 'string')) return false;
  
  return true;
}