import { NextResponse } from "next/server";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";
import { getAppSetting } from "@/lib/db/settings";

async function handleTestSettingsRequest(request: RequestWithTeam) {
  if (!request.teamId) {
    return NextResponse.json(
      { error: "Team context required." },
      { status: 401 }
    );
  }
  try {
    // Test loading KI settings
    const kiSettings = await getAppSetting(request.teamId, "kiEinstellungen");

    const response = {
      teamId: request.teamId,
      hasKiSettings: !!kiSettings,
      kiSettingsKeys: kiSettings ? Object.keys(kiSettings as any) : [],
      bearer: (kiSettings as any)?.bearer ? "[CONFIGURED]" : "[NOT CONFIGURED]",
      workModel: (kiSettings as any)?.workModel || "[NOT SET]",
      kiFramework: (kiSettings as any)?.kiFramework || "[NOT SET]",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error testing AI settings:", error);
    return NextResponse.json(
      {
        error: "Failed to test AI settings",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export const GET = withTeamContext(handleTestSettingsRequest);
