import { NextResponse } from "next/server";
import { getTeamIdFromRequest } from "@/lib/auth/team-context";
import { getFileSystemSettings } from "@/lib/db/settings";

export async function POST(req: Request) {
  // Extract team context from request
  const teamId = await getTeamIdFromRequest(req as any);
  if (!teamId) {
    return NextResponse.json(
      { error: "Team context not found. Please ensure you are logged in." },
      { status: 401 }
    );
  }

  const {
    indexPath,
    fileName,
    meta,
    parserDefault, // ← new
  } = await req.json();

  if (!indexPath || !fileName) {
    return NextResponse.json(
      { error: "Missing required parameters (indexPath, fileName)" },
      { status: 400 }
    );
  }

  // Get FS settings from database
  const fsSettings = await getFileSystemSettings(teamId);
  if (
    !fsSettings ||
    fsSettings.type !== "webdav" ||
    !fsSettings.host ||
    !fsSettings.username ||
    !fsSettings.password
  ) {
    return NextResponse.json(
      {
        error:
          "WebDAV configuration not found or incomplete. Please configure in Einstellungen.",
      },
      { status: 400 }
    );
  }

  const { host, username, password } = fsSettings;

  // 1) Fetch existing index
  const idxUrl = new URL(
    indexPath,
    host.endsWith("/") ? host : host + "/"
  ).toString();
  const idxRes = await fetch(idxUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
        "base64"
      )}`,
    },
  });
  if (!idxRes.ok) {
    return NextResponse.json(
      { error: `Index fetch failed: ${idxRes.status}` },
      { status: idxRes.status }
    );
  }
  const indexJson = await idxRes.json();

  // 2) Patch entry
  const entry = (indexJson.files || []).find((f: any) => f.name === fileName);
  if (entry) {
    // update metadata
    entry.meta = { ...(entry.meta || {}), ...(meta || {}) };

    // update default parser if provided
    if (parserDefault != null) {
      entry.parsers = {
        ...(entry.parsers || {}),
        default: parserDefault,
      };
    }
  }

  // 3) Update timestamp
  indexJson.timestamp = Date.now() / 1000;

  // 4) Write back via PUT
  const putRes = await fetch(idxUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
        "base64"
      )}`,
    },
    body: JSON.stringify(indexJson, null, 2),
  });
  if (!putRes.ok) {
    const text = await putRes.text();
    return NextResponse.json(
      { error: text || putRes.statusText },
      { status: putRes.status }
    );
  }

  return NextResponse.json(
    { success: true, index: indexJson },
    { status: 200 }
  );
}
