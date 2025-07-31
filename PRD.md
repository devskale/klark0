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
  - [x] **Context-Sensitive Navigation**: Automatisches Umschalten zur "Docs"-Ansicht bei Dokumentauswahl, Persistierung des selectedDok-Status über localStorage, Breadcrumb-Navigation mit Dokumentkontext
  - [x] **Consolidated Upload Functionality**: Einheitliche Upload-Funktionalität in DoksModule mit Drag-and-Drop, Dialog-basiertem Upload, automatischer Pfad-Erkennung (Bieter vs. Ausschreibung), Dateigrößen-Anzeige und Fehlerbehandlung
  - [x] **UI Layout Optimization**: Upload-Button aus DoksModule in die Top-Menüleiste verschoben (neben Refresh-Button), "Dokumente"-Header entfernt für sauberere UI
  - [x] **Upload Logic Consolidation**: Einheitliche Upload-Funktionalität durch `useUpload` Hook und `UploadDialog` Komponente - eliminiert Code-Duplikation zwischen DoksModule, Projekt- und Bieter-Uploads, verbesserte Wartbarkeit und konsistente UX
    - [x] **Reusable Upload Components**: `hooks/use-upload.ts` Hook für Upload-State-Management und `components/UploadDialog.tsx` für einheitliche Upload-UI
    - [x] **Consolidated Upload Logic**: Alle Upload-Funktionen (Projekt, Bieter, Dokumente) nutzen dieselbe Basis-Implementierung mit konfigurierbaren Callbacks
    - [x] **Improved Error Handling**: Einheitliche Fehlerbehandlung und Benachrichtigungen über alle Upload-Bereiche hinweg
    - [x] **Type Safety**: Vollständig typisierte Upload-Funktionen mit TypeScript für bessere Entwicklererfahrung
    - [x] **UI Fix**: Visuellen Overflow-Bug bei langen Dateinamen im Upload-Dialog durch Text-Truncation behoben
  - [x] **Enhanced File Preview System**: Erweiterte Dokumentenvorschau für multiple Dateitypen in der dinfo-Route
    - [x] **Multi-Format Support**: PDF-Vorschau (bestehend), Bild-Vorschau (JPG, PNG, GIF, BMP, WebP, SVG), Office-Dokumente (DOCX, XLSX, PPTX) mit Download-Option
    - [x] **File Type Detection**: Automatische Erkennung des Dateityps basierend auf Dateiendung mit entsprechender Vorschau-Komponente
    - [x] **Responsive Preview Components**: Separate Komponenten für verschiedene Dateitypen mit einheitlichem Card-Layout und Fehlerbehandlung
    - [x] **Download Functionality**: Download-Buttons für nicht-vorschaubare Dateien (Office-Dokumente, nicht unterstützte Formate)
    - [x] **Error Handling**: Robuste Fehlerbehandlung für fehlgeschlagene Bild-Ladevorgänge und nicht unterstützte Dateitypen
  - [ ] **Anonymisierung**: Schutz sensibler Daten durch KI-basierte NER.
- [ ] **Erweiterte Funktionen (unsortiert)**
  - [x] **Archivierungsfunktion für Projekte und Bieter**: Ermöglicht das sichere Archivieren von Projekt- und Bieterverzeichnissen über WebDAV-Rename-Operationen.
    - [x] **Fix**: Die `Destination`-URL für WebDAV `MOVE`-Operationen wurde korrigiert, um die Kompatibilität mit strikteren Server-Implementierungen zu gewährleisten.
  - [ ] enhance prompt definition with, maxInputLength (chars), maxOutputTokens
  - [ ] Prompt Templating mit Platzhaltern und Kontexten
  - [ ] **Basispfad-Konsolidierung**: Code-Anpassung zur Nutzung eines konsistenten Basispfads (z.B. `/dev` oder `/v1`), in git dev/basepath branch
  - [ ] **Benutzerrollen-Konsolidierung**: Überprüfung und Analyse des Benutzerflusses, Login, Teamauswahl, gemeinsame Team-Einstellungen
  - [x] **Startbildschirm-Icons hinzufügen**: FFG, TU Wien, HPCC Logos
  - [ ] **Dokumentenserver**: Worker-Management (automatisches Parsen hochgeladener Dokumente)
  - [ ] Projektansicht: Sortieren der Projekte
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
  - [x] **Dateikategorisierung**: Automatische Kategorisierung von Dokumenten.
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

## AUTHENTIFIZIERUNG & SESSION-MANAGEMENT

### Anmelde-System (Sign-In/Sign-Out)

Das Authentifizierungssystem verwendet JWT-basierte Session-Cookies mit folgender Architektur:

#### **Sign-In Prozess**
- **Frontend**: `app/(login)/login.tsx` bietet Anmeldeformular mit E-Mail/Passwort
- **Backend Action**: `app/(login)/actions.ts` → `signIn()` Server Action
  - Validierung via Zod Schema (`signInSchema`)
  - Passwort-Hashing mit bcryptjs (10 Rounds)
  - Datenbankabfrage: User + Team Join via Drizzle ORM
  - Session-Cookie Erstellung: JWT Token mit 24h Gültigkeit
  - Activity Logging: `SIGN_IN` Events werden in `activityLogs` gespeichert
  - Redirect nach erfolgreicher Anmeldung: `/dashboard`

#### **Sign-Out Prozess**
- **Frontend**: Mehrere UI-Integrationen:
  - `app/(dashboard)/layout.tsx`: User-Dropdown-Menü mit Sign-Out Button
  - `app/(dashboard)/dashboard/layout.tsx`: Dashboard-spezifische Navigation
- **Backend Action**: `app/(login)/actions.ts` → `signOut()` Server Action
  - Activity Logging: `SIGN_OUT` Event wird geloggt
  - Session-Cookie Löschung: `cookies().delete('session')`
  - Kein Redirect - Frontend handelt Navigation

#### **Session-Management**
- **Cookie**: `session` JWT Token (httpOnly, secure, sameSite: lax)
- **Middleware**: `middleware.ts` schützt `/dashboard` Routen
  - Prüft Session-Cookie bei jedem Request
  - Automatische Session-Verlängerung bei GET-Requests
  - Redirect zu `/sign-in` bei fehlender/ungültiger Session
- **Token-Verifizierung**: `lib/auth/session.ts` bietet:
  - `getSession()`: Aktuelle Session abrufen
  - `setSession()`: Neue Session erstellen
  - `verifyToken()`: JWT Token validieren

#### **Sicherheitsmerkmale**
- Passwort-Hashing mit bcryptjs
- HTTP-Only Cookies (JS Zugriff verhindert)
- Secure Flag in Production
- Session-Timeout nach 24 Stunden
- Activity-Logging für Audit-Trail
- Team-basierte Autorisierung über `teamMembers` Tabelle

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
