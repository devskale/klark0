# Release Notes for fairgabe.app

## Version 0.0.2
**Veröffentlichungsdatum:** Januar 2025

### KI-Funktionen & Technische Verbesserungen
- **Kontextlängen-Management**: Konfigurierbare maximale Kontextlängen für KI-Prompts implementiert (10.000 Zeichen für `dinfo`, 500.000 Zeichen für `ainfo`).
- **Dynamische Prompt-Auswahl**: KI-Prompts werden nun basierend auf dem Dokumenttyp (`Bieterdokumente` vs. `Ausschreibungsdokumente`) dynamisch ausgewählt.
- **Prompt-Integration**: `KRITERIEN_EXTRAKTION` Query wurde in die AI-Konfiguration integriert, inklusive JSON-Schema-Validierung und erhöhten Token-Limits.
- **UI-Visualisierung**: Kriterienliste aus KI-Antworten wird in `ainfo/kriterien.tsx` dargestellt, inklusive Markdown-Viewer und AI-Extraktions-Workflow.
- **Persistenz**: Kriterienlisten können nun im Dateisystem gespeichert werden (`kriterien.meta.json`) mit SWR-Integration für automatisches Laden.
- **Stripe-Integration**: Zahlungspläne und Checkout wurden eingerichtet.

**Hinweise:**
Diese Version konzentriert sich auf die Optimierung der KI-Integration mit verbessertem Kontextmanagement und präziseren Dokumentenanalysefunktionen.

## Version 0.0.1
**Release Date:** June 27, 2025

### Initial Release
- Launched fairgabe.app with core functionality.
- Basic dashboard and tools setup.
- Initial user authentication and team management features.

**Notes:**
This is the first version of fairgabe.app, focusing on establishing the foundational features for user interaction and basic operations.
