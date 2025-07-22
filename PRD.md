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

- [x] **Grund-Setup**: Next.js Projekt mit TypeScript, Drizzle ORM (PostgreSQL) und shadcn/ui/Tailwind CSS Integration
- [x] **Authentifizierung & Benutzerverwaltung**: JWT-basierte Authentifizierung mit Session-Cookies, geschützte Routen via Middleware, Anmelde-/Registrierungsseiten
- [x] **Kernfunktionen**: Projektmanagement, Dokumenten-Upload, WebDAV-Integration, Dokumentenkonvertierung (DOC/PDF zu Markdown)
  - [ ] **Anonymisierung**: Schutz sensibler Daten durch KI-basierte NER.
- [ ] **Erweiterte Funktionen (unsortiert)**
  - [ ] enhance prompt definition with, maxInputLength (chars), maxOutputTokens
  - [ ] Prompt Templating mit Platzhaltern und Kontexten
  - [ ] **Basispfad-Konsolidierung**: Code-Anpassung zur Nutzung eines konsistenten Basispfads (z.B. `/dev` oder `/v1`)
  - [ ] **Benutzerrollen-Konsolidierung**: Überprüfung und Analyse des Benutzerflusses, Login, Teamauswahl, gemeinsame Team-Einstellungen
  - [ ] **Startbildschirm-Icons hinzufügen**: FFG, TU Wien, HPCC Logos
  - [ ] **Dokumentenserver**: Worker-Management (automatisches Parsen hochgeladener Dokumente)
  - [ ] Auswahl Browser: Multiple File Uploads, Zip uploads, Big file uploads, Downloads.
  - [ ] Safety: füge Privatparameter zu doks, bieter oder projekte. solche dokumente sollten nicht öffentlich zugänglich sein.
  - [ ] project images: preview and generative image gen.  
- [ ] Kriterienliste
  - [ ] Vorauswahl Detektion: wurden alle Dokumente abgegeben. Alleine, subunternehmer ider Bietergemeinschaft? wurden alle formblätter abgegeben?
  - [ ] Pflicht, Optional, Oder Kriterien
  - [ ] Allgemeine Kriterien sind zu umfangreich.
- [ ] Bieterinfo
  - [ ] Preis, Preisspiegel
- [ ] Ausschreiber Info
  - [ ] Preisspiegel, wieviele Lose wurden wie oft abegeben, welche lose nicht.
- [ ] **KI-Funktionen**
  - [x] **KI-Funktionen**: Metadaten- und Kriterien-Extraktion, Kontextlängen-Management (10k/500k Zeichen Limits) mit automatischer Kürzung und Logging
    - [x] **Dokumenttyp-spezifische Prompts**: Automatische Erkennung und Verarbeitung von Bieter-/Ausschreibungsdokumenten mit spezifischen Prompts
    - [x] **Prompt Integration**: KRITERIEN_EXTRAKTION Query mit JSON-Schema Validierung, erweiterten Token-Limits (32k) und Integrationstests
    - [x] **UI Visualisierung**: Kriterienliste mit Markdown-Viewer, automatischer PDF-Erkennung, Tab-Navigation und robustem Error Handling
      - [x] **AI-Extraktion Workflow**: UI-Integration mit Extraktions-Button, Loading States und Error Handling
      - [x] **JSON Response Verarbeitung**: Strukturierte Darstellung aller Kriterien-Typen (Eignung, Zuschlag, Subunternehmer, formale Anforderungen)
        - [x] **UI-Optimierungen**: Migration zu Tabellen-Layout für alle Kriterien-Typen mit Status-Tracking und Erweiterbarkeit
      - [ ] **Review-System**: AI- und Human-Review Funktionalität
        - [x] Review-Status Felder für jedes Kriterium vorbereitet (AI-reviewed, Human-reviewed)
        - [ ] Bearbeitungs-Modi für manuelle Kriterien-Anpassungen
        - [ ] Validierungs-Workflow für Human-in-the-Loop Prozesse
        - [ ] Änderungshistorie und Audit-Trail für Reviews
      - [x] **Table Layout Improvements**: Responsive Tabellen mit Nummerierung, anpassbaren Spalten, Text-Truncation und konsistentem Design
    - [x] **Persistierung**: Filesystem-basierte Speicherung mit SWR-integration, Review-Status Tracking und WebDAV-Kompatibilität
  - [ ] **Bieterdokumenten-Analyse**: Abgleich von Bieterdokumenten mit Kriterien.
  - [ ] **Dateikategorisierung**: Automatische Kategorisierung von Dokumenten.
  - [ ] **Human-in-the-Loop**: UI zur Validierung und Korrektur von KI-Ergebnissen.
- [ ] **Weitere technische Aufgaben**
  - [x] **Stripe-Integration**: Zahlungspläne und Checkout-Funktionalität
  - [ ] **Worker-System**: Implementierung eines Job-Queues für langlaufende Aufgaben (Parsing, Analyse).
  - [ ] **Testing**: Entwicklung von Unit-, Integrations- und E2E-Tests.
  - [ ] **Performance-Optimierung**: Code-Splitting, Caching und PWA-Features.

## PROJEKTSTRUKTUR

Die Projektstruktur folgt den Konventionen von Next.js und ist auf Skalierbarkeit und Wartbarkeit ausgelegt:

```
.
├── app/                  # Next.js App Router (Seiten, Layouts, API-Routen)
│   ├── (dashboard)/      # Geschützte Dashboard-Seiten
│   ├── (login)/          # Authentifizierungs-Seiten
│   └── api/              # API-Endpunkte (fs, ai, worker, stripe)
├── components/           # Wiederverwendbare UI-Komponenten (shadcn/ui)
├── lib/                  # Kernlogik und Hilfsfunktionen
├── docs/                 # Dokumentation
├── public/               # Statische Assets
└── tests/                # Test-Dateien
```

## LERNERFOLGE, CODING-RICHTLINIEN & REGELN & BEST PRACTICES

### Coding-Richtlinien

- Typsicherheit: TypeScript konsequent nutzen.
- Modularität: Code in logische und wiederverwendbare Module aufteilen.
- Fehlerbehandlung: Fehler explizit behandeln und aussagekräftige Logs erstellen.
- Kommentare: Komplexe Logik und Funktionen klar dokumentieren.
- Umweltvariablen: Sensible Daten und Konfigurationen in .env Dateien speichern.

### Lernerfolge

- Die Abstraktion des Dateisystems ist entscheidend für die Unterstützung verschiedener Speicherorte.
- KI-gestützte Analysen erfordern robuste "Human-in-the-Loop"-Prozesse, um die Genauigkeit zu gewährleisten.
- Ein gut strukturiertes PRD im Stil eines Entwickler-Logbuchs hilft, den Überblick über den Fortschritt und die Entscheidungen zu behalten.
- Prompts müssen exakt mit dem erwarteten JSON-Schema übereinstimmen, um Parsing-Fehler zu vermeiden; Kategorienamen strikt vordefinieren und im Prompt durchsetzen.
- Robuste JSON-Parsing-Logik implementieren, um Variationen in AI-Antworten zu handhaben, inklusive aggressiver Extraktion von JSON-Inhalten.
- Debugging durch Logging roher AI-Antworten und schrittweise Anpassung von Prompts ist essenziell für die Fehlersuche bei KI-Integrationen.
- **Filesystem-Persistierung**: Sidecar-JSON-Dateien (\*.meta.json) sind ein bewährtes Pattern für Metadaten-Speicherung, da sie WebDAV-kompatibel sind und strukturierte Daten neben Originaldateien ablegen.
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
