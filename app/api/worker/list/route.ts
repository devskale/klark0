import { NextRequest, NextResponse } from "next/server";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";
import { getDocumentParserSettings } from "@/lib/db/settings";

async function handleWorkerListRequest(request: RequestWithTeam) {
  if (!request.teamId) {
    return NextResponse.json(
      { error: "Team context required." },
      { status: 401 }
    );
  }

  try {
    // Get document parser settings to find the parser URL
    const parserSettings = await getDocumentParserSettings(request.teamId);

    if (!parserSettings?.parserUrl) {
      console.warn("Parser URL not configured, returning empty list");
      return NextResponse.json({
        tasks: [],
        error:
          "Parser URL nicht konfiguriert. Bitte konfigurieren Sie die Einstellungen unter 'Dokument Parser'.",
      });
    }

    // Construct the external API URL
    const externalApiUrl = `${parserSettings.parserUrl.replace(
      /\/$/,
      ""
    )}/api/worker/list`;
    console.log("Fetching worker list from:", externalApiUrl);

    try {
      // Fetch the worker list from the external parser service
      const response = await fetch(externalApiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "klark0-webapp/1.0",
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        console.error(
          `External API error: ${response.status} ${response.statusText}`
        );
        throw new Error(
          `External API returned ${response.status}: ${response.statusText}`
        );
      }

      const externalData = await response.json();
      console.log("External API response:", externalData);

      // Forward the response from the external service
      // Ensure it has the expected format
      if (externalData && typeof externalData === "object") {
        return NextResponse.json(externalData);
      } else {
        throw new Error("Invalid response format from external API");
      }
    } catch (fetchError) {
      console.error("Error fetching from external API:", fetchError);

      // Fallback to dummy data if external service is unavailable
      console.log("Falling back to dummy worker types");
      const fallbackWorkerTypes = [
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
          status: "unavailable", // Mark as unavailable since external service failed
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
          status: "unavailable",
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
          status: "unavailable",
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
          status: "unavailable",
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

      // Return fallback data with error information
      const tasks = fallbackWorkerTypes.map((worker) => ({ id: worker.id }));

      return NextResponse.json({
        tasks,
        error: `Externe Worker-API nicht erreichbar: ${
          fetchError instanceof Error ? fetchError.message : String(fetchError)
        }`,
        fallback: true,
      });
    }
  } catch (error) {
    console.error("Error in worker list handler:", error);

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

export const GET = withTeamContext(handleWorkerListRequest);
