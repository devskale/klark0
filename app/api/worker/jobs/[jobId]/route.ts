import { NextRequest, NextResponse } from "next/server";
// import { jobStore, Job } from "@/lib/jobsStore"; // No longer needed
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";
import { getDocumentParserSettings } from "@/lib/db/settings";

async function handleGetRequest(
  request: RequestWithTeam,
  context: { params: Promise<{ jobId: string }> }
) {
  const params = await context.params;
  try {
    const jobId = params.jobId;
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Job-ID ist erforderlich" },
        { status: 400 }
      );
    }

    if (!request.teamId) {
      return NextResponse.json(
        { error: "Team context required." },
        { status: 401 }
      );
    }

    const parserSettings = await getDocumentParserSettings(request.teamId);

    if (!parserSettings?.parserUrl) {
      return NextResponse.json(
        { error: "Parser URL not configured." },
        { status: 500 }
      );
    }

    // The jobId here is expected to be the ID from the external parser
    const externalUrl = `${parserSettings.parserUrl.replace(
      /\/$/,
      ""
    )}/api/worker/jobs/${jobId}`;

    console.log(`GET [jobId] Proxy: Forwarding request to ${externalUrl}`);

    const response = await fetch(externalUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "klark0-webapp/1.0",
        // Add auth headers if needed for the external parser
      },
      signal: AbortSignal.timeout(15000), // 15-second timeout
    });

    const responseBodyText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseBodyText);
    } catch (e) {
      console.error("GET [jobId] Proxy: External response was not valid JSON:", responseBodyText);
      return NextResponse.json(
        { error: "External parser returned non-JSON response", details: responseBodyText },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData, { status: response.status });

  } catch (error) {
    console.error("GET [jobId] Proxy: Error forwarding request:", error);
    const jobId = (await context.params)?.jobId || "unknown";
    return NextResponse.json(
      {
        success: false,
        error: `Fehler beim Weiterleiten der GET-Anfrage für Job ${jobId}.`,
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: RequestWithTeam,
  context: { params: Promise<{ jobId: string }> }
) {
  const params = await context.params;
  try {
    const jobId = params.jobId;
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Job-ID ist erforderlich" },
        { status: 400 }
      );
    }

    if (!request.teamId) {
      return NextResponse.json(
        { error: "Team context required." },
        { status: 401 }
      );
    }

    const parserSettings = await getDocumentParserSettings(request.teamId);

    if (!parserSettings?.parserUrl) {
      return NextResponse.json(
        { error: "Parser URL not configured." },
        { status: 500 }
      );
    }

    // The jobId here is expected to be the ID from the external parser
    const externalUrl = `${parserSettings.parserUrl.replace(
      /\/$/,
      ""
    )}/api/worker/jobs/${jobId}`;

    console.log(`DELETE [jobId] Proxy: Forwarding request to ${externalUrl}`);

    const response = await fetch(externalUrl, {
      method: "DELETE",
      headers: {
        "User-Agent": "klark0-webapp/1.0",
        // Add auth headers if needed for the external parser
      },
      signal: AbortSignal.timeout(15000), // 15-second timeout
    });

    // Check if the response has content before trying to parse JSON
    // DELETE requests might return 204 No Content or a JSON body
    if (response.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const responseBodyText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseBodyText);
    } catch (e) {
      console.error("DELETE [jobId] Proxy: External response was not valid JSON:", responseBodyText);
      return NextResponse.json(
        { error: "External parser returned non-JSON response for DELETE", details: responseBodyText },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData, { status: response.status });

  } catch (error) {
    console.error("DELETE [jobId] Proxy: Error forwarding request:", error);
    const jobId = (await context.params)?.jobId || "unknown";
    return NextResponse.json(
      {
        success: false,
        error: `Fehler beim Weiterleiten der DELETE-Anfrage für Job ${jobId}.`,
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}

export const GET = withTeamContext(handleGetRequest);
