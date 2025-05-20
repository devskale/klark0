---
applyTo: '**'
---
Scope: Build klark0, a webapp for tender document auditing. Webapp language is german.

Framework: Next.js

Language: TypeScript

Database: Postgres

ORM: Drizzle

Payments: Stripe

UI Library: shadcn/ui

Authentication: JWT with session cookies

Middleware:

- Global middleware to protect logged-in routes
- Local middleware to protect Server Actions or validate Zod schemas

Filesystem: Access to documents via filesystem, configured in Einstellungen.

## API Routes
List of available FS endpoints:
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
