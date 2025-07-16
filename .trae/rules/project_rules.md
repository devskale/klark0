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
 ├── app 
 │   ├── (dashboard) 
 │   │   ├── dashboard 
 │   │   │   ├── activity 
 │   │   │   ├── afreigabe 
 │   │   │   ├── ainfo 
 │   │   │   ├── atools 
 │   │   │   ├── auswahl 
 │   │   │   ├── binfo 
 │   │   │   ├── btools 
 │   │   │   ├── dinfo 
 │   │   │   ├── dtools 
 │   │   │   ├── einstellungen 
 │   │   │   ├── general 
 │   │   │   ├── jobs 
 │   │   │   ├── konto 
 │   │   │   ├── release-notes 
 │   │   │   └── security 
 │   │   └── pricing 
 │   ├── (login) 
 │   │   ├── sign-in 
 │   │   └── sign-up 
 │   ├── api 
 │   │   ├── ai 
 │   │   │   ├── aisdk 
 │   │   │   ├── gem 
 │   │   │   │   ├── custom 
 │   │   │   │   └── stream 
 │   │   │   ├── query 
 │   │   │   ├── test-settings 
 │   │   │   └── uniinfer 
 │   │   │       └── stream 
 │   │   ├── fs 
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
 │   │   └── worker 
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
 ├── components 
 │   ├── ai 
 │   ├── customized 
 │   │   └── select 
 │   └── ui 
 ├── context 
 ├── data 
 ├── docs 
 │   └── examplecode 
 ├── hooks 
 ├── lib 
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
 ├── public 
 ├── src 
 │   └── types 
 ├── tests 
 ├── tmp 
 └── types
```

This structure organizes the codebase for maintainability, with `app/` handling routing, `lib/` for business logic, and `docs/` for project docs.

## Developing

The user runs the app with `pnpm dev` and can test or review the webapp on request.
