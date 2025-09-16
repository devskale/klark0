# kontext.one - Product Requirements Document

## Ziel

Entwicklung einer digitalen Webapp für die Auditierung von Ausschreibungsunterlagen (Tender Documents). Die Anwendung soll Transparenz, Effizienz und Automatisierung in den Bewertungsprozess von Ausschreibungen bringen.

## Anforderungen

### Funktionale Anforderungen
- **Dokumenten-Upload und -Verwaltung**: Sichere Speicherung und Organisation von Ausschreibungsunterlagen
- **KI-gestützte Analyse**: Automatische Extraktion und Bewertung von Kriterien aus Dokumenten
- **Benutzer- und Teamverwaltung**: Rollenbasierte Zugriffskontrolle und Teamzusammenarbeit
- **Transparente Bewertung**: Nachvollziehbare Kriterien und Bewertungsprozesse
- **Sicherheit**: Schutz sensibler Ausschreibungsdaten

### Technische Anforderungen
- **Framework**: Next.js mit TypeScript
- **Datenbank**: PostgreSQL mit Drizzle ORM
- **UI**: shadcn/ui Komponenten
- **Zahlungen**: Stripe Integration
- **Authentifizierung**: JWT-basierte Session-Cookies

*Detaillierte technische Implementierung siehe [README.md](./README.md)*

## Produktvision

### Kernfunktionalitäten
- **Projektmanagement**: Strukturierte Organisation von Ausschreibungsprojekten
- **Dokumentenanalyse**: KI-gestützte Extraktion von Bewertungskriterien
- **Kollaborative Bewertung**: Teambasierte Prüfung und Bewertung
- **Compliance-Tracking**: Nachverfolgung von Anforderungserfüllung
- **Reporting**: Automatisierte Berichte und Auswertungen

### Zielgruppen
- **Öffentliche Auftraggeber**: Behörden und öffentliche Institutionen
- **Beratungsunternehmen**: Spezialisierte Ausschreibungsberater
- **Compliance-Teams**: Interne Prüfungsabteilungen
- **Projektmanager**: Verantwortliche für Ausschreibungsprozesse

## ENTWICKLUNGSPLAN / STATUS

### ✅ Phase 1: Grundlagen (Abgeschlossen)

#### MVP-Funktionalitäten
- [x] **Benutzer-Authentifizierung**: Registrierung, Anmeldung, Session-Management
- [x] **Team-Kollaboration**: Team-Erstellung, Mitgliederverwaltung, Rollensystem
- [x] **Projekt-Management**: Projektauswahl und -organisation
- [x] **Dokumenten-Upload**: Konsolidiertes Upload-System mit Drag & Drop
- [x] **Datei-Browser**: Vollständige Dateiverwaltung und -organisation
- [x] **KI-Integration**: Grundlegende Dokumentenanalyse mit Gemini AI

### 🔄 Phase 2: Kernfunktionen (In Bearbeitung)

#### Analyse und Bewertung
- [ ] **Kriterien-Optimierung**: Überarbeitung umfangreicher allgemeiner Kriterien
- [ ] **Anonymisierung**: Automatische Entfernung sensibler Daten
- [ ] **KI-Review-System**: Qualitätskontrolle für Analysen
- [ ] **Prompt-Engineering**: Verbesserung der KI-Prompts

#### Sicherheit und Compliance
- [ ] **Erweiterte Benutzerrollen**: Admin, Prüfer, Viewer-Rollen
- [ ] **Audit-Logging**: Umfassende Aktivitätsverfolgung
- [ ] **Datenschutz-Features**: DSGVO-konforme Datenverarbeitung

### 📋 Phase 3: Skalierung (Geplant)

#### Performance und Stabilität
- [ ] **Worker-System**: Asynchrone Verarbeitung zeitaufwändiger Aufgaben
- [ ] **Caching-Strategien**: Optimierung der Anwendungsperformance
- [ ] **Monitoring**: Systemüberwachung und Fehlerbehandlung

#### Testing und Qualitätssicherung
- [ ] **Automatisierte Tests**: Unit-, Integration- und E2E-Tests
- [ ] **Performance-Tests**: Lastests und Optimierung
- [ ] **Security-Audits**: Sicherheitsprüfungen und Penetrationstests

## PROJEKTSTRUKTUR

*Detaillierte Projektstruktur und technische Architektur siehe [README.md](./README.md)*

### Organisationsprinzipien
- **Modulare Architektur**: Klare Trennung von Geschäftslogik, UI und Datenebene
- **Feature-basierte Organisation**: Zusammengehörige Funktionen in gemeinsamen Verzeichnissen
- **Wiederverwendbarkeit**: Zentrale Komponenten und Hooks für konsistente UX
- **Skalierbarkeit**: Struktur unterstützt Wachstum und Erweiterungen

## AUTHENTIFIZIERUNG & SESSION-MANAGEMENT

### Sicherheitsanforderungen
- **Sichere Authentifizierung**: JWT-basierte Session-Cookies mit bcryptjs-Hashing
- **Rollenbasierte Zugriffskontrolle**: Team-Mitgliedschaften und Berechtigungen
- **Session-Sicherheit**: Automatische Validierung und sichere Cookie-Übertragung
- **Audit-Trail**: Vollständige Protokollierung von Anmelde-Aktivitäten

### Compliance-Features
- **DSGVO-Konformität**: Datenschutzkonforme Benutzerregistrierung und -verwaltung
- **Sicherheitsstandards**: HTTPS-only, CSRF-Schutz, Rate Limiting
- **Transparenz**: Nachvollziehbare Zugriffs- und Aktivitätsprotokolle

*Technische Implementierungsdetails siehe [README.md](./README.md)*

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
- **Context-Sensitive Navigation & State Persistence**:
  - localStorage-basierte Persistierung von selectedProject, selectedBieter und selectedDok verhindert Datenverlust bei Navigation
  - useEffect-Hooks müssen sorgfältig implementiert werden, um State-Clearing zu vermeiden; aggressive State-Resets können localStorage-Wiederherstellung unterbrechen
  - View-Switching-Logic sollte selectedDok-State nicht automatisch clearen; nur bei expliziten Projekt-/Bieter-Wechseln ist State-Reset angebracht
  - Highlighting-Logic muss sowohl selectedDocs Array als auch einzelnen selectedDok-State berücksichtigen für konsistente UI-Darstellung
  - Navigation zwischen Detail- und Auswahlansichten erfordert koordinierte State-Management-Strategien zwischen verschiedenen Komponenten
- **Upload Logic Consolidation & Reusable Components**:
  - Code-Duplikation zwischen verschiedenen Upload-Bereichen führt zu Wartungsproblemen und inkonsistenter UX; zentrale Hooks und Komponenten lösen dies effektiv
  - Custom Hooks (`useUpload`) mit konfigurierbaren Callbacks ermöglichen flexible Wiederverwendung bei unterschiedlichen Upload-Kontexten (Projekt, Bieter, Dokumente)
  - Einheitliche Dialog-Komponenten (`UploadDialog`) mit Props-basierter Konfiguration schaffen konsistente UI-Patterns und reduzieren Entwicklungsaufwand
  - SWR-Mutation-Funktionen müssen korrekt referenziert werden; `mutate()` vs. `mutateProjects()` - falsche Funktionsnamen führen zu Runtime-Fehlern
  - Drag-and-Drop-Funktionalität sollte in wiederverwendbaren Komponenten gekapselt werden, um konsistentes Verhalten über alle Upload-Bereiche zu gewährleisten
- **Office Document Preview System**:
  - DOCX und XLSX Dateien können jetzt direkt im Browser als formatiertes HTML angezeigt werden
  - Server-seitige Konvertierung mit mammoth.js (DOCX) und SheetJS (XLSX) für sichere Verarbeitung ohne externe APIs
  - HTML-Sanitization mit DOMPurify verhindert XSS-Angriffe bei der Anzeige konvertierter Inhalte
  - Separate API-Routen (`/api/preview/docx`, `/api/preview/xlsx`) für modulare Dokumentenverarbeitung
  - Loading-States und Fehlerbehandlung für bessere UX bei der Dokumentenkonvertierung
  - Excel-Dateien zeigen alle Arbeitsblätter mit Styling und Sheet-Navigation
  - Word-Dokumente behalten semantische Formatierung (Überschriften, Listen, Tabellen) bei
  - Fallback auf Download-Option bei Konvertierungsfehlern oder nicht unterstützten Formaten
