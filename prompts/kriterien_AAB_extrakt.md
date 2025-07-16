Bitte lese die Allgemeinen Ausschreibungsbedingungen und extrahiere alle relevanten Kriterien in ein JSON-Objekt. Das JSON-Objekt muss exakt dem unten definierten Schema und der Struktur folgen.

**JSON-Schema:**

Das JSON-Objekt muss folgende Haupt-Schlüssel haben: `eignungskriterien`, `zuschlagskriterien`, `subunternehmerregelung`, und `formale_anforderungen`.

**WICHTIG: Verwende EXAKT diese Kategorienamen für `eignungskriterien`. Erfinde KEINE neuen Kategorien oder ändere die Namen. Klassifiziere ALLE extrahierten Kriterien in eine dieser vier vordefinierten Kategorien. Wenn ein Kriterium nicht perfekt passt, platziere es in der am besten geeigneten.

1.  **`eignungskriterien`**: Ein Objekt, das die Eignungskriterien enthält. Dieses Objekt muss die folgenden vier Schlüssel enthalten:
    *   `befugnis`
    *   `berufliche_zuverlaessigkeit`
    *   `technische_leistungsfaehigkeit`
    *   `finanzielle_und_wirtschaftliche_leistungsfaehigkeit`
    *   Jeder dieser Schlüssel enthält ein **Array** von Kriterium-Objekten.

    **Struktur für jedes Kriterium-Objekt:**
    ```json
    {
      "kriterium": "Eine Beschreibung der Anforderung.",
      "nachweise": [
        {
          "dokument": "Name des geforderten Dokuments.",
          "typ": "Erwartete Werte: 'PFLICHT' (Standard, wenn ein Dokument zwingend ist) oder 'ODER' (wenn es eine Alternative darstellt).",
          "gueltigkeit": "Die maximale Gültigkeit des Dokuments (z.B. 'Nicht älter als 6 Monate').",
          "hinweis": "Zusätzliche Hinweise (z.B. für juristische Personen, ausländische Bieter)."
        }
      ]
    }
    ```

2.  **`zuschlagskriterien`**: Ein **Array** von Objekten, das die Kriterien zur Auftragsvergabe beschreibt. **Hinweis**: Falls die Ausschreibung nicht in Lose unterteilt ist, erstelle ein einzelnes Objekt im Array. Setze in diesem Fall `"nummer": null` und verwende als `"bezeichnung"` den allgemeinen Auftragsgegenstand.

    **Struktur für jedes Los-Objekt:**
    ```json
    {
      "los": {
        "nummer": "Nummer des Loses (z.B. 1 oder '2, 3 und 4')",
        "bezeichnung": "Bezeichnung des Loses"
      },
      "prinzip": "Bestbieterprinzip oder Billigstbieterprinzip",
      "kriterien": [
        {
          "name": "Name des Kriteriums (z.B. 'Gesamtpreis')",
          "gewichtung": "Maximal erreichbare Punkte oder Prozent"
        }
      ]
    }
    ```

3.  **`subunternehmerregelung`**: Ein **Array von Strings**. Extrahiere alle Sätze aus dem entsprechenden Abschnitt, die eine explizite Anforderung, ein Gebot oder ein Verbot enthalten (z.B. Formulierungen mit 'muss', 'ist zu', 'darf nicht', 'ist unzulässig').

4.  **`formale_anforderungen`**: Ein **Array von Strings**. Extrahiere alle Sätze aus dem entsprechenden Abschnitt, die eine explizite formale Anforderung an die Angebotsabgabe darstellen (z.B. zu Inhalt, Form, Unterfertigung). Fokussiere auf Gebote und Verbote.

Stelle sicher, dass der gesamte Output ein einziges, valides JSON-Objekt ist.