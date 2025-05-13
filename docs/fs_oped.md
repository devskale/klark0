# Opinionated Filesystem Structure

## Supported Filetypes
- pdf (Textbasiert oder als Scan)
- Office-Dokumente (docx, xlsx, pptx)
- txt
- Bilder (jpg, jpeg, png)

## Reserved Directory Names
- **md**: Für ein Verzeichnis, das Markdown-Dateien enthält.
- **proc**: Enthält verarbeitete Versionen von Dokumenten.
- **archive**: Reserviert für ein Verzeichnis mit archivierten Projekten.

## Reserved Filenames
- **md/filename_PROCESSOR.md**: Datei, die die in Markdown konvertierte Version des Quelldokuments enthält. *PROCESSOR* steht für den verwendeten Konverter (z.B. docling, ocr, pdfplumber, ...).
- **md/filename/.**: Ein spezielles Unterverzeichnis, das extrahierte Inhalte (wie md, jpg, json) aus Quelldokumenten enthält.
- **PROJEKTNAME/PROJEKTNAME.md**
  - Enthält automatisch extrahierte Informationen von *PROJEKTNAME*.
- **PROJEKTNAME/PROJEKTNAME.json**
  - Enthält Informationen über das Projekt und zugehörige Dokumente.

## Top Level
Beinhaltet die aktuellen aktiven Ausschreibungsverzeichnisse (Projektordner):

- **Ausschreibungsname**
  - **A** (enthält Ausschreibungsdokumente)
    - **md** (enthält Markdown-Versionen der Ausschreibungsdokumente)
  - **B** (Bieterverzeichnisse)
    - **BIETERA** (enthält Bieterdokumente)
       - **md/** (enthält Markdown-Versionen der Bieterdokumente; unterstützte Dateitypen siehe "Supported Filetypes")

