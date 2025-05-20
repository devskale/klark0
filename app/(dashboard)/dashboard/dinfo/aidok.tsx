import React, { useState, useEffect } from "react";

export default function Aidok() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [kiSettings, setKiSettings] = useState<{ kiFramework: string } | null>(null);

  // load saved KI Einstellungen
  useEffect(() => {
    fetch("/api/settings?key=kiEinstellungen")
      .then((res) => res.json())
      .then(setKiSettings);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kiSettings) return;
    setResponse("");
    setStreaming(true);

    const res = await fetch("/api/ai/gem/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queryType: "COMPREHENSIVE", context: query }),
    });
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setResponse((prev) => prev + decoder.decode(value));
      }
    }

    setStreaming(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">KI Anfrage</h2>
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div>
          <label className="mr-2 font-medium">Framework:</label>
          <select value={kiSettings?.kiFramework || ""} disabled className="border px-2 py-1">
            <option value={kiSettings?.kiFramework}>
              {kiSettings?.kiFramework || "lade..."}
            </option>
          </select>
        </div>
        <textarea
          rows={4}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Geben Sie Ihre Anfrage ein..."
          className="w-full border rounded p-2"
        />
        <button
          type="submit"
          disabled={streaming || !query}
          className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {streaming ? "Streaming..." : "Absenden"}
        </button>
      </form>
      <div className="border rounded p-2 h-64 overflow-auto whitespace-pre-wrap">
        {response || (streaming ? "Warte auf Antwort..." : "Hier erscheint die Antwort")}
      </div>
    </div>
  );
}
