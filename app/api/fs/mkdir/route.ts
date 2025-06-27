import { NextResponse } from "next/server";
import { getFileSystemSettings } from "@/lib/db/settings";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";

async function handleMkdirRequest(request: RequestWithTeam) {
  if (!request.teamId) {
    return NextResponse.json(
      { error: "Team context required." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  let path = url.searchParams.get("path") || "/";

  try {
    // Get filesystem configuration from database
    const fsSettings = await getFileSystemSettings(request.teamId);
    
    // Override path if it starts with "/klark0" to use basePath from settings
    if (path.startsWith("/klark0")) {
      console.log("Detected hardcoded path '/klark0' in request, overriding...");
      if (fsSettings.basePath && fsSettings.basePath !== "/" && fsSettings.basePath !== "/klark0") {
        // Extract the subdirectory after "/klark0" if any
        const subPath = path.length > 7 ? path.substring(7) : "";
        path = fsSettings.basePath + subPath;
        console.log("Overridden with basePath from settings:", path);
      } else {
        // If no valid basePath in settings, strip "/klark0" and use the subdirectory or default to "/"
        const subPath = path.length > 7 ? path.substring(7) : "";
        path = subPath || "/";
        console.log("Overridden with default root or subdirectory (no valid basePath in settings):", path);
      }
    }

    if (fsSettings.type !== "webdav") {
      return NextResponse.json(
        { error: "Unsupported filesystem type." },
        { status: 400 }
      );
    }

    if (!fsSettings.host || !fsSettings.username || !fsSettings.password) {
      return NextResponse.json(
        { error: "Incomplete WebDAV configuration." },
        { status: 400 }
      );
    }

    const webdavUrl = new URL(
      path,
      fsSettings.host.endsWith("/") ? fsSettings.host : fsSettings.host + "/"
    ).toString();
    const resp = await fetch(webdavUrl, {
      method: "MKCOL",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${fsSettings.username}:${fsSettings.password}`
        ).toString("base64")}`,
      },
    });

    if (resp.ok) {
      // MKCOL returns 201 if created, 405 if exists
      return NextResponse.json({ success: true }, { status: resp.status });
    } else {
      const text = await resp.text();
      return NextResponse.json(
        { error: text || resp.statusText },
        { status: resp.status }
      );
    }
  } catch (error) {
    console.error("Error creating directory:", error);
    return NextResponse.json(
      { error: "Failed to create directory" },
      { status: 500 }
    );
  }
}

export const POST = withTeamContext(handleMkdirRequest);
