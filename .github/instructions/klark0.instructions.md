---
applyTo: '**'
---
Scope: Build klark0, a webapp for tender document auditing. Webapp language is german.
Framework: Next.js
Language: TypeScript
State Management: SWR
ORM: Drizzle
Database: Postgres

Payments: Stripe

---
applyTo: '**'
---

# klark0 Project Rules

## Project Goal
Build klark0, a webapp for tender document auditing. The application language is German.

## Project Setup

- **Framework:** Next.js
- **Language:** TypeScript
- **State Management:** SWR
- **ORM:** Drizzle
- **Database:** Postgres
- **Payments:** Stripe
- **UI Library:** shadcn/ui
- **Authentication:** JWT with session cookies

### Middleware
- Global middleware protects logged-in routes
- Local middleware secures Server Actions and validates Zod schemas

### Filesystem & Storage
- Access documents via filesystem, configured in Einstellungen
- Remote storage via WebDAV (other options planned)

### API Routes
**Filesystem (WebDAV):**
- `GET /api/fs`           : List directory (PROPFIND)
- `GET /api/fs/read`      : Retrieve file content (GET)
- `POST /api/fs/read`     : Return file content as JSON (`content`)
- `GET /api/fs/metadata`  : Read metadata sidecar (JSON)
- `POST /api/fs/metadata` : Write metadata sidecar (JSON)
- `POST /api/fs/mkdir`    : Create directory
- `POST /api/fs/delete`   : Delete file or directory
- `POST /api/fs/rename`   : Rename file or directory
- `POST /api/fs/index`    : Update/create index file
- `POST /api/fs/upload`   : Upload file(s)

**AI Services:**
- `POST /api/ai/gem/custom` : Custom AI service
- `POST /api/ai/gem/stream` : AI streaming service

**Worker Management:**
- `POST /api/worker/jobs`         : Create/start job
- `GET /api/worker/jobs`          : List jobs (filter by type, status, project)
- `GET /api/worker/jobs/[jobId]`  : Get job details/status
- `DELETE /api/worker/jobs/[jobId]`: Cancel/stop job

**Worker System:**
- `GET /api/worker/status` : Overall worker system status
- `GET /api/worker/types`  : List worker types/capabilities

**Worker Types:**
- parsing         : Document parsing/structure extraction
- anonymization   : Data anonymization/privacy protection
- analysis        : AI-based document analysis/criteria extraction
- fakejob         : Testing worker (random duration)

## Project Structure
Follows Next.js conventions:
- `app/` for routing/layouts
- `components/` for reusable UI
- `lib/` for business logic (Drizzle, Stripe, auth, etc.)
- `docs/` for documentation
- `hooks/` for custom React hooks
- `context/` for React context providers
- `data/`, `public/`, `src/types/`, `tests/`, `tmp/`, `types/` as needed

### Example Directory Tree
```
. 
 ├── app                  # Next.js app directory (routing, layouts)
 │   ├── (dashboard)      # Dashboard area for logged-in users
 │   │   ├── dashboard    # Main dashboard pages
 │   │   │   ├── activity         # User activity
 │   │   │   ├── afreigabe        # Ausschreibung Freigabe durch Nutzer
 │   │   │   ├── ainfo            # Ausschreibungsinformationen inkl. AI
 │   │   │   ├── atools           # Ausschreibungs-Tools
 │   │   │   ├── auswahl          # Dateibrowser, Dateiauswahl
 │   │   │   ├── binfo            # Bieterinformationen
 │   │   │   ├── btools           # Bieter-Tools
 │   │   │   ├── dinfo            # Dokumenteninfo, AI-Kategorisierung, Preview
 │   │   │   ├── dtools           # Dokumenten-Tools
 │   │   │   ├── einstellungen    # Webapp Einstellungen
 │   │   │   ├── general          # Allgemeine Einstellungen
 │   │   │   ├── jobs             # Worker-Jobs Übersicht
 │   │   │   ├── konto            # Benutzerkonto
 │   │   │   ├── release-notes    # Release Notes
 │   │   │   └── security         # Sicherheit & Berechtigungen
 │   │   └── pricing      # Preismodell
 │   ├── (login)          # Login & Registrierung
 │   │   ├── sign-in      # Login-Seite
 │   │   └── sign-up      # Registrierungs-Seite
 │   ├── api              # Next.js API routes (server logic)
 │   │   ├── ai           # AI-Inferenz und Dienste
 │   │   │   ├── aisdk
 │   │   │   ├── gem
 │   │   │   │   ├── custom      # Custom AI Service
 │   │   │   │   └── stream      # AI Streaming Service
 │   │   │   ├── query
 │   │   │   ├── test-settings
 │   │   │   └── uniinfer
 │   │   │       └── stream
 │   │   ├── fs           # Filesystem Handling (WebDAV etc.)
 │   │   │   ├── delete
 │   │   │   ├── index
 │   │   │   ├── metadata
 │   │   │   ├── mkdir
 │   │   │   ├── read
 │   │   │   ├── rename
 │   │   │   └── upload
 │   │   ├── project      # Projektinformationen
 │   │   │   └── info
 │   │   ├── settings     # Einstellungen API
 │   │   ├── stripe       # Stripe Payments
 │   │   │   ├── checkout # Stripe Checkout
 │   │   │   └── webhook  # Stripe Webhook
 │   │   ├── team         # Teamverwaltung
 │   │   ├── user         # Benutzerverwaltung
 │   │   └── worker       # Worker-System (OCR, Indexing, etc.)
 │   │       ├── debug
 │   │       ├── jobs
 │   │       │   ├── [jobId]         # Einzelner Job
 │   │       │   │   └── callback    # Job Callback
 │   │       │   └── callback_generic
 │   │       ├── list
 │   │       ├── settings
 │   │       ├── status
 │   │       └── test-store
 │   └── components        # App-spezifische Komponenten
 ├── components            # Wiederverwendbare UI-Komponenten
 │   ├── ai                # AI-Komponenten
 │   ├── customized        # Angepasste Komponenten
 │   │   └── select        # Custom Select-Komponente
 │   └── ui                # shadcn/ui Komponenten
 ├── context               # React Context Provider
 ├── data                  # Beispiel- und Testdaten
 ├── docs                  # Projektdokumentation
 │   └── examplecode       # Beispielcode für Komponenten
 ├── hooks                 # Custom React Hooks
 ├── lib                   # Business Logic, DB, Auth, Stripe
 │   ├── ai                # AI-Logik
 │   ├── auth              # Authentifizierung
 │   ├── db                # Drizzle ORM, Migrationen
 │   │   ├── migrations    # DB-Migrationen
 │   │   │   └── meta      # Migration-Metadaten
 │   │   └── schema        # DB-Schema
 │   ├── fs                # Filesystem-Logik
 │   └── payments          # Stripe-Logik
 ├── node_modules          # Abhängigkeiten
 ├── prompts               # Prompt-Vorlagen
 ├── public                # Statische Assets (Bilder, Fonts, etc.)
 ├── src                   # Source Code
 │   └── types             # TypeScript Typdefinitionen
 ├── tests                 # Tests und Testskripte
 ├── tmp                   # Temporäre Dateien
 └── types                 # Globale Typdefinitionen
```

## Dev Guidelines

- **Component Reusability:** Place all reusable components in `components/`
- **Modular Page Architecture:** Separate pages logically (Dashboard, Login, etc.) and use shared layouts
- **API Routes:** Keep server-side logic in `api/` for clear client-server separation
- **Run locally:** Use `pnpm dev` to start the app
- **Language:** All UI and documentation in German

---
 │   │       │   ├── [jobId]
