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

- [ ] **KI-Funktionen**
  - [x] **Metadaten-Extraktion**: Automatische Extraktion von Metadaten aus Dokumenten.
  - [ ] **Kriterien-Extraktion**: Extraktion von Bewertungskriterien aus Ausschreibungen.
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

## LERNERFOLGE, CODING-RICHTLINIEN & REGELN

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
