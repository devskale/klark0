import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Define available worker types with their capabilities
    const workerTypes = [
      {
        id: "parsing",
        name: "StruktText",
        description:
          "Konvertiert alle Projektdokumente in strukturierte Textformate, die als Basis für weitere Analysen dienen.",
        category: "document-processing",
        estimatedDuration: "2-5 Minuten",
        inputTypes: ["pdf", "docx", "txt"],
        outputTypes: ["json", "txt"],
        capabilities: [
          "Text extraction",
          "Structure recognition",
          "Metadata extraction",
        ],
        status: "available",
      },
      {
        id: "anonymization",
        name: "Anonymisierung",
        description:
          "Entfernt oder maskiert persönliche und sensible Daten aus Dokumenten.",
        category: "data-protection",
        estimatedDuration: "1-3 Minuten",
        inputTypes: ["pdf", "docx", "txt", "json"],
        outputTypes: ["pdf", "docx", "txt", "json"],
        capabilities: ["PII detection", "Data masking", "Privacy compliance"],
        status: "available",
      },
      {
        id: "analysis",
        name: "KI-Analyse",
        description:
          "Führt tiefgreifende KI-basierte Analysen der Ausschreibungsdokumente durch.",
        category: "ai-analysis",
        estimatedDuration: "10-60 Minuten",
        inputTypes: ["json", "txt", "pdf"],
        outputTypes: ["json", "report"],
        capabilities: [
          "Content analysis",
          "Risk assessment",
          "Compliance checking",
          "Criteria extraction",
        ],
        status: "available",
      },
      {
        id: "fakejob",
        name: "FAKEJOB",
        description:
          "Test-Worker für Entwicklung und Debugging. Läuft zufällig zwischen 3 und konfigurierbaren Sekunden.",
        category: "testing",
        estimatedDuration: "3-10 Sekunden",
        inputTypes: ["any"],
        outputTypes: ["json"],
        capabilities: [
          "Random execution time",
          "Configurable duration",
          "Development testing",
        ],
        status: "available",
        parameters: {
          maxDuration: {
            type: "number",
            default: 10,
            min: 3,
            max: 60,
            description: "Maximale Laufzeit in Sekunden",
          },
        },
      },
    ];

    // Check worker system health (simplified for now)
    const systemStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      totalWorkers: workerTypes.length,
      availableWorkers: workerTypes.filter((w) => w.status === "available")
        .length,
    };

    // Extract only the IDs from the workerTypes and format as requested
    const tasks = workerTypes.map((worker) => ({ id: worker.id }));

    return NextResponse.json({
      tasks,
    });
  } catch (error) {
    console.error("Error fetching worker types:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Fehler beim Abrufen der Worker-Typen",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}
