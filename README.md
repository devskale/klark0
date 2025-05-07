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

## Standardzugangsdaten

- Benutzer: `admin@klark0.de`
- Passwort: `admin123`

## Produktivbetrieb

Für den Produktiveinsatz empfehlen wir eine Bereitstellung auf [Vercel](https://vercel.com/) oder einer ähnlichen Plattform. Stellen Sie sicher, dass alle erforderlichen Umgebungsvariablen für die Produktionsumgebung gesetzt sind.

## Versionierung

v0.0 initiale Version in deutsch. Boilperplate webapp mit Basis Layout und Design.
