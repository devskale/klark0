# Produktanforderungsdokument (PRD) für kontext.one

## ZIEL & ANFORDERUNGEN

kontext.one ist eine Webapplikation für die digitale Prüfung von Ausschreibungsdokumenten. Die Anwendung unterstützt den gesamten Lebenszyklus eines Ausschreibungsprojekts mit Fokus auf Transparenz, Effizienz und Automatisierung.

Anforderungen:
- Digitale Prüfung von Ausschreibungsdokumenten
- Unterstützung des gesamten Projekt-Lebenszyklus
- Transparenz, Effizienz und Automatisierung

## IDEENFINDUNG

- **Technologie-Stack**: Next.js für serverseitiges Rendering und API-Routen, Drizzle ORM für typsichere Datenbankinteraktionen, shadcn/ui für ein modernes und anpassbares UI, Stripe für Zahlungsabwicklung.
- **Architektur**: Modulare Architektur mit Trennung von Anliegen (API, UI, Lib). Klare API-Struktur für Frontend-Backend-Kommunikation.
- **KI-Integration**: Nutzung von Modellen wie Gemini und offenen Inferenz-Endpunkten (uniinfer) für Dokumentenanalyse, Kriterienextraktion und Anonymisierung.
- **Filesystem**: Abstraktion des Dateisystems, um lokale und entfernte Speicher (via WebDAV) nahtlos zu unterstützen.

## ENTWICKLUNGSPLAN / STATUS

- [x] **Grund-Setup**
  - [x] Next.js Projekt initialisieren
  - [x] TypeScript Konfiguration
  - [x] Drizzle ORM mit PostgreSQL verbinden
  - [x] shadcn/ui und Tailwind CSS integrieren

- [x] **Authentifizierung & Benutzerverwaltung**
  - [x] JWT-basierte Authentifizierung mit Session-Cookies
  - [x] Middleware zum Schutz von Routen
  - [x] Anmelde- und Registrierungsseiten

- [x] **Kernfunktionen**
  - [x] **Projektmanagement**: Erstellen und Verwalten von Ausschreibungsprojekten.
  - [x] **Dokumenten-Upload**: Hochladen von Ausschreibungs- und Bieterdokumenten.
  - [x] **Dateisystem-Integration**: Anbindung an WebDAV für Remote-Dateizugriff.
  - [x] **Dokumentenkonvertierung**: Serverseitige Umwandlung von DOC/PDF in Markdown.
  - [ ] **Anonymisierung**: Schutz sensibler Daten durch KI-basierte NER.

- [ ] **Erweiterte Funktionen (unsortiert)**
  - [ ] Prompt Templating mit Platzhaltern und Kontexten

- [ ] **KI-Funktionen**
  - [x] **Metadaten-Extraktion**: Automatische Extraktion von Metadaten aus Dokumenten.
  - [x] **Kriterien-Extraktion**: Extraktion von Bewertungskriterien aus Ausschreibungen.
  - [x] **Kontextlängen-Management**: Konfigurierbare maximale Kontextlängen für verschiedene AI-Analysen
    - [x] API-Endpunkt erweitert um `maxContextLength` Parameter für dynamische Kontextbegrenzung
    - [x] Dokumentenanalyse (dinfo): 10.000 Zeichen Limit für fokussierte Dokumenttyp-Erkennung
    - [x] Projektanalyse (ainfo): 500.000 Zeichen Limit für umfassende Projektmetadaten-Extraktion
    - [x] Automatische Kontextkürzung mit Logging für Transparenz bei Überschreitungen
    - [x] **Dokumenttyp-spezifische Prompts**: Intelligente Prompt-Auswahl basierend auf Dokumentkontext
      - [x] Bieterdokumente: Verwendung von DOKUMENTTYP_JSON Prompt für Angebots- und Eignungsnachweis-Analyse
      - [x] Ausschreibungsdokumente: Verwendung von A_DOKUMENTTYP_JSON Prompt für Ausschreibungsunterlagen-Analyse
      - [x] Automatische Erkennung über selectedBieter Variable (gesetzt = Bieterdokument, nicht gesetzt = Ausschreibungsdokument)
      - [x] Dynamische queryType-Bestimmung für korrekte API-Endpunkt-Verarbeitung
    - [x] **Prompt Integration**: KRITERIEN_EXTRAKTION Query zu AI_QUERIES in config.ts hinzufügen
      - [x] Prompt aus kriterien_AAB_extrakt.md in AI-Konfiguration integrieren
      - [x] JSON-Schema Validierung für 4 Hauptkategorien implementieren (TypeScript interfaces in types/kriterien.ts)
      - [x] Test mit Integrations-Test durchgeführt (test/kriterien-test.js)
      - [x] Token-Limits erhöht (maxOutputTokens von 8192 auf 32768) für vollständige JSON-Ausgaben
    - [x] **UI Visualisierung**: Kriterienliste aus JSON Response in ainfo/kriterien.tsx darstellen
      - [x] **Quelldokument-Anzeige**: AAB Struktur Markdown-Datei im UI anzeigen
        - [x] Markdown-Viewer Komponente für Ausschreibungsdokumente integriert
        - [x] Filesystem-basierte AAB-Dokument Ladung implementiert (ersetzt Sample-Daten)
        - [x] Automatische AAB-PDF Erkennung im A-Verzeichnis
        - [x] Parser-Integration für Markdown-Konvertierung (marker, md, etc.)
        - [x] Tab-basierte Navigation zwischen Quelldokument und Kriterien
        - [x] Error Handling und Loading States für Dokumenten-Ladung
      - [x] **AI-Extraktion Workflow**: Prompt-Ausführung gegen Markdown-Datei
        - [x] AI-Extraktion Button ("Kriterien extrahieren" mit Sparkles Icon) implementiert
        - [x] Prompt-Ausführung mit AAB-Markdown als Input konfiguriert
        - [x] Loading States während AI-Verarbeitung angezeigt
        - [x] Error Handling für fehlgeschlagene AI-Requests implementiert
      - [x] **JSON Response Verarbeitung**: Strukturierte Darstellung der Kriterien
        - [x] JSON Response Parser für Eignungskriterien (4 Unterkategorien) erstellt
        - [x] Zuschlagskriterien Tabelle mit Los-basierter Struktur entwickelt
        - [x] Subunternehmerregelung und formale Anforderungen Listen-UI erstellt
        - [x] Expandable Cards für komplexe Kriterienstrukturen implementiert
        - [x] **List Layout Migration**: Card-Style zu Table-Layout für bessere Skalierbarkeit
          - [x] Eignungskriterien: Collapsible Cards zu strukturierten Tabellen mit Spalten für Kriterium, Typ, Dokument, Gültigkeit, Hinweis, Status
          - [x] Zuschlagskriterien: Erweiterte Tabelle mit Status-Spalte für zukünftige Review-Funktionen
          - [x] Subunternehmerregelung & Formale Anforderungen: Listen zu Tabellen mit Status-Spalten konvertiert
          - [x] Vorbereitung für zukünftige Spalten-Erweiterungen (Bearbeitung, Priorität, etc.)
      - [ ] **Review-System**: AI- und Human-Review Funktionalität
        - [x] Review-Status Felder für jedes Kriterium vorbereitet (AI-reviewed, Human-reviewed)
        - [ ] Bearbeitungs-Modi für manuelle Kriterien-Anpassungen
        - [ ] Validierungs-Workflow für Human-in-the-Loop Prozesse
        - [ ] Änderungshistorie und Audit-Trail für Reviews
      - [x] **Table Layout Improvements**: Verbesserung der Tabellen-Darstellung für bessere Usability
        - [x] Nummerierungs-Spalte hinzufügen (1., 2., 3., 1.1., 1.2., 1.1.1., etc.)
        - [x] Tabellen-Breite begrenzen und responsive Design implementieren
        - [x] Spalten-Breite anpassbar machen (resizable columns)
        - [x] Text-Truncation mit Tooltip-Hover für lange Inhalte (max 2 Zeilen, dann "...")
        - [x] TruncatedText Komponente für wiederverwendbare Text-Truncation mit Tooltips
        - [x] Konsistente Spalten-Definitionen across alle Kriterien-Tabellen
        - [x] Hierarchische Nummerierung für verschachtelte Kriterien (Eignungskriterien mit Nachweisen)
        - [x] CSS-Verbesserungen für table-layout: fixed und responsive Breakpoints
    - [x] **Persistierung**: Kriterienliste im Filesystem speichern
      - [x] Persistierung-Utility-Funktionen in lib/kriterien/persistence.ts erstellt
      - [x] kriterien.meta.json Format mit erweiterten Metadaten definiert
      - [x] SWR-Integration für automatisches Laden gespeicherter Kriterien
      - [x] Speichern/Laden Funktionalität in kriterien.tsx integriert
      - [x] UI-Komponenten für Speicher-Status und -Aktionen hinzugefügt
      - [x] Review-Status Tracking für AI- und Human-Reviews implementiert
      - [x] Wiederverwendung bestehender /api/fs/metadata API für WebDAV-Kompatibilität
  - [ ] **Bieterdokumenten-Analyse**: Abgleich von Bieterdokumenten mit Kriterien.
  - [ ] **Dateikategorisierung**: Automatische Kategorisierung von Dokumenten.
  - [ ] **Human-in-the-Loop**: UI zur Validierung und Korrektur von KI-Ergebnissen.

- [ ] **Weitere technische Aufgaben**
  - [x] **Stripe-Integration**: Einrichten von Zahlungsplänen und Checkout.
  - [ ] **Worker-System**: Implementierung eines Job-Queues für langlaufende Aufgaben (Parsing, Analyse).
  - [ ] **Testing**: Entwicklung von Unit-, Integrations- und E2E-Tests.
  - [ ] **Performance-Optimierung**: Code-Splitting, Caching und PWA-Features.

## PROJEKTSTRUKTUR

Die Projektstruktur folgt den Konventionen von Next.js und ist auf Skalierbarkeit und Wartbarkeit ausgelegt:

```
kontext.one/
├── app/                  # Next.js App Router (Seiten, Layouts, API-Routen)
│   ├── (dashboard)/      # Geschützte Dashboard-Seiten
│   ├── (login)/          # Authentifizierungs-Seiten
│   └── api/              # API-Endpunkte (fs, ai, worker, stripe)
├── components/           # Wiederverwendbare UI-Komponenten (shadcn/ui)
├── lib/                  # Kernlogik und Hilfsfunktionen
│   ├── ai/               # KI-bezogene Funktionen (gemini, uniinfer)
│   ├── auth/             # Authentifizierungslogik
│   ├── db/               # Drizzle ORM, Schema und Queries
│   └── fs/               # Dateisystem-Abstraktion
├── docs/                 # Dokumentation
├── public/               # Statische Assets
└── tests/                # Test-Dateien
```

## LERNERFOLGE, CODING-RICHTLINIEN & REGELN & BEST PRACTICES

### Coding-Richtlinien

- **Typsicherheit**: TypeScript konsequent nutzen.
- **Modularität**: Code in logische und wiederverwendbare Module aufteilen.
- **Fehlerbehandlung**: Fehler explizit behandeln und aussagekräftige Logs erstellen.
- **Kommentare**: Komplexe Logik und Funktionen klar dokumentieren.
- **Umweltvariablen**: Sensible Daten und Konfigurationen in `.env` Dateien speichern.

### Lernerfolge

- Die Abstraktion des Dateisystems ist entscheidend für die Unterstützung verschiedener Speicherorte.
- KI-gestützte Analysen erfordern robuste "Human-in-the-Loop"-Prozesse, um die Genauigkeit zu gewährleisten.
- Ein gut strukturiertes PRD im Stil eines Entwickler-Logbuchs hilft, den Überblick über den Fortschritt und die Entscheidungen zu behalten.
- Prompts müssen exakt mit dem erwarteten JSON-Schema übereinstimmen, um Parsing-Fehler zu vermeiden; Kategorienamen strikt vordefinieren und im Prompt durchsetzen.
- Robuste JSON-Parsing-Logik implementieren, um Variationen in AI-Antworten zu handhaben, inklusive aggressiver Extraktion von JSON-Inhalten.
- Debugging durch Logging roher AI-Antworten und schrittweise Anpassung von Prompts ist essenziell für die Fehlersuche bei KI-Integrationen.
- **Filesystem-Persistierung**: Sidecar-JSON-Dateien (*.meta.json) sind ein bewährtes Pattern für Metadaten-Speicherung, da sie WebDAV-kompatibel sind und strukturierte Daten neben Originaldateien ablegen.
- **SWR-Integration**: Automatisches Caching und Revalidierung von Filesystem-Daten durch SWR reduziert API-Calls und verbessert die User Experience erheblich.
- **Erweiterte Metadaten**: Zeitstempel, Versionierung und Review-Status in Metadaten-Strukturen ermöglichen Audit-Trails und Human-in-the-Loop-Workflows.
- **Wiederverwendbare Persistierung-Pattern**: Utility-Funktionen für Speichern/Laden mit einheitlicher Fehlerbehandlung und Typsicherheit schaffen konsistente APIs across verschiedene Datentypen.
- **UI-Feedback**: Speicher-Status, Loading-States und Toast-Benachrichtigungen sind essentiell für eine professionelle User Experience bei asynchronen Filesystem-Operationen.
- **Build-Stabilität & Dependency Management**: 
    - Fehlende Dependencies (wie `openai`) können zu Build-Fehlern führen; Package-Abhängigkeiten müssen explizit in package.json definiert werden, auch wenn sie nur dynamisch importiert werden.
    - Next.js 15 erfordert asynchrone Route-Parameter (`await params`) in API-Routen; Legacy-Synchron-Zugriff führt zu TypeScript-Fehlern.
    - TypeScript-Interfaces müssen vollständig definiert werden; implizite `any`-Typen und fehlende Properties führen zu Build-Fehlern.
    - NextRequest hat keine `ip`-Property; IP-Adressen müssen über Headers (`x-forwarded-for`, `x-real-ip`) ermittelt werden.
    - Leere Module (wie `jobsStore.ts`) müssen implementiert werden, bevor sie importiert werden können; In-Memory-Stores sind eine schnelle Lösung für Development.
    - Review-Status-Interfaces benötigen explizite boolean-Defaults, um TypeScript-Kompatibilität bei optionalen Properties zu gewährleisten.
    - **ZuschlagsKriterium Interface**: Erweiterte TypeScript-Interfaces für hierarchische Kriterien-Strukturen; `unterkriterien` Property als optionales Array für verschachtelte Zuschlagskriterien hinzugefügt, um Build-Fehler bei Kriterien-Zählung zu beheben.
