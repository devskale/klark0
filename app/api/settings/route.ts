import { NextResponse } from "next/server";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";
import {
  getFileSystemSettings,
  saveFileSystemSettings,
  getAISettings,
  saveAppSetting,
  getAppSetting,
  getDocumentParserSettings,
} from "@/lib/db/settings";
import { getKiSettings } from "@/lib/ai/settings";

async function handleSettingsRequest(request: RequestWithTeam) {
  if (!request.teamId) {
    return NextResponse.json(
      { error: "Team context required." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (request.method === "GET") {
    try {
      console.log("GET /api/settings - key:", key, "teamId:", request.teamId);

      if (key === "fileSystem") {
        const settings = await getFileSystemSettings(request.teamId);
        return NextResponse.json(settings);
      }
      if (key === "aiServices") {
        const settings = await getAISettings(request.teamId);
        return NextResponse.json(settings || {});
      }
      if (key === "documentParser") {
        const settings = await getDocumentParserSettings(request.teamId);
        return NextResponse.json(settings || {});
      } // New dedicated endpoint for KI Einstellungen for AI features
      if (key === "kiEinstellungen") {
        const settings = await getKiSettings(request.teamId);
        console.log(
          `GET KI settings:`,
          settings ? { ...settings, bearer: "[REDACTED]" } : null
        );
        return NextResponse.json(settings || {});
      }

      if (key) {
        const settings = await getAppSetting(request.teamId, key);
        console.log(`GET settings for key ${key}:`, settings);
        return NextResponse.json(settings || {});
      }

      return NextResponse.json(
        { error: "Setting key required" },
        { status: 400 }
      );
    } catch (error) {
      console.error("Error fetching settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }
  }
  if (request.method === "POST") {
    try {
      const body = await request.json();
      console.log("POST /api/settings - key:", key, "body:", body);

      if (key === "fileSystem") {
        await saveFileSystemSettings(request.teamId, body);
        return NextResponse.json({ success: true });
      }

      if (key) {
        await saveAppSetting(request.teamId, key, body);
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { error: "Setting key required" },
        { status: 400 }
      );
    } catch (error) {
      console.error("Error saving settings:", error);
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export const GET = withTeamContext(handleSettingsRequest);
export const POST = withTeamContext(handleSettingsRequest);
