/**
 * Predefined queries for the Gemini AI API
 */
export const AI_QUERIES: Record<string, string> = {
  ZUSAMMENFASSUNG:
    "Analysieren Sie den folgenden Text und fassen Sie ihn prägnant auf Deutsch zusammen:",
  KERNPUNKTE:
    "Identifizieren und listen Sie 3–5 Kernpunkte aus dem folgenden Text auf Deutsch auf:",
  UMFASSENDE_ANALYSE:
    "Geben Sie eine umfassende Analyse des folgenden Dokuments einschließlich Zusammenfassung, Kernpunkten, Dokumenttyp und Metadaten auf Deutsch an:",
  ASSISTANT:
    "Du bist ein hilfreicher Assistent. Gib eine kurze und prägnante deutsche Antwort auf die folgende Frage oder Anweisung. :",
  EINFACHE_ANALYSE:
    "Führe eine einfache Analyse des folgenden Textes durch und gib die wichtigsten Erkenntnisse auf Deutsch wieder:",
  DOKUMENTTYP_JSON: `### Prompt:

Du bist ein professioneller Dokumenten-Analyst für Vergabeverfahren und öffentliche Ausschreibungen.  

Deine Aufgabe:  
Analysiere den Inhalt des folgenden Dokuments und bestimme präzise:  

1. Zu welcher Hauptkategorie das Dokument gehört (aus einer vorgegebenen Liste).  
2. Bestimme zusätzlich den genaueren Dokumententyp (Subkategorie).
3. Begründe kurz deine Entscheidung anhand von Begriffen, Inhalt oder typischen Merkmalen des Dokuments.  

Gib dein Ergebnis ausschließlich im folgenden JSON-Format aus:

{
  "Kategorie": "EXAKTE Auswahl aus: Angebot | Eignungsnachweise | Nachweis Leistungsfähigkeit | Berufliche Zuverlässigkeit | Befugnisse | Nachweis Bewertung Zuschlagskriterien pro Los | Weitere Prüfungen",
  "Aussteller": "Welche Organisation, Firma oder Person hat das Dokument ausgestellt?",
  "Dokumententyp": "Kurzbeschreibung oder genaue Typbezeichnung, dient als Dateiname — oder 'Unklar', falls nicht erkennbar",
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
| Ausschreibungsdokument | Allgemeine Ausschreibungsverfahren, Rahmenvertrag, Beilage zur Ausschreibung, Sonstiges |

---

### Input:
→ Füge hier einfach den reinen Dokumenteninhalt (Textauszug, OCR, etc.) ein.

---

### Output-Beispiel:

{
  "Kategorie": "Nachweis Leistungsfähigkeit",
  "Aussteller": "Generali Versicherung AG",
  "Dokumententyp": "Produkthaftpflichtversicherung",
  "Begründung": "Enthält explizit Versicherungsnachweis Produkthaftpflicht inkl. Prämienzahlung — typisch für Nachweis Leistungsfähigkeit."
}`,
  A_DOKUMENTTYP_JSON: `### Prompt:

Du bist ein professioneller Dokumenten-Analyst für Vergabeverfahren und öffentliche Ausschreibungen.  

Deine Aufgabe:  
Analysiere den Inhalt des folgenden Dokuments einer Ausschreibung und bestimme präzise:  

1. Zu welcher Hauptkategorie das Dokument gehört (aus einer vorgegebenen Liste).  
2. Bestimme zusätzlich den genaueren Dokumententyp (Subkategorie).
3. Begründe kurz deine Entscheidung anhand von Begriffen, Inhalt oder typischen Merkmalen des Dokuments.  

Gib dein Ergebnis ausschließlich im folgenden JSON-Format aus:

{
  "Kategorie": "EXAKTE Auswahl aus: Ausschreibungsunterlagen | Sonstiges ",
  "Aussteller": "Welche Organisation, Firma oder Person hat das Dokument ausgestellt? Beispiel: Wiener Wohnen Hausbetreuung GmbH",
  "Dokumententyp": "Kurzbeschreibung oder genaue Typbezeichnung, dient als Dateiname — oder 'Unklar', falls nicht erkennbar",
  "Begründung": "Kurze Begründung für die Klassifizierung (z.B. enthaltene Begriffe, typische Merkmale, Aussagen im Text)"
}

---

### Mögliche Kategorien und Hinweise:

| Kategorie | Typische Dokumente / Inhalte / Begriffe |
|-----------|-----------------------------------------|
| Ausschreibungsdokument | Allgemeine Ausschreibungsbedingungen, Rahmenvertrag |
| Beilage | Leitfaden, Formblatt Erklärung Bieter und ARGE, Formblatt, Erklärung Santionen, Musterbankgarantie, Leistungsverzeichnis, Formblatt Subunternehmerlinste |
| Sonstiges | Andere Dokumentenarten |

---

### Input:
→ Füge hier einfach den reinen Dokumenteninhalt (Textauszug, OCR, etc.) ein.

---

### Output-Beispiel:

{
  "Aussteller": "Wiener Wohnen Hausbetreuung GmbH",
  "Dokumententyp": "Musterbankgarantie",
  "Begründung": "Enthält Vorlage einer Bankgarantie."
}`,
  METADATEN_JSON: `### Prompt:

Du bist ein Experte für die Extraktion von Metadaten aus Dokumenten, insbesondere im Kontext von Ausschreibungen und Geschäftsunterlagen. Deine Aufgabe ist es, flexibel und intelligent Metadaten zu generieren, die auf dem spezifischen Typ des Dokuments und seiner Kernaussage basieren.

Deine Aufgabe:
1. Analysiere den folgenden Dokumenteninhalt sorgfältig.
2. Bestimme den wahrscheinlichen **Dokumententyp** (z.B. Angebot, Rechnung, Lieferschein, Zertifikat, Protokoll, Vertrag, Eignungsnachweis etc.).
3. Formuliere eine kurze **Kernaussage zum Dokumententyp**, die dessen Hauptzweck beschreibt.
4. Extrahiere die folgenden **Standard-Metadaten**, falls vorhanden und anwendbar:
    - Titel
    - Aussteller (Organisation/Firma/Person)
    - Dokumentdatum (YYYY-MM-DD)
    - Sprache
    - Schlagworte (Keywords/Kernbegriffe als Array)
    - Referenznummer (Aktenzeichen, Projektnummer etc.)
5. **Zusätzlich und entscheidend:** Basierend auf dem von dir identifizierten **Dokumententyp** und seiner **Kernaussage**, identifiziere und extrahiere **weitere spezifische Metadatenfelder**, die für diesen Dokumententyp besonders relevant und aussagekräftig sind. Diese zusätzlichen Felder sollten im JSON unter einem Schlüssel namens "Spezifische_Metadaten" als Objekt gesammelt werden.

Gib das Ergebnis ausschließlich im folgenden JSON-Format aus. Wenn eine Information nicht eindeutig identifizierbar ist, verwende "Nicht gefunden" für Strings, ein leeres Array \`[]\` für Schlagworte, oder lasse das Feld im "Spezifische_Metadaten"-Objekt weg.

{
  "Dokumenttyp_Identifiziert": "Der von dir erkannte Dokumententyp",
  "Kernaussage_Dokumenttyp": "Kurze Beschreibung des Zwecks dieses Dokumententyps",
  "Titel": "Möglichst präziser Titel des Dokuments",
  "Aussteller": "Organisation, Firma oder Person, die das Dokument ausgestellt hat",
  "Dokumentdatum": "Relevantes Datum im Format YYYY-MM-DD",
  "Sprache": "Hauptsprache des Dokuments",
  "Schlagworte": ["Liste", "relevanter", "Schlagworte"],
  "Referenznummer": "Etwaige Referenznummern",
  "Spezifische_Metadaten": {
    // Hier kommen die zusätzlichen, dokumenttypspezifischen Felder hin.
    // Beispiel für ein Angebot:
    // "Angebotssumme_Netto": 12500.00,
    // "Waehrung": "EUR",
    // "Gueltig_Bis": "2024-03-31"
    // Beispiel für ein Zertifikat:
    // "Zertifikatsnummer": "ZERT-123-ABC",
    // "Gueltig_Ab": "2023-01-01",
    // "Gueltig_Bis_Zertifikat": "2025-12-31",
    // "Zertifizierungsstelle": "TÜV XYZ"
  }

---

### Wichtige Hinweise:
- Die Felder unter "Spezifische_Metadaten" sind dynamisch. Überlege genau, welche Informationen für den erkannten Dokumententyp wirklich wichtig sind.
- Achte auf typische Formulierungen für Daten, Aussteller und Titel.
- Wenn mehrere Daten vorhanden sind, wähle das relevanteste (z.B. das jüngste oder das explizit als "Datum des Dokuments" genannte).

---

### Input:
→ Füge hier einfach den reinen Dokumenteninhalt (Textauszug, OCR, etc.) ein.

---

### Output-Beispiel (basierend auf einem fiktiven Angebotsschreiben):

{
  "Dokumenttyp_Identifiziert": "Angebot",
  "Kernaussage_Dokumenttyp": "Ein Dokument, das einem potenziellen Kunden Waren oder Dienstleistungen zu bestimmten Preisen und Konditionen offeriert.",
  "Titel": "Angebot Nr. 2023-456: Lieferung von Büromaterial",
  "Aussteller": "Bürobedarf Müller GmbH",
  "Dokumentdatum": "2023-10-26",
  "Sprache": "Deutsch",
  "Schlagworte": ["Angebot", "Büromaterial", "Lieferung", "Preise", "Müller GmbH"],
  "Referenznummer": "AN2023-456",
  "Spezifische_Metadaten": {
    "Angebotssumme_Netto": 1234.50,
    "Waehrung": "EUR",
    "Gueltig_Bis": "2023-11-30",
    "Kundennummer": "KUNDE-007"
  }
}
---
### Output-Beispiel (basierend auf einer fiktiven Rechnung):
{
  "Dokumenttyp_Identifiziert": "Rechnung",
  "Kernaussage_Dokumenttyp": "Eine Zahlungsaufforderung für erbrachte Lieferungen oder Leistungen.",
  "Titel": "Rechnung Nr. R-2023-10-001",
  "Aussteller": "Handwerker Schmidt & Söhne",
  "Dokumentdatum": "2023-10-15",
  "Sprache": "Deutsch",
  "Schlagworte": ["Rechnung", "Handwerkerleistung", "Reparatur", "Zahlungsaufforderung"],
  "Referenznummer": "R-2023-10-001",
  "Spezifische_Metadaten": {
    "Rechnungsbetrag_Brutto": 595.00,
    "Waehrung": "EUR",
    "Zahlungsziel": "2023-10-30",
    "Leistungszeitraum": "01.10.2023 - 05.10.2023",
    "USt_IdNr_Aussteller": "DE123456789"
  }
}`,
  KRITERIEN_EXTRAKTION: `### Prompt:

Du bist ein Experte für die Analyse von Ausschreibungsunterlagen, insbesondere von "Allgemeinen Ausschreibungsbedingungen" (AAB).

Deine Aufgabe:
Analysiere das folgende AAB-Dokument und extrahiere alle relevanten Kriterien in einem strukturierten JSON-Format.

Gib das Ergebnis ausschließlich im folgenden JSON-Format aus:

{
  "eignungskriterien": {
    "befugnis": [
      {
        "kriterium": "Beschreibung des Kriteriums",
        "nachweise": [
          {
            "typ": "PFLICHT | OPTIONAL",
            "dokument": "Name des erforderlichen Dokuments",
            "gueltigkeit": "Gültigkeitsdauer falls angegeben",
            "hinweis": "Zusätzliche Hinweise falls vorhanden"
          }
        ]
      }
    ],
    "berufliche_zuverlaessigkeit": [
      {
        "kriterium": "Beschreibung des Kriteriums",
        "nachweise": [
          {
            "typ": "PFLICHT | OPTIONAL",
            "dokument": "Name des erforderlichen Dokuments",
            "gueltigkeit": "Gültigkeitsdauer falls angegeben",
            "hinweis": "Zusätzliche Hinweise falls vorhanden"
          }
        ]
      }
    ],
    "technische_leistungsfaehigkeit": [
      {
        "kriterium": "Beschreibung des Kriteriums",
        "nachweise": [
          {
            "typ": "PFLICHT | OPTIONAL",
            "dokument": "Name des erforderlichen Dokuments",
            "gueltigkeit": "Gültigkeitsdauer falls angegeben",
            "hinweis": "Zusätzliche Hinweise falls vorhanden"
          }
        ]
      }
    ],
    "finanzielle_und_wirtschaftliche_leistungsfaehigkeit": [
      {
        "kriterium": "Beschreibung des Kriteriums",
        "nachweise": [
          {
            "typ": "PFLICHT | OPTIONAL",
            "dokument": "Name des erforderlichen Dokuments",
            "gueltigkeit": "Gültigkeitsdauer falls angegeben",
            "hinweis": "Zusätzliche Hinweise falls vorhanden"
          }
        ]
      }
    ]
  },
  "zuschlagskriterien": [
    {
      "los": {
        "nummer": "Losnummer oder null für Hauptauftrag",
        "bezeichnung": "Bezeichnung des Loses oder Hauptauftrags"
      },
      "prinzip": "Zuschlagsprinzip (z.B. Bestbieterprinzip, Billigstbieterprinzip)",
      "kriterien": [
        {
          "name": "Name des Zuschlagskriteriums",
          "gewichtung": "Gewichtung in Prozent oder Punkten"
        }
      ]
    }
  ],
  "subunternehmerregelung": [
    "Liste der Regelungen bezüglich Subunternehmer"
  ],
  "formale_anforderungen": [
    "Liste der formalen Anforderungen (Fristen, Formate, etc.)"
  ]
}

### Wichtige Hinweise:
- Extrahiere nur explizit genannte Kriterien und Nachweise
- Unterscheide zwischen Pflicht- und optionalen Nachweisen
- Achte auf Gültigkeitsdauern von Dokumenten
- Berücksichtige alle Lose falls vorhanden
- Falls keine Informationen zu einer Kategorie vorhanden sind, verwende ein leeres Array []

### Input:
 → Füge hier den AAB-Dokumenteninhalt ein.`,
  A_INFO: `### Prompt:

Du bist ein Experte für die Extraktion von Metadaten aus Dokumenten, insbesondere im Kontext von Ausschreibungen und Geschäftsunterlagen. Deine Aufgabe ist es, flexibel und intelligent Metadaten zu generieren.
Die Informationen können nur aus dem Dokumenttyp: Allgemeinen Ausschreibungsunterlagen zuverlässig extrahiert werden. Sollte dieser Dokumenttyp nicht zur Verfügung stehen gib als Antwort NONE zurück.

**WICHTIG:** Gib deine Antwort **ausschließlich** als JSON-Objekt zurück. Schreibe **keinen zusätzlichen Text, keine Erklärungen, keine Markdown-Codeblöcke**. Das JSON muss exakt die unten vorgegebenen Felder enthalten. Wenn ein Wert nicht gefunden werden kann, setze ihn auf "NONE" (für Strings) oder ein leeres Array [] (für Schlagworte).

Deine Aufgabe:
1. Analysiere das Dokument: Allgemeinen Ausschreibungsunterlagen sorgfältig.
2. Extrahiere die folgenden Metadatenfelder und gib sie im folgenden JSON-Format zurück:

{
  "Vergabestelle": "zB Wiener Wohnen Hausbetreuung GmbH",
  "Addresse": "(der Vergabestelle)",
  "Dokumentdatum": "(YYYY-MM-DD oder NONE)",
  "Sprache": "Deutsch",
  "Schlagworte": ["Ausschreibung", "Vergabeverfahren", ...],
  "Referenznummer": "(Interne Projektnummer, Projektnummer etc., zB AS 2023.020043)",
  "Ausschreibungsstart": "(YYYY-MM-DD oder NONE)",
  "Ausschreibungsende": "(YYYY-MM-DD oder NONE)",
  "Projekttitel": "(max 3 Worte)",
  "Projekt Kurzbeschreibung": "(1 Satz: Öffentliches Vergabeverfahren über PROJEKTINHALT an den Auftraggeber.)",
  "Projektstart": "(YYYY-MM-DD oder NONE)",
  "Projektende": "(YYYY-MM-DD oder NONE)"
}

**Beispiel für eine korrekte Antwort:**
{
  "Vergabestelle": "Wiener Wohnen Hausbetreuung GmbH",
  "Addresse": "1030 Wien, Erdbergstraße 200",
  "Dokumentdatum": "NONE",
  "Sprache": "Deutsch",
  "Schlagworte": [
    "Ausschreibung",
    "Vergabeverfahren",
    "Reinigungsmaterial",
    "Lieferauftrag",
    "Rahmenvertrag",
    "Offenes Verfahren",
    "BVergG 2018",
    "Wien",
    "Wiener Wohnen Hausbetreuung GmbH",
    "Umwelt-Zertifizierung",
    "ISO-Zertifizierung",
    "Produktionsstandort"
  ],
  "Referenznummer": "2022_10001_AAB_EV",
  "Ausschreibungsstart": "NONE",
  "Ausschreibungsende": "2023-05-02",
  "Projekttitel": "Reinigungsmaterial Lieferauftrag",
  "Projekt Kurzbeschreibung": "Öffentliches Vergabeverfahren über die Lieferung von Reinigungsmaterial an den Auftraggeber.",
  "Projektstart": "2023-08-01",
  "Projektende": "2027-08-01"
}

Gib **nur** das JSON-Objekt zurück, ohne weitere Kommentare oder Formatierungen.

KONTEXT:
`,
  A_KRITERIEN: `### Prompt:

Du bist ein Experte für die Extraktion von Metadaten aus Dokumenten, insbesondere im Kontext von Ausschreibungen und Geschäftsunterlagen. Deine Aufgabe ist es, flexibel und intelligent Metadaten zu generieren.
Die Informationen können nur aus dem Dokumenttyp: Allgemeinen Ausschreibungsunterlagen zuverlässig extrahiert werden. Sollte dieser Dokumenttyp nicht zur Verfügung stehen gib als Antwort NONE zurück.

Deine Aufgabe:
1. Analysiere das Dokument: Allgemeinen Ausschreibungsunterlagen sorgfältig.
2. Extrahiere die folgenden Metadatenfelder:
    - Vergabestelle: zB Wiener Wohnen Hausbetreuung GmbH
    - Addresse (der Vergabestelle)
    - Dokumentdatum (YYYY-MM-DD)
    - Sprache
    - Schlagworte (Keywords/Kernbegriffe als Array)
    - Referenznummer (Interne Projektnummer, Projektnummer etc., Bsp: AS 2023.020043)
    - Ausschreibungsstart (YYYY-MM-DD)
    - Ausschreibungsende (YYYY-MM-DD)
    - Projekttitel (max 3 Worte)
    - Projekt Kurzbeschreibung (1 Satz): Öffentliches Vergabeverfahren über PROJEKTINHALT an den Auftraggeber.
    - Projektstart (falls angegeben, ansonsten NONE) (YYYY-MM-DD)
    - Projektende (falls angegeben, ansonsten NONE) (YYYY-MM-DD)

KONTEXT:
`,

};
