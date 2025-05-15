# Produktanforderungsdokument (PRD) für klark0

## Produktübersicht

klark0 ist eine Webapplikation für die digitale Prüfung von Ausschreibungsdokumenten (Tender Documents). Die Anwendung unterstützt den gesamten Lebenszyklus eines Ausschreibungsprojekts und fokussiert sich auf Transparenz, Effizienz und Automatisierung in der Vergabeprüfung.

## Hauptfunktionen

- **Ausschreibungsprojekt erstellen**
  - Benutzer können neue Ausschreibungsprojekte anlegen.
- **Dokumente hochladen**
  - Upload von Ausschreibungsdokumenten und Bieterdokumenten.
- **Dokumentkonvertierung**
  - Automatische Umwandlung von hochgeladenen Dokumenten (z. B. DOC, PDF) in Markdown.
- **Automatische Dateiumbenennung**
  - Automatische Umbenennung von Dateien basierend auf einem kurzen zusammenfassenden Titel.
- **Anonymisierung auf Anfrage**
  - Möglichkeit zur Anonymisierung von Dokumenteninhalten, falls erforderlich.
- **Projekt- und Bieterauswahl im Vault**
  - Ermöglicht Benutzern, im Op-Browser (Vault) ein Ausschreibungsprojekt und optional einen Bieter auszuwählen, um diesen Kontext für weitere Aktionen zu übernehmen.

## Benutzerrollen und Szenarien

### Primäre Anwender

- **Ausschreibungsprüfer und -analysten**
  - Erstellen und verwalten Ausschreibungsprojekte.
  - Laden relevante Dokumente hoch und nutzen Tools für die automatische Konvertierung und Umbenennung.
  - Fordern bei Bedarf die Anonymisierung sensibler Daten an.
- **Bieteradministrator**
  - Laden Bieterdokumente hoch, die Teil des Ausschreibungsprozesses sind.

### Nutzer-Storys

- **Projekterstellung**
  - „Als Benutzer möchte ich ein neues Ausschreibungsprojekt erstellen, um den Ausschreibungsprozess digital zu verwalten.“
- **Dokumenten-Upload**
  - „Als Benutzer möchte ich Ausschreibungs- und Bieterdokumente hochladen, um sie in der Webapplikation zu prüfen.“
- **Dokumentkonvertierung**
  - „Als Benutzer möchte ich, dass hochgeladene Dokumente automatisch in Markdown konvertiert werden, um eine einfache und konsistente Darstellung zu gewährleisten.“
- **Automatische Umbenennung**
  - „Als Benutzer möchte ich, dass Dateien automatisch umbenannt werden, sodass nur eine kurze Zusammenfassung als Titel verwendet wird.“
- **Anonymisierung**
  - „Auf Wunsch möchte ich, dass Dokumente anonymisiert werden, um sensible Informationen zu schützen.“
- **Auswahl im Vault**
  - „Als Benutzer möchte ich im Vault ein Ausschreibungsprojekt auswählen, um den Arbeitskontext festzulegen.“
  - „Als Benutzer möchte ich im Vault einen Bieter innerhalb eines Projekts auswählen, um Dokumente eines Bieters zu prüfen.“

## Technische Anforderungen

- **Framework und Sprache**
  - Next.js (TypeScript)
- **Datenbank und ORM**
  - PostgreSQL, Drizzle ORM
- **UI-Komponenten**
  - shadcn/ui
- **Authentifizierung**
  - JWT mit Session-Cookies
- **Zahlungsabwicklung**
  - Stripe Integration
- **Middleware**
  - Globale & lokale Middleware zur Absicherung und Validierung (z. B. Zod-Schemas)
- **Dateisystemzugriff**
  - Konfiguration und Zugriff auf Dokumente via Filesystem (Einstellungen)
  - **Dateisynchronisation**
    - WebDAV als primäres Synchronisationsprotokoll
    - Unterstützung für Ausschreibungsunterlagen und Bieterunterlagen
    - Remote-Verarbeitung durch externe Prozessoren
    - Automatischer Upload verarbeiteter Dokumente

## Nicht-funktionale Anforderungen

- **Performance**
  - Schnelle Ladezeiten und optimierte SSR (Server-Side Rendering) für eine reibungslose Benutzererfahrung.
- **Sicherheit**
  - Sichere Authentifizierung, verschlüsselte Kommunikation und Schutz sensibler Daten (einschließlich Dokumentenanonymisierung).
- **Skalierbarkeit**
  - Modularer Aufbau, der zukünftige Erweiterungen und Integrationen (z. B. weitere Dateiformate) ermöglicht.
- **Barrierefreiheit**
  - Umsetzung von Accessibility-Standards innerhalb der UI-Komponenten.
- **Internationalisierung**
  - Hauptsprache Deutsch; Möglichkeit zur Erweiterung um weitere Sprachen bei Bedarf.

## Zielsetzung und Erfolgskriterien

- **Benutzerakzeptanz**
  - Einfache Bedienbarkeit und schnelle Einarbeitung in das System.
- **Effizienz**
  - Reduktion manueller Prüfungs- und Umbenennungsprozesse durch Automatisierung.
- **Sicherheitsverbesserung**
  - Effektiver Schutz sensibler Daten durch optionale Anonymisierungsfunktionen.
- **Zuverlässigkeit**
  - Hohe Verfügbarkeit und konsistente Leistung auch bei hohen Benutzerzahlen.

## Zeitplan und Meilensteine

1. **Konzeptphase**
   - Erstellung des PRD und der Architektur-Dokumentation.
2. **Implementierungsphase**
   - Aufbau des Grundgerüsts mit Next.js, Authentifizierung, und erste UI-Komponenten.
   - Integration der Dateisystemverwaltung und Upload-Funktionalitäten.
3. **Testphase**
   - Funktionstests, Sicherheitstests und Performanceoptimierung.
4. **Launch und Monitoring**
   - Produktionsstart und kontinuierliche Analyse der Systemleistung und Benutzerfeedback.

## Zusammenfassung

klark0 zielt darauf ab, den manuellen Aufwand in Ausschreibungsprojekten zu minimieren, indem es den gesamten Prozess – von der Projekterstellung über den automatisierten Dokumenten-Upload und -konvertierung bis hin zur Anonymisierung – digitalisiert und automatisiert. Diese Lösungen verbessern die Effizienz und Sicherheit in der Vergabeprüfung erheblich.
