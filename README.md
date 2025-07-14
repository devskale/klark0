# Kontext1 - WebApp für sicheres digitales Vergabe Auditing

Kontext1 ist eine moderne Webanwendung für sicheres digitales Vergabe Auditing, entwickelt mit **Next.js**. Die Anwendung bietet eine sichere Plattform für Vergabeverfahren mit integrierter Authentifizierung und Benutzerverwaltung.

## Scope

Build Kontext1, a webapp for tender document auditing. Webapp language is German.

## Features

- Sichere Benutzerauthentifizierung mit JWT
- Rollenbasierte Zugriffskontrolle (RBAC) für Auditoren und Administratoren
- Dokumentenmanagement für Vergabeverfahren
- Audit-Trail für alle Benutzeraktionen
- Integrierte Berichtsfunktionen
- Benutzerfreundliche Oberfläche mit modernem Design
- AI-gestützte Dokumentenanalyse mit automatischer Metadatenextraktion
- Automatische AAB-PDF-Dokumentenerkennung und Parser-Auswahl
- Strukturierte Dokumentenverarbeitung mit Markdown-Konvertierung

## Einstellungen

### Admin

Dateisystem
Lokales Dateisystem
Klark0FS
OCI Bucket

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: TypeScript
- **State Management**: SWR
- **Datenbank**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)
- **Payments**: Stripe
- **Authentication**: JWT with session cookies

## User Authentication and Roles

Klark0 implements a secure user authentication system with role-based access control to manage permissions effectively:

- **Authentication System**:

  - Uses JSON Web Tokens (JWT) with session cookies for secure user authentication.
  - Session cookies are set with a 1-day expiration, containing encrypted user ID information.
  - Passwords are hashed using `bcryptjs` for secure storage.
  - Middleware protects routes by validating user sessions.

- **Role System**:

  - Two primary roles are defined: 'member' (default for new users) and 'owner' (higher privilege).
  - Roles are managed at both global (user) and team-specific levels, allowing users to have different roles within different teams.
  - 'Owner' role typically has administrative privileges, such as inviting team members or managing settings.

- **Team Structure**:

  - Users belong to teams, which are the primary unit for collaboration.
  - Team names are set during creation as `${email}'s Team` by default, based on the creator's email.
  - Team-specific roles enable nuanced permission management within team contexts.

- **Activity Logging**:
  - User actions (sign-in, sign-up, team management) are logged for audit purposes, linked to specific users and teams.

## Middleware

- Global middleware to protect logged-in routes
- Local middleware to protect Server Actions or validate Zod schemas

## Filesystem

Access to documents via filesystem, configured in Einstellungen.

## Remote Storage

Support for remote storage via WebDAV (Other options will be implemented later).

## Installation

1. Repository klonen:

```bash
git clone https://github.com/your-repo/klark0.git
cd klark0
```

2. Abhängigkeiten installieren:

```bash
pnpm install
```

3. Umgebung konfigurieren:

```bash
pnpm db:setup
```

4. Datenbank migrieren:

```bash
pnpm db:migrate
pnpm db:seed
```

5. Entwicklungsserver starten:

```bash
pnpm dev
```

Die Anwendung ist dann unter [http://localhost:3000](http://localhost:3000) erreichbar.

## Datenbankschema anpassen

Um das Datenbankschema zu ändern (z.B. neue Tabellen hinzufügen oder bestehende Tabellen modifizieren), sind folgende Schritte notwendig:

1.  **Schema-Datei bearbeiten**:
    Öffnen Sie die Datei `lib/db/schema.ts`. Hier können Sie neue Tabellen definieren oder bestehende anpassen. Verwenden Sie die von `drizzle-orm/pg-core` bereitgestellten Funktionen wie `pgTable`, `serial`, `varchar`, `text`, `timestamp`, `integer` etc.

    Beispiel für eine neue Tabelle:

    ```typescript
    export const newTable = pgTable("new_table", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      createdAt: timestamp("created_at").notNull().defaultNow(),
    });
    ```

2.  **Relationen definieren (optional)**:
    Wenn Ihre neue Tabelle Beziehungen zu anderen Tabellen hat, definieren Sie diese im unteren Teil der `lib/db/schema.ts` Datei mittels der `relations` Funktion von Drizzle ORM.

    Beispiel:

    ```typescript
    export const newTableRelations = relations(newTable, ({ one, many }) => ({
      // Beispiel: Beziehung zu 'users'
      // user: one(users, {
      //   fields: [newTable.userId],
      //   references: [users.id],
      // }),
    }));
    ```

3.  **Typen exportieren**:
    Fügen Sie Typ-Exporte für Ihre neue Tabelle hinzu, um TypeScript-Unterstützung zu gewährleisten:

    ```typescript
    export type NewTableType = typeof newTable.$inferSelect; // für Lesezugriffe
    export type NewNewTableType = typeof newTable.$inferInsert; // für Schreibzugriffe
    ```

4.  **Migration generieren**:
    Nachdem Sie die Änderungen in `lib/db/schema.ts` gespeichert haben, öffnen Sie Ihr Terminal und führen Sie folgenden Befehl aus, um die Migrationsdateien zu generieren:

    ```bash
    pnpm db:generate
    ```

    Dieser Befehl analysiert die Änderungen in Ihrem Schema und erstellt die notwendigen SQL-Skripte im `drizzle`-Ordner.

5.  **Migration anwenden**:
    Um die generierten Migrationen auf Ihre Datenbank anzuwenden, führen Sie folgenden Befehl aus:
    ```bash
    pnpm db:migrate
    ```
    Dieser Befehl führt die SQL-Skripte aus und aktualisiert Ihre Datenbankstruktur.

Stellen Sie sicher, dass Ihre Datenbankverbindung korrekt konfiguriert ist (in der Regel über Umgebungsvariablen wie `POSTGRES_URL` in Ihrer `.env` Datei), bevor Sie die Migrationsbefehle ausführen.

## Standardzugangsdaten

- Benutzer: `admin@klark0.de`
- Passwort: `admin123`

## Produktivbetrieb

Für den Produktiveinsatz empfehlen wir eine Bereitstellung auf [Vercel](https://vercel.com/) oder einer ähnlichen Plattform. Stellen Sie sicher, dass alle erforderlichen Umgebungsvariablen für die Produktionsumgebung gesetzt sind.

## AI-gestützte Dokumentenanalyse

### Ausschreibungsprojekt-Info (ainfo)

Die ainfo-Komponente bietet intelligente Analyse von Ausschreibungsdokumenten:

- **Automatische AAB-PDF-Erkennung**: Erkennt und wählt automatisch AAB (Ausschreibungsbekanntmachung) PDF-Dokumente aus dem Projektverzeichnis
- **Parser-Integration**: Nutzt den Standard-Parser zur Konvertierung von PDF zu Markdown für bessere AI-Analyse
- **Metadaten-Extraktion**: Extrahiert automatisch Projektinformationen wie:
  - Vergabestelle und Adresse
  - Projektname und Beschreibung
  - Start-, Bieterabgabe- und Enddatum
- **Strukt-Anzeige**: Zeigt verfügbare Parser und den aktiven Standard-Parser an
- **AI-Streaming**: Nutzt Gemini AI für Echtzeit-Analyse mit Stream-Verarbeitung
- **Metadaten-Persistierung**: Speichert extrahierte Informationen in JSON-Sidecar-Dateien

### Verwendung

1. Navigieren Sie zu einem Ausschreibungsprojekt
2. Klicken Sie auf "Init" um die AI-Analyse zu starten
3. Die AI analysiert das AAB-Dokument über den Standard-Parser
4. Extrahierte Metadaten werden automatisch in die Felder eingetragen
5. Speichern Sie die Informationen mit "Speichern"

## Versionierung

v0.0 initiale Version in deutsch. Boilperplate webapp mit Basis Layout und Design.
v0.1 AI-gestützte Dokumentenanalyse für Ausschreibungsprojekte hinzugefügt.

## Opinionated Filesystem

Dateiordnersystem

ORDNERNAME: Im Root Ordner ist es ein Ordner eine Ausschreibung - ausschreibung.json - holds info about the ausschreibungs project - Datum, Status, etc - A: hält die unterschiedlichen Vergabe/Ausschreibungs Dokumente
md: kann md ordner enthalten mit markdown versionen der dokumente - B: Hält die unterschiedlichen Bieterordner - BIETERORDNER: Ordner für Bieterdokumente - md: kann md ordner enthalten mit markdown versionen der dokumente

archiv: Ordner, reservierte für archivierte projekte
.NAME: versteckte ordner sind reserviert für system
.processed: reservierter ordner für processed dateien
.md: reservierter ordnername für markdown files
md: reservierter ordnername der markdown files enthält

Dateiendungen
.md: Markdown Files

## Abstracted Filesystem Layer

Um die opinionated Dateistruktur zu abstrahieren, wurde eine Middleware-Schicht entwickelt, die zwischen den physischen Dateien/Ordnern und ihrer logischen Darstellung vermittelt. Diese Schicht:

- Filtert Elemente, die als _hidden_ oder _noshow_ markiert sind (z.B. Ordner, beginnend mit einem Punkt oder explizit in der Konfiguration ausgeschlossen),
- Zeigt nur _show_-Elemente an,
- Fügt Metadaten wie Erstellungs- und Änderungsdaten sowie Dateigrößen hinzu.

Diese Abstraktion ermöglicht eine einheitliche API und eine flexible Darstellung des Dateisystems.

## API Routes

Klark0 stellt REST-Endpunkte unter `/api/fs/*` zur Verfügung, um Dateien per WebDAV zu verwalten. Alle Endpunkte verwenden die WebDAV-Konfiguration aus der Datenbank (Einstellungen-Seite) und sind team-aware. Authentifizierung erfolgt über die Session des angemeldeten Benutzers.

The metadata endpoints (`/api/fs/metadata`) provide functionality to manage JSON sidecar files that store additional information about documents:

- `GET /api/fs/metadata`: Reads metadata from a JSON sidecar file (filename.json for filename.ext)
- `POST /api/fs/metadata`: Writes metadata to a JSON sidecar file

Metadata files contain structured information about documents like:

- Document title and description
- Creation/modification dates
- Document status and workflow state
- Custom tags and categories
- Document relationships
- Audit trail information

List of available FS endpoints for remote filesystem access:

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

API routes for accessing AI services:

- api/ai/gem/custom : custom AI service
- api/ai/gem/stream : AI Streaming service

API Routes for Worker Management:

- POST /api/worker/jobs : create and start new job
- GET /api/worker/jobs : list all jobs (with filtering by type, status, project)
- GET /api/worker/jobs/[jobId] : get specific job details and status
- DELETE /api/worker/jobs/[jobId] : cancel/stop specific job

Worker System Routes:

- GET /api/worker/status : get overall worker system status (implement later)
- GET /api/worker/list : list all available worker types and capabilities

Available Worker Types:

- parsing : Document parsing and structure extraction
- anonymization : Data anonymization and privacy protection
- analysis : AI-based document analysis and criteria extraction
- fakejob : Testing worker with configurable random duration (3-10+ seconds)

### Beispiele

```bash
# Verzeichnis auflisten
curl -X GET "http://localhost:3000/api/fs?path=/klark0" \
  -H "Cookie: session=your_session_cookie"

# Datei direkt holen
curl -X GET "http://localhost:3000/api/fs/read?path=/klark0/dokument.md" \
  -H "Cookie: session=your_session_cookie"

# Datei als JSON
curl -X POST "http://localhost:3000/api/fs/read" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_cookie" \
  -d '{"path":"/klark0/dokument.md"}'

# Metadaten lesen
curl -X GET "http://localhost:3000/api/fs/metadata?path=/klark0/dokument.json" \
  -H "Cookie: session=your_session_cookie"

# Metadaten schreiben
curl -X POST "http://localhost:3000/api/fs/metadata" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_cookie" \
  -d '{"path":"/klark0/dokument.json","metadata":{"titel":"Dokument"}}'

# Datei(en) hochladen
curl -X POST "http://localhost:3000/api/fs/upload?path=/klark0/neuer-ordner/" \
  -H "Cookie: session=your_session_cookie" \
  -F "files=@/pfad/zur/lokalen/datei1.pdf" \
  -F "files=@/pfad/zur/lokalen/datei2.txt"
```

## Frontend Integration Guide

### Filesystem API Integration in React Components

Klark0 verwendet ein sicheres, teambasiertes Dateisystem ohne Credential-Exposition im Frontend. Hier ist eine Anleitung zur Integration der FS-API in React-Komponenten:

#### 1. SWR für Datei-Listing

```tsx
import useSWR from "swr";

// Verzeichnis auflisten
const {
  data: fileList,
  error,
  mutate,
} = useSWR(
  "/klark0/projekt1", // Pfad als SWR-Key
  async (path) => {
    const params = new URLSearchParams({ path });
    const res = await fetch(`/api/fs?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch directory");
    return res.json();
  }
);
```

#### 2. Dateien lesen

```tsx
// Dateiinhalt als Text/Binary (GET)
const fetchFileContent = async (filePath: string) => {
  const params = new URLSearchParams({ path: filePath });
  const res = await fetch(`/api/fs/read?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to read file");
  return res.text(); // oder res.blob() für Binary
};

// Dateiinhalt als JSON (POST)
const fetchFileAsJSON = async (filePath: string) => {
  const res = await fetch("/api/fs/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath }),
  });
  if (!res.ok) throw new Error("Failed to read file");
  return res.json();
};
```

#### 3. Datei-Operationen

```tsx
// Verzeichnis erstellen
const createDirectory = async (dirPath: string) => {
  const res = await fetch("/api/fs/mkdir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: dirPath }),
  });
  if (!res.ok) throw new Error("Failed to create directory");
  return res.json();
};

// Datei löschen
const deleteFile = async (filePath: string) => {
  const res = await fetch("/api/fs/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath }),
  });
  if (!res.ok) throw new Error("Failed to delete file");
  return res.json();
};

// Datei umbenennen
const renameFile = async (oldPath: string, newPath: string) => {
  const res = await fetch("/api/fs/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldPath, newPath }),
  });
  if (!res.ok) throw new Error("Failed to rename file");
  return res.json();
};
```

#### 4. Datei-Upload

```tsx
const uploadFiles = async (targetPath: string, files: FileList) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append("files", file);
  });

  const params = new URLSearchParams({ path: targetPath });
  const res = await fetch(`/api/fs/upload?${params.toString()}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to upload files");
  return res.json();
};
```

#### 5. Metadaten verwalten

```tsx
// Metadaten lesen
const readMetadata = async (filePath: string) => {
  const metadataPath = filePath.replace(/\.[^/.]+$/, ".json"); // .pdf -> .json
  const params = new URLSearchParams({ path: metadataPath });
  const res = await fetch(`/api/fs/metadata?${params.toString()}`);
  if (!res.ok) return null;
  return res.json();
};

// Metadaten schreiben
const writeMetadata = async (filePath: string, metadata: object) => {
  const metadataPath = filePath.replace(/\.[^/.]+$/, ".json");
  const res = await fetch("/api/fs/metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: metadataPath, metadata }),
  });
  if (!res.ok) throw new Error("Failed to write metadata");
  return res.json();
};
```

#### 6. Vollständiges Komponenten-Beispiel

```tsx
import React, { useState } from 'react';
import useSWR from 'swr';

export default function FileManager({ basePath }: { basePath: string }) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Verzeichnis-Listing mit SWR
  const { data: files, error, mutate } = useSWR(
    basePath,
    async (path) => {
      const params = new URLSearchParams({ path });
      const res = await fetch(`/api/fs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch directory');
      return res.json();
    }
  );

  const handleDelete = async (filePath: string) => {
    try {
      await fetch('/api/fs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });
      mutate(); // SWR cache invalidieren
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  if
```


# Revision history
