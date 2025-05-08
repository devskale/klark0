"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function aauswahl() {
  const { data: settings, error } = useSWR("/api/settings?key=fileSystem", fetcher);

  if (error) {
    return <p>Fehler beim Laden der Einstellungen.</p>;
  }

  if (!settings) {
    return <p>Einstellungen werden geladen...</p>;
  }

  const selectedFilesystem = settings.type || "unknown";
  const projects = [
    "Project Alpha",
    "Project Beta",
    "Project Gamma",
    "Project Delta",
    "Project Epsilon",
  ];

  return (
    <div>
      <h1>Vergabeprojekt Auswahl</h1>
      <p>Filesystem: {selectedFilesystem}</p>
      {selectedFilesystem === "proto" ? (
        <ul>
          {projects.map((project, index) => (
            <li key={index}>{project}</li>
          ))}
        </ul>
      ) : (
        <p>Unsupported filesystem selected.</p>
      )}
    </div>
  );
}
