import { NextRequest, NextResponse } from "next/server";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";
import { getDocumentParserSettings } from "@/lib/db/settings";

async function handleWorkerSettingsRequest(request: RequestWithTeam) {
  if (!request.teamId) {
    return NextResponse.json(
      { error: "Team context required." },
      { status: 401 }
    );
  }

  if (request.method === "GET") {
    try {
      console.log("GET /api/worker/settings - teamId:", request.teamId);

      // Get document parser settings
      const parserSettings = await getDocumentParserSettings(request.teamId);
      
      return NextResponse.json({
        success: true,
        data: {
          documentParser: parserSettings || {},
        }
      });

    } catch (error) {
      console.error("Error fetching worker settings:", error);
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to fetch worker settings" 
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export const GET = withTeamContext(handleWorkerSettingsRequest);
