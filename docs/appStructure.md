# Next.js App Struktur Guide für klark0

klark0 ist eine Next.js-Webapplikation für die digitale Prüfung von Ausschreibungsdokumenten. Die folgende Anleitung beschreibt den Aufbau des Projekts und die wichtigsten Ordner.

---

## 1. Hauptordner

- **app/**
  - Verwendet das neue App-Directory von Next.js 13.
  - Unterordner für verschiedene Anwendungsbereiche, z. B. `(dashboard)`, `(login)`, etc.
  - Enthält Layout- und Root-Layouts zur globalen Strukturierung sowie dynamische Routing-Dateien (z. B. `page.tsx`).

- **components/**
  - Wiederverwendbare UI-Komponenten, wie z. B. `app-sidebar.tsx`, `card-section.tsx` und weitere shadcn/ui-basierte Komponenten.
  - Enthält auch kontextbezogene Provider (z.B. `SelectedProjectProvider`).

- **docs/**
  - Dokumentation zu Architektur, Design System, Filesystem-Standards und Produktanforderungen.
  - Dateien wie `appStructure.md`, `styleguide.md` und `fs_oped.md` sind hier abgelegt.

- **hooks/**
  - Eigene React Hooks, z. B. `use-mobile` zur Erkennung mobiler Geräte.

- **lib/**
  - Gemeinsame Logik und Utility-Funktionen.
  - Datenbankzugriff (mittels Drizzle ORM), Stripe-Integration, Authentifizierung, und Hilfsfunktionen (z. B. in `utils`).

- **api/**
  - Next.js API Routen zur Server-seitigen Logik.
  - Beispiele: Routen für Stripe Checkout, Einstellungen (fileSystem) und weitere Backend-Funktionalitäten.

- **public/**
  - Statische Assets (Bilder, Fonts, etc.) für die Applikation.

---

## 2. Anwendungsbereiche

### Dashboard
- **app/(dashboard)/**
  - Enthält die Anwendungen für angemeldete Benutzer.
  - Unterordner wie `dashboard/aauswahl/` (Projektwahl), `dashboard/vault/` (Dateibrowser) und weitere Module.
  - Layouts und Seiten sind modular unterteilt, um Wiederverwendbarkeit und konsistente Navigation zu gewährleisten.

### Login & Authentifizierung
- **app/(login)/**
  - Enthält Login-, Registrierungs- und Sicherheitsseiten.
  - Aktionen und Server Actions, die durch lokale Middleware abgesichert werden.

---

## 3. Architekturentscheidungen
- **Next.js App Directory:** Ermöglicht verbesserte Performance, Server Actions und erweiterte Routing-Funktionen.
- **TypeScript:** Erhöhte Typsicherheit in allen Bereichen.
- **Drizzle ORM & Postgres:** Für typensichere und effiziente Datenbankabfragen.
- **Stripe:** Integrierte Zahlungsabwicklung über API-Routen.
- **shadcn/ui:** Einheitliche und wiederverwendbare UI-Komponenten.
- **JWT mit Session Cookies:** Für Authentifizierung und Autorisierung.
- **Middleware:** Sowohl global als auch lokal, um den Zugriff zu schützen und Eingaben mithilfe von Zod-Schemas zu validieren.
- **Filesystem-Zugriff:** Konfiguration in *Einstellungen*, um Dokumente aus dem Filesystem dynamisch zu laden und zu verarbeiten.

---

## 4. Best Practices
- **Component Reusability:** Alle wiederverwendbaren Komponenten liegen im Ordner `components/`.
- **Modular Page-Architektur:** Seiten sind logisch getrennt (z. B. Dashboard, Login) und verwenden gemeinsame Layouts.
- **API Routen:** Server-seitige Logik ist in `api/` klar getrennt, um klare Schnittstellen zwischen Client und Server zu gewährleisten.
- **Dokumentation:** Alle wichtigen Architekturen und Designentscheidungen werden in `docs/` dokumentiert.

---

Diese Struktur fördert Skalierbarkeit, Wartbarkeit und eine konsistente Benutzeroberfläche in der klark0-Anwendung.
