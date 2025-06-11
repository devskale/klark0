# Systemanforderungen Fairgabe Applikation

## Dokumenten Speicher

Unterstützte Datenquellen

- WebDAV
- S3 Kompatibel (todo)
- Weitere auf Anfrage

Anforderungen
100 GB Speicher (min 10GB)

## Strukturierte Datenaufbereitung

Parsing and Data Extraction
Meta Parser pdf2md (von skale.dev) wandelt pdf, bild, office docs in markdown um.

HW Anforderung
Lokaler Server

- Minimal CPU mit 16 GB RAM
  - Unterstützung für docling, marker, tesseract, easyocr
- Optional CPU/GPU mit 20 GB RAM
  - OLMO VLM, LLM Datenaufbereitung

## Anonymisierung

Anforderungen

- CPU mit 8GB RAM
  - BERT basierte Entitätenerkennung
- GPU mit 16GB VRAM
  - LLM basierte lokale Anonymisierung

## Indexing

Framework
