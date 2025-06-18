import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// import { jobStore, Job } from "@/lib/jobsStore"; // No longer needed for proxy
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";
import { getDocumentParserSettings } from "@/lib/db/settings";

// Zod schema for validating the request body when creating a job (optional, if we want to validate before proxying)
const CreateJobProxySchema = z.object({
  type: z.string(),
  name: z.string(),
  project: z.string().nullable().optional(),
  parameters: z.record(z.any()).optional(),
  // Potentially add other fields that the external parser expects or that this app needs to add
});

async function handleGetRequest(request: RequestWithTeam) {
  try {
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

    // Construct the full URL for the external parser, including query parameters
    const externalUrl = `${parserSettings.parserUrl.replace(
      /\/$/,
      ""
    )}/api/worker/jobs${request.nextUrl.search}`;

    console.log(`GET Proxy: Forwarding request to ${externalUrl}`);

    const response = await fetch(externalUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "klark0-webapp/1.0",
        // Forward any necessary headers from the original request or add auth headers for the parser
        // e.g., if parserSettings contains an apiKey: 'X-API-Key': parserSettings.apiKey
      },
      signal: AbortSignal.timeout(15000), // 15-second timeout for the external request
    });

    // Read the response body as text first to handle potential non-JSON errors
    const responseBodyText = await response.text();

    // Attempt to parse as JSON, but return raw text if it fails
    let responseData;
    try {
      responseData = JSON.parse(responseBodyText);
    } catch (e) {
      console.error("GET Proxy: External response was not valid JSON:", responseBodyText);
      // Return the raw text with the original status code if it's an error
      // Or decide on a specific error format for non-JSON responses
      return NextResponse.json(
        { error: "External parser returned non-JSON response", details: responseBodyText },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData, { status: response.status });

  } catch (error) {
    console.error("GET Proxy: Error forwarding request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Fehler beim Weiterleiten der GET-Anfrage an den externen Parser.",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}

async function handlePostRequest(request: RequestWithTeam) {
  try {
    if (!request.teamId) {
      return NextResponse.json(
        { error: "Team context required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    // Optionally validate 'body' with CreateJobProxySchema if needed
    // const validatedData = CreateJobProxySchema.parse(body);

    const parserSettings = await getDocumentParserSettings(request.teamId);
    if (!parserSettings?.parserUrl) {
      return NextResponse.json(
        { error: "Parser URL not configured." },
        { status: 500 }
      );
    }

    const externalParserUrl = `${parserSettings.parserUrl.replace(
      /\/$/,
      ""
    )}/api/worker/jobs`;

    // Prepare payload to forward. We might want to add/modify some parameters here.
    // For example, ensuring a callback URL is correctly formatted for this app.
    const appCallbackBase = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/worker/jobs`;

    const payloadToForward = {
      ...body,
      // The external parser should ideally append its own job ID to this callback base.
      // This app's callback handler at /api/worker/jobs/[jobId]/callback will then receive it.
      // The [jobId] in that route will be the ID from the *external* parser.
      callbackUrl: `${appCallbackBase}/callback_generic`, // Corrected to use the generic callback handler
                                                              // or the existing one adapted.
      // Pass teamId or other identifying info if the external parser needs it for the callback
      // or for its own processing logic.
      metadata: {
        ...(body.metadata || {}),
        originalRequesterTeamId: request.teamId,
        // Potentially add a correlation ID if not already present
      }
    };

    console.log(
      `POST Proxy: Forwarding request to ${externalParserUrl} with payload:`,
      JSON.stringify(payloadToForward, null, 2)
    );

    // Log the payload being sent to the external parser for debugging
    console.log("Sending payload to external parser:", JSON.stringify(payloadToForward, null, 2));

    const response = await fetch(externalParserUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "klark0-webapp/1.0",
        // Add authentication headers if the external parser requires them
        // e.g., if parserSettings contains an apiKey: 'X-API-Key': parserSettings.apiKey
      },
      body: JSON.stringify(payloadToForward),
      signal: AbortSignal.timeout(30000), // 30-second timeout
    });

    const responseBodyText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseBodyText);
    } catch (e) {
      console.error("POST Proxy: External response was not valid JSON:", responseBodyText);
      return NextResponse.json(
        { error: "External parser returned non-JSON response", details: responseBodyText },
        { status: response.status }
      );
    }

    // The response from the external parser is returned directly to the client.
    return NextResponse.json(responseData, { status: response.status });

  } catch (error) {
    console.error("POST Proxy: Error forwarding request:", error);

    if (error instanceof z.ZodError) {
      // This error would be from CreateJobProxySchema.parse(body) if used.
      return NextResponse.json(
        {
          success: false,
          error: "Ungültige Job-Daten für den Proxy.",
          details: error.errors,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Fehler beim Weiterleiten der POST-Anfrage an den externen Parser.",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}

export const GET = withTeamContext(handleGetRequest);
export const POST = withTeamContext(handlePostRequest);
