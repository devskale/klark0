# klark0 Copilot Instructions

## Project Overview

klark0 is a Next.js webapp for auditing tender documents ("Ausschreibungen"). The app is in German and uses TypeScript, SWR for state, Drizzle ORM, Postgres, Stripe payments, and shadcn/ui for UI. Authentication is JWT with session cookies.

## Architecture & Structure

- **App Directory**: Uses Next.js `app/` routing. Dashboard pages are under `app/(dashboard)/dashboard/`.
- **Components**: Reusable UI in `components/`, including custom and shadcn/ui components.
- **Business Logic**: In `lib/` (AI, auth, db, payments, filesystem).
- **State**: SWR is used for all async data fetching and caching.
- **Context**: React context providers in `context/` (e.g., `ProjectContext` for selected document/project state).
- **API Routes**: All server logic in `app/api/`, including filesystem (WebDAV), AI, worker jobs, Stripe, etc.

## Developer Workflow

- **Run Locally**: Use `pnpm dev` to start the app.
- **Database**: Drizzle ORM with migrations in `lib/db/migrations/`.
- **Testing**: Tests are in `tests/` (not always present).
- **Debugging**: Use browser console and Dev Info panels in dashboard pages for runtime state.

## Key Patterns

- **Filesystem API**: Interact with documents via `/api/fs/*` routes. Example:  
  - List: `GET /api/fs?path=/path/to/dir`
  - Read: `POST /api/fs/read` with `{ path }`
  - Metadata: `GET/POST /api/fs/metadata`
- **Document Metadata**: Each document has a `.meta.json` sidecar file for metadata.
- **Indexing**: Directory index files are named `.ofs.index.json`.
- **AI Integration**: AI services via `/api/ai/gem/*` endpoints. Document analysis uses streamed responses.
- **Worker System**: Jobs for parsing, anonymization, analysis, etc. via `/api/worker/jobs`.
- **UI Language**: All UI and docs must be in German.

## Coding Conventions

- **Minimal Repetition**: When suggesting code changes, use `// ...existing code...` for unchanged regions.
- **File Headers**: Always start code blocks with a comment containing the filepath.
- **Component Reusability**: Place reusable components in `components/`.
- **Modular Pages**: Separate dashboard pages by function (see directory tree in klark0.instructions.md).
- **API Usage**: Always use SWR for data fetching in React components.
- **Error Handling**: Show errors in German in the UI.

## Integration Points

- **WebDAV**: Remote document storage via filesystem API.
- **Stripe**: Payments via `/api/stripe/*`.
- **Drizzle**: Database access via `lib/db/`.
- **AI**: Custom and streaming AI endpoints for document analysis.

## Examples

- **Document Info Page**: See `app/(dashboard)/dashboard/dinfo/info.tsx` for patterns in SWR usage, metadata editing, and AI integration.
- **API Route Example**: See `app/api/fs/metadata/route.ts` for metadata handling.

---

_For unclear or missing sections, please provide feedback so instructions can be improved for klark0 contributors._