# Klark0 - WebApp für sicheres digitales Vergabe Auditing

Klark0 ist eine moderne Webanwendung für sicheres digitales Vergabe Auditing, entwickelt mit **Next.js**. Die Anwendung bietet eine sichere Plattform für Vergabeverfahren mit integrierter Authentifizierung und Benutzerverwaltung.

## Features

- Sichere Benutzerauthentifizierung mit JWT
- Rollenbasierte Zugriffskontrolle (RBAC) für Auditoren und Administratoren
- Dokumentenmanagement für Vergabeverfahren
- Audit-Trail für alle Benutzeraktionen
- Integrierte Berichtsfunktionen
- Benutzerfreundliche Oberfläche mit modernem Design

## Einstellungen

### Admin

Dateisystem
Lokales Dateisystem
Klark0FS
OCI Bucket

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Datenbank**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

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

## Versionierung

v0.0 initiale Version in deutsch. Boilperplate webapp mit Basis Layout und Design.

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

## API: Dateisystem-Operationen

Klark0 stellt REST-Endpunkte unter `/api/fs/*` zur Verfügung, um Dateien per WebDAV zu verwalten. Alle Endpunkte erwarten die Query-Parameter `host`, `username`, `password` und optional `type` (Standard: `webdav`).

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

**Endpunkte:**

- `GET /api/fs`  
  List directory contents via WebDAV PROPFIND

- `GET /api/fs/read`  
  Get file content directly (binary/text) via WebDAV GET

- `POST /api/fs/read`  
  Get file content as JSON (`{ content: string }`)

- `GET /api/fs/metadata`  
  Read JSON metadata sidecar file

- `POST /api/fs/metadata`  
  Write JSON metadata sidecar file

- `POST /api/fs/mkdir`  
  Create new directory

- `POST /api/fs/delete`  
  Delete file or directory

- `POST /api/fs/rename`  
  Rename/move file or directory

- `GET /api/fs/index`  
  Read index file (`.pdf2md_index.json`) via WebDAV GET
- `POST /api/fs/index`  
  Create/update index file (`.pdf2md_index.json`)

- `POST /api/fs/upload`  
  Upload one or multiple files

### Beispiele

```bash
# Verzeichnis auflisten
curl -X GET "http://localhost:3000/api/fs?host=...&username=...&password=...&path=/klark0"

# Datei direkt holen
curl -X GET "http://localhost:3000/api/fs/read?host=...&username=...&password=...&path=/klark0/dokument.md"

# Datei als JSON
curl -X POST "http://localhost:3000/api/fs/read" \
  -H "Content-Type: application/json" \
  -d '{"type":"webdav","host":"...","username":"...","password":"...","path":"/klark0/dokument.md"}'

# Metadaten lesen
curl -X GET "http://localhost:3000/api/fs/metadata?host=...&username=...&password=...&path=/klark0/dokument.json"

# Metadaten schreiben
curl -X POST "http://localhost:3000/api/fs/metadata" \
  -H "Content-Type: application/json" \
  -d '{"type":"webdav","host":"...","username":"...","password":"...","path":"/klark0/dokument.json","metadata":{"titel":"Dokument"}}'
```
