# Produktanforderungsdokument (PRD) für kontext.one

## GOAL

kontext.one ist eine Webapplikation für die digitale Prüfung von Ausschreibungsdokumenten. Die Anwendung unterstützt den gesamten Lebenszyklus eines Ausschreibungsprojekts mit Fokus auf Transparenz, Effizienz und Automatisierung.

## Technische Architektur

### Tech Stack

- **Framework**: Next.js (TypeScript) mit App Directory
- **Database**: PostgreSQL mit Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: JWT Session Cookies
- **Payments**: Stripe Integration
- **Filesystem**: WebDAV für Remote-Synchronisation

## Benutzerrollen

- **Ausschreibungsprüfer**: Projektmanagement, Dokumentenanalyse
- **Bieteradministrator**: Upload und Verwaltung von Bieterdokumenten

### API Struktur

- `/api/fs/*` - Dateisystem-Operationen (CRUD, WebDAV)
- `/api/ai/*` - KI-Services (Streaming, Custom)
- `/api/worker/*` - Job-Management (Parsing, Anonymisierung, Analyse)
- `/api/stripe/*` - Zahlungsabwicklung

## TODO Liste / Entwicklungsstatus

### Kernfunktionen

- [x] **Ausschreibungsprojekt erstellen** - Neue Projekte anlegen und verwalten
  - [x] Projektstruktur einrichten
  - [x] Persistierung im Kontext
- [x] **Dokumente hochladen** - Upload von Ausschreibungs- und Bieterdokumenten
  - [x] File Upload zum Server
  - [x] Dateisystem-Integration (Upload, Download, Management)
- [x] **Dokumentkonvertierung** - Automatische Umwandlung (DOC, PDF) in Markdown
  - [x] Backend implementierung (serverseitig)
- [ ] **Anonymisierung** - Schutz sensibler Daten auf Anfrage
  - [x] NER/LLM-basierte Implementierung in Backend
  - [ ] Integration in Webapp via Worker
- [x] **Dateiauswahl-Navigation** - Projekt- und Bieterauswahl für kontextbezogene Aktionen
  - [x] Projekt/Bieter-Kontext-Persistierung

### AI-Funktionen

- [ ] **AI-Analyse Ausschreibungsdokumente** - Intelligente Analyse von Ausschreibungsdokumentensätzen
  - [x] AI-Funktion Ausschreibungsmetadaten extraktion
- [ ] **AI-Kriterienliste Extraktion** - Automatische Extraktion von Bewertungskriterien aus Ausschreibungsdaten
  - [ ] AI-Funktion Ausschreibung Kriterienliste extraktion
- [ ] **AI-Analyse Bieterdokumente** - Intelligente Analyse von Bieterdatensätzen
- [ ] **AI-Kriterienprüfung** - Automatische Prüfung von Bieterdokumenten gegen Kriterien
- [ ] **AI-Kriteriencheck** - Vollautomatisierte Bewertung mit KI-Unterstützung
- [ ] **Human-in-the-Loop** - Menschliche Validierung und Kontrolle bei allen AI-Prozessen
- [ ] **AI-Funktion Dateikategorisierung**
  - [x] Automatische Dateikategorisierung und -umbenennung pro Dokument
  - [ ] Kategorisierung eines Dokumentensatzes (verzeichnisweise)
- [ ] **AI-Integration**
  - [x] Gemini integriert
  - [ ] Uniinfer AI Inference

### Technische Aufgaben

- [x] **Grundsetup** (Next.js, TypeScript, Database)
- [x] **Authentifizierung und Benutzerverwaltung**
- [x] **Stripe-Integration**
- [x] **UI-Komponenten und Sidebar**
- [x] **WebDAV-Server Integration**
- [ ] **Testing**: Unit-, Integration- und E2E-Tests
- [ ] **Performance**: Optimierung und PWA-Features

# CODING GUIDELINES & RULES
