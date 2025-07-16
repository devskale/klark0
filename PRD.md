# Produktanforderungsdokument (PRD) für kontext.one

## Produktübersicht

kontext.one ist eine Webapplikation für die digitale Prüfung von Ausschreibungsdokumenten. Die Anwendung unterstützt den gesamten Lebenszyklus eines Ausschreibungsprojekts mit Fokus auf Transparenz, Effizienz und Automatisierung.

## Hauptfunktionen

- **Ausschreibungsprojekt erstellen** - Neue Projekte anlegen und verwalten
- **Dokumente hochladen** - Upload von Ausschreibungs- und Bieterdokumenten
- **Dokumentkonvertierung** - Automatische Umwandlung (DOC, PDF) in Markdown
- **Automatische Dateiumbenennung** - KI-basierte Umbenennung mit zusammenfassenden Titeln
- **Anonymisierung** - Schutz sensibler Daten auf Anfrage
- **Vault-Navigation** - Projekt- und Bieterauswahl für kontextbezogene Aktionen
- **AI-Analyse Ausschreibungsdokumente** - Intelligente Analyse von Ausschreibungsdokumentensätzen
- **AI-Kriterienliste Extraktion** - Automatische Extraktion von Bewertungskriterien aus Ausschreibungsdaten
- **AI-Analyse Bieterdokumente** - Intelligente Analyse von Bieterdatensätzen
- **AI-Kriterienprüfung** - Automatische Prüfung von Bieterdokumenten gegen Kriterien
- **AI-Kriteriencheck** - Vollautomatisierte Bewertung mit KI-Unterstützung
- **Human-in-the-Loop** - Menschliche Validierung und Kontrolle bei allen AI-Prozessen

## Technische Architektur

### Tech Stack

- **Framework**: Next.js (TypeScript) mit App Directory
- **Database**: PostgreSQL mit Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: JWT Session Cookies
- **Payments**: Stripe Integration
- **Filesystem**: WebDAV für Remote-Synchronisation

### API Struktur

- `/api/fs/*` - Dateisystem-Operationen (CRUD, WebDAV)
- `/api/ai/*` - KI-Services (Streaming, Custom)
- `/api/worker/*` - Job-Management (Parsing, Anonymisierung, Analyse)
- `/api/stripe/*` - Zahlungsabwicklung

## TODO Liste / Entwicklungsstatus

### ✅ Abgeschlossen

- [x] Grundsetup (Next.js, TypeScript, Database)
- [x] Authentifizierung und Benutzerverwaltung
- [x] Dateisystem-Integration (Upload, Download, Management)
- [x] Stripe-Integration
- [x] UI-Komponenten und Sidebar
- [x] WebDAV-Server Integration
- [x] File Upload zu Server
- [x] Projekt/Bieter-Kontext-Persistierung
- [x] **Markdown-Konvertierung**: Vollständige Integration (serverseitig)

### 🚧 In Arbeit

- [ ] Datei-/Verzeichnis-Umbenennung
- [ ] AI-Funktion Dateikategorisierung:
  - [x] Automatische Dateikategorisierung und -umbenennung pro Dokument
  - [ ] kategorisierung eines dokumentensatzes (verzeichnisweise)
- [ ] AI-Funktion Ausschreibungsmetadaten extrakion
- [ ] AI-Funktion Ausschreibung Kriterienliste extraktion
- [ ] **AI-Integration**:
  - [x] gemini integriert
  - [ ] uniinfer ai inference

### 📋 Geplant

- [ ] **Anonymisierung**: NER/LLM-basierte Implementierung
- [ ] **Testing**: Unit-, Integration- und E2E-Tests
- [ ] **Performance**: Optimierung und PWA-Features

## Benutzerrollen

- **Ausschreibungsprüfer**: Projektmanagement, Dokumentenanalyse
- **Bieteradministrator**: Upload und Verwaltung von Bieterdokumenten

## Nicht-funktionale Anforderungen

- **Performance**: Optimierte SSR, schnelle Ladezeiten
- **Sicherheit**: Verschlüsselte Kommunikation, Datenschutz
- **Skalierbarkeit**: Modularer Aufbau für Erweiterungen
- **Accessibility**: WCAG-konforme UI-Komponenten
- **Sprache**: Primär Deutsch, erweiterbar

## Entwicklungsziele

1. **Kurzfristig**: Vollständige Vault-Integration und Dateiverwaltung
2. **Mittelfristig**: KI-basierte Dokumentenverarbeitung
3. **Langfristig**: Vollautomatisierte Ausschreibungsanalyse

## Erfolgskriterien

- Reduktion manueller Prozesse um 70%
- Benutzerakzeptanz >90%
- Hohe Verfügbarkeit (99.9%)
- Effektiver Datenschutz durch Anonymisierung
