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
UI Library: shadcn/ui
Authentication: JWT with session cookies

Middleware:

- Global middleware to protect logged-in routes
- Local middleware to protect Server Actions or validate Zod schemas

Filesystem: Access to documents via filesystem, configured in Einstellungen.

Remote Storage: Support for remote storage via WebDAV (Other options will be implemented later).

## API Routes
List of available FS endpoints for remote filesystem access:
- GET `/api/fs`           : list directory via WebDAV PROPFIND  
- GET `/api/fs/read`      : retrieve file content (binary/text) via WebDAV GET  
- POST `/api/fs/read`     : return file content as JSON (`content`)  
- GET `/api/fs/metadata`  : read metadata sidecar (JSON)  
- POST `/api/fs/metadata` : write metadata sidecar (JSON)  
- POST `/api/fs/mkdir`    : create directory  
- POST `/api/fs/delete`   : delete file or directory  
- POST `/api/fs/rename`   : rename file or directory  
- POST `/api/fs/index`    : update or create index file  
- POST `/api/fs/upload`   : upload file(s)


API routes for accessing AI services:
- api/ai/gem/custom : custom AI service
- api/ai/gem/stream : AI Streaming service 

API Routes for Worker Management

POST /api/worker/jobs : create and start new job
GET /api/worker/jobs : list all jobs (with filtering by type, status, project)
GET /api/worker/jobs/[jobId] : get specific job details and status
DELETE /api/worker/jobs/[jobId] : cancel/stop specific job

Worker System Routes
GET /api/worker/status : get overall worker system status
GET /api/worker/types : list all available worker types and capabilities

Available Worker Types:
- parsing : Document parsing and structure extraction
- anonymization : Data anonymization and privacy protection  
- analysis : AI-based document analysis and criteria extraction
- fakejob : Testing worker with configurable random duration (3-10+ seconds)
