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

The project follows Next.js conventions with directories for routing, components, libraries, and documentation. Below is the current directory tree:

```
.
├── .clinerules/
│   └── klark0.md
├── .env.example
├── .github/
│   └── instructions/
│       └── klark0.instructions.md
├── .gitignore
├── .kilocode/
│   └── rules/
│       └── kontext.one.md
├── .trae/
│   ├── .ignore
│   └── rules/
│       ├── project_rules v1.0.md
│       └── project_rules.md
├── LICENSE
├── PRD.md
├── README.md
├── app/  # App Directory. Contains layout and root layouts for global structuring as well as dynamic routing files (e.g., page.tsx).
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── pricing/
│   │   └── terminal.tsx
│   ├── (login)/
│   │   ├── actions.ts
│   │   ├── login.tsx
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── api/  # Next.js API routes for server-side logic
│   │   ├── ai/                # AI inference handling
│   │   ├── auth/
│   │   ├── fs/                # Filesystem handling
│   │   ├── settings/
│   │   ├── team/
│   │   ├── user/
│   │   └── worker/            # Remote worker services enqueueing
│   ├── components/
│   │   └── FileList.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── not-found.tsx
├── components.json
├── components/  # Reusable UI components
│   ├── BieterCard.tsx
│   ├── UploadDialog.tsx       # Consolidated upload dialog component
│   ├── ai/
│   │   ├── AI2.jsx
│   │   └── AIFeatures.jsx
│   ├── app-sidebar.tsx
│   ├── card-section.tsx
│   ├── customized/
│   │   └── select/
│   └── ui/                    # shadcn/ui components
│       ├── alert.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── breadcrumb.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── command.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── editable-text.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── radio-group.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── sonner.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── tooltip.tsx
│       └── truncated-text.tsx
├── context/
│   └── ProjectContext.tsx
├── data/
├── deploy.sh
├── docs/  # Documentation on architecture, design system, filesystem standards
│   ├── amd1.mooo.com
│   ├── appStructure.md
│   ├── db_guide.md
│   ├── examplecode/
│   │   ├── FilePreview.jsx
│   │   └── markdownpreview.jsx
│   ├── opinionatedFilesystem.md
│   ├── rag-eval/
│   ├── rag-eval.ds-ifs.tuwien.ac.at
│   ├── release-notes.md
│   └── styleguide.md
├── drizzle.config.ts
├── hooks/  # Custom React hooks
│   ├── use-mobile.ts
│   └── use-upload.ts          # Consolidated upload logic hook
├── lib/  # Shared logic and utility functions
│   ├── ai/
│   │   ├── geminiApi.js
│   │   ├── settings.ts
│   │   ├── test-gemini.js
│   │   └── uniinferApi.ts
│   ├── auth/
│   │   ├── middleware.ts
│   │   ├── session.ts
│   │   └── team-context.ts
│   ├── db/
│   │   ├── drizzle.ts
│   │   ├── queries.ts
│   │   ├── schema.ts
│   │   ├── seed.ts
│   │   ├── settings.ts
│   │   └── setup.ts
│   ├── fs/
│   │   ├── abstractFilesystem.ts
│   │   ├── fileTreeUtils.ts
│   │   └── initdir.ts
│   ├── jobsStore.ts
│   ├── kriterien/
│   │   └── persistence.ts
│   ├── payments/
│   │   ├── actions.ts
│   │   └── stripe.ts
│   ├── trim.ts
│   └── utils.ts
├── middleware.ts
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── prompts/
│   └── kriterien_AAB_extrakt.md
├── proxy.js
├── public/  # Static assets (images, fonts, etc.)
├── src/
│   └── types/
│       └── pdfjs.d.ts
├── sys.png
├── system_requirements.md
├── tests/
│   └── curl_test.sh
├── tsconfig.json
└── types/
    ├── kriterien.ts
    └── react-syntax-highlighter.d.ts
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
- **Upload Logic Consolidation:** Use centralized upload hooks (`use-upload.ts`) and reusable dialog components (`UploadDialog.tsx`) to eliminate code duplication.
- **Type Safety:** Maintain strict TypeScript usage throughout the codebase.
- **Error Handling:** Implement comprehensive error handling in all components and hooks.
- **SWR Integration:** Use proper SWR mutation functions for data refreshing (e.g., `mutate()` for file tree updates).

## Recent Improvements

### Upload System Consolidation

- **Unified Upload Hook:** Created `hooks/use-upload.ts` for centralized upload logic with configurable callbacks
- **Reusable Upload Dialog:** Implemented `components/UploadDialog.tsx` for consistent upload UI across the application
- **Code Deduplication:** Eliminated duplicate upload logic from `page.tsx` and other components
- **Enhanced Error Handling:** Improved error states and user feedback in upload processes
- **Type Safety:** Added proper TypeScript interfaces for upload configurations

### Key Components

- **`hooks/use-upload.ts`:** Central hook managing file selection, drag-and-drop, upload progress, and error states
- **`components/UploadDialog.tsx`:** Reusable dialog component with drag-and-drop support and progress indicators
- **`components/BieterCard.tsx`:** Card component for displaying bieter information

## Developing

The user runs the app with `pnpm dev` and monitors webapp continuously. The development server runs on localhost:3000 (auswahl route > http://localhost:3000/dashboard/auswahl).

### Development Guidelines

- Always align with `PRD.md` as the single source of truth for goals, plans, and status
- Develop precisely, document proactively, evolve incrementally
- Enforce coding standards: type safety, modularity, error handling
- Use reusable components and hooks to avoid code duplication
- Ensure proper SWR mutation function usage for data consistency
