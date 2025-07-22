# Project Rules for kontext.one

## Scope

Build kontext1 (kontext.one), a webapp for tender document auditing. The webapp language is German.

## Tech Stack

- Framework: Next.js
- Language: TypeScript
- State Management: SWR
- ORM: Drizzle
- Database: Postgres
- Payments: Stripe
- UI Library: shadcn/ui
- Authentication: JWT with session cookies

## Middleware

- Global middleware to protect logged-in routes
- Local middleware to protect Server Actions or validate Zod schemas

## Filesystem

Access to documents via filesystem, configured in Einstellungen.

Remote Storage: Support for remote storage via WebDAV (Other options will be implemented later).

## API Routes

### FS Endpoints for Remote Filesystem Access

- GET `/api/fs` : list directory via WebDAV PROPFIND
- GET `/api/fs/read` : retrieve file content (binary/text) via WebDAV GET
- POST `/api/fs/read` : return file content as JSON (`content`)
- GET `/api/fs/metadata` : read metadata sidecar (JSON)
- POST `/api/fs/metadata` : write metadata sidecar (JSON)
- POST `/api/fs/mkdir` : create directory
- POST `/api/fs/delete` : delete file or directory
- POST `/api/fs/rename` : rename file or directory
- POST `/api/fs/index` : update or create index file
- POST `/api/fs/upload` : upload file(s)

### AI Services

- `/api/ai/gem/custom` : custom AI service
- `/api/ai/gem/stream` : AI Streaming service

### Worker Management

- POST `/api/worker/jobs` : create and start new job
- GET `/api/worker/jobs` : list all jobs (with filtering by type, status, project)
- GET `/api/worker/jobs/[jobId]` : get specific job details and status
- DELETE `/api/worker/jobs/[jobId]` : cancel/stop specific job

### Worker System Routes

- GET `/api/worker/status` : get overall worker system status
- GET `/api/worker/types` : list all available worker types and capabilities

### Available Worker Types

- parsing : Document parsing and structure extraction
- anonymization : Data anonymization and privacy protection
- analysis : AI-based document analysis and criteria extraction
- fakejob : Testing worker with configurable random duration (3-10+ seconds)

## Project Structure

The project follows Next.js conventions with directories for routing, components, libraries, and documentation. Below is a detailed version of the directory tree:

```
.
 ├── app  # App Directory. Contains layout and root layouts for global structuring as well as dynamic routing files (e.g., page.tsx).
 │   ├── (dashboard)
 │   │   ├── dashboard
 │   │   │   ├── activity
 │   │   │   ├── afreigabe  # ausschreibung freigabe durch nutzer
 │   │   │   ├── ainfo      # ausschreibungs informationen, inkl. ai funktionen
 │   │   │   ├── atools
 │   │   │   ├── auswahl    # dateibrowser, dateiauswahl
 │   │   │   ├── binfo
 │   │   │   ├── btools
 │   │   │   ├── dinfo      # dokumenten info, ai kategorisierung, dok preview
 │   │   │   ├── dtools
 │   │   │   ├── einstellungen  # webapp einstellungen vornehmen
 │   │   │   ├── general
 │   │   │   ├── jobs
 │   │   │   ├── konto
 │   │   │   ├── release-notes
 │   │   │   └── security
 │   │   └── pricing
 │   ├── (login)
 │   │   ├── sign-in
 │   │   └── sign-up
 │   ├── api  # Next.js API routes for server-side logic. Examples: Routes for Stripe Checkout, settings (fileSystem), and other backend functionalities.
 │   │   ├── ai                 # ai inference handling
 │   │   │   ├── aisdk
 │   │   │   ├── gem
 │   │   │   │   ├── custom
 │   │   │   │   └── stream
 │   │   │   ├── query
 │   │   │   ├── test-settings
 │   │   │   └── uniinfer
 │   │   │       └── stream
 │   │   ├── fs                 # filesystem handling
 │   │   │   ├── delete
 │   │   │   ├── index
 │   │   │   ├── metadata
 │   │   │   ├── mkdir
 │   │   │   ├── read
 │   │   │   ├── rename
 │   │   │   └── upload
 │   │   ├── project
 │   │   │   └── info
 │   │   ├── settings
 │   │   ├── stripe
 │   │   │   ├── checkout
 │   │   │   └── webhook
 │   │   ├── team
 │   │   ├── user
 │   │   └── worker             # remote worker services enqueueing. ocr, fs indexing, etc...
 │   │       ├── debug
 │   │       ├── jobs
 │   │       │   ├── [jobId]
 │   │       │   │   └── callback
 │   │       │   └── callback_generic
 │   │       ├── list
 │   │       ├── settings
 │   │       ├── status
 │   │       └── test-store
 │   └── components
 ├── components  # Reusable UI components, such as app-sidebar.tsx, card-section.tsx, and other shadcn/ui-based components. Also includes context-related providers (e.g., SelectedProjectProvider).
 │   ├── ai
 │   ├── customized
 │   │   └── select
 │   └── ui
 ├── context
 ├── data
 ├── docs  # Documentation on architecture, design system, filesystem standards, and product requirements. Files like appStructure.md, styleguide.md, and fs_oped.md are stored here.
 │   └── examplecode
 ├── hooks  # Custom React hooks, e.g., use-mobile for detecting mobile devices.
 ├── lib  # Shared logic and utility functions. Database access (using Drizzle ORM), Stripe integration, authentication, and helper functions (e.g., in utils).
 │   ├── ai
 │   ├── auth
 │   ├── db
 │   │   ├── migrations
 │   │   │   └── meta
 │   │   └── schema
 │   ├── fs
 │   └── payments
 ├── node_modules
 ├── prompts
 ├── public  # Static assets (images, fonts, etc.) for the application.
 ├── src
 │   └── types
 ├── tests
 ├── tmp
 └── types
```

This structure organizes the codebase for maintainability, with `app/` handling routing, `lib/` for business logic, and `docs/` for project docs.

### Application Areas

#### Dashboard

- **app/(dashboard)/**: Contains applications for logged-in users. Subfolders like `dashboard/aauswahl/` (project selection), `dashboard/vault/` (file browser), and other modules. Layouts and pages are modularly divided for reusability and consistent navigation.

#### Login & Authentication

- **app/(login)/**: Contains login, registration, and security pages. Actions and server actions secured by local middleware.

### Best Practices

- **Component Reusability:** All reusable components are in the `components/` folder.
- **Modular Page Architecture:** Pages are logically separated (e.g., Dashboard, Login) and use shared layouts.
- **API Routes:** Server-side logic is clearly separated in `api/` to ensure clear interfaces between client and server.

## Developing

The user runs the app with `pnpm dev` and can test or review the webapp on request.
