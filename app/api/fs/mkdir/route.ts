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
    
    // Dynamic base path detection and override
    const basePath = fsSettings.path || "";
    const normalizedBasePath = basePath.startsWith("/") ? basePath.substring(1) : basePath;
    
    if (normalizedBasePath && (path === `/${normalizedBasePath}` || path === normalizedBasePath)) {
      // If the request is for the base path itself, use the settings path
      console.log(`Detected base path request '${path}', using settings path: ${fsSettings.path}`);
      path = fsSettings.path || "/";
    } else if (normalizedBasePath && path.startsWith(`/${normalizedBasePath}/`)) {
      // If the request starts with the base path, extract the subpath and append to settings path
      console.log(`Detected base path prefix '/${normalizedBasePath}' in request, overriding...`);
      const subPath = path.substring(normalizedBasePath.length + 1); // +1 for the leading slash
      path = (fsSettings.path || "") + (subPath ? `/${subPath}` : "");
      console.log("Overridden with path from settings:", path);
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

    // Ensure path is relative for proper URL construction
    const relativePath = path.startsWith("/") ? path.substring(1) : path;
    
    const webdavUrl = new URL(
      relativePath,
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
