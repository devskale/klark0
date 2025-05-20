
/**
 * Predefined queries for the Gemini AI API
 */
export const AI_QUERIES = {
  SUMMARIZE:
    "Analysieren Sie den folgenden Text und fassen Sie ihn prägnant auf Deutsch zusammen:",
  EXTRACT_KEY_POINTS:
    "Identifizieren und listen Sie 3–5 Kernpunkte aus dem folgenden Text auf Deutsch auf:",
  COMPREHENSIVE:
    "Geben Sie eine umfassende Analyse des folgenden Dokuments einschließlich Zusammenfassung, Kernpunkten, Dokumenttyp und Metadaten auf Deutsch an:",
  DOKUMENTTYP: `### Prompt:

Du bist ein professioneller Dokumenten-Analyst für Vergabeverfahren und öffentliche Ausschreibungen.  

Deine Aufgabe:  
Analysiere den Inhalt des folgenden Dokuments und bestimme präzise:  

1. Zu welcher Hauptkategorie das Dokument gehört (aus einer vorgegebenen Liste).  
2. Falls möglich: Bestimme zusätzlich den genaueren Dokumententyp (Subkategorie).  
3. Begründe kurz deine Entscheidung anhand von Begriffen, Inhalt oder typischen Merkmalen des Dokuments.  

Gib dein Ergebnis ausschließlich im folgenden JSON-Format aus:

{
  "Kategorie": "EXAKTE Auswahl aus: Angebot | Eignungsnachweise | Nachweis Leistungsfähigkeit | Berufliche Zuverlässigkeit | Befugnisse | Nachweis Bewertung Zuschlagskriterien pro Los | Weitere Prüfungen",
  "Dokumententyp": "Kurzbeschreibung oder genaue Typbezeichnung — oder 'Unklar', falls nicht erkennbar",
  "Begründung": "Kurze Begründung für die Klassifizierung (z.B. enthaltene Begriffe, typische Merkmale, Aussagen im Text)"
}

---

### Mögliche Kategorien und Hinweise:

| Kategorie | Typische Dokumente / Inhalte / Begriffe |
|-----------|-----------------------------------------|
| Angebot | Angebotsschreiben, Preisblatt, Produktdatenblätter, Datenblätter, Sicherheitsdatenblätter, technische Beschreibungen, Einbauskizzen, Zertifikate zu Produkten |
| Eignungsnachweise | Firmenbuch, ANKÖ, WK-Auszug, Strafregister, Steuerkonto, SV-Nachweis, Eigenerklärungen |
| Nachweis Leistungsfähigkeit | Versicherungen (Betriebshaftpflicht, Produkthaftpflicht), Umsatzzahlen, Referenzen, Fuhrpark, Personalnachweis |
| Berufliche Zuverlässigkeit | Strafregister, Insolvenz, Sozialabgaben, frühere Mängel, falsche Angaben, unlauteres Verhalten |
| Befugnisse | Gewerbeberechtigung, gesetzliche Befugnisse, EU-Formblätter |
| Nachweis Bewertung Zuschlagskriterien pro Los | Losnummer, ISO-Zertifikate, Umweltzertifikate, Standorte, Produktionsstandort, Gewährleistung, Preisblätter je Los |
| Weitere Prüfungen | Preisangemessenheitsprüfung, technische Prüfungen, Zusammenfassungen, Prüfberichte |

---

### Input:
→ Füge hier einfach den reinen Dokumenteninhalt (Textauszug, OCR, etc.) ein.

---

### Output-Beispiel:

{
  "Kategorie": "Nachweis Leistungsfähigkeit",
  "Dokumententyp": "Produkthaftpflichtversicherung",
  "Begründung": "Enthält explizit Versicherungsnachweis Produkthaftpflicht inkl. Prämienzahlung — typisch für Nachweis Leistungsfähigkeit."
}`,
};
