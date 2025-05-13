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
