import { NextResponse } from "next/server";
import { getFileSystemSettings } from "@/lib/db/settings";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";

async function handleMetadataGetRequest(request: RequestWithTeam) {
  if (!request.teamId) {
    return NextResponse.json(
      { error: "Team context required." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // Get filesystem configuration from database
    const fsSettings = await getFileSystemSettings(request.teamId);

    if (fsSettings.type !== "webdav") {
      return NextResponse.json(
        { error: "Unsupported FS type" },
        { status: 400 }
      );
    }

    if (!fsSettings.host || !fsSettings.username || !fsSettings.password) {
      return NextResponse.json(
        { error: "Incomplete WebDAV configuration" },
        { status: 400 }
      );
    }

    // direct WebDAV GET of the JSON side-car
    const metadataUrl = new URL(
      path,
      fsSettings.host.endsWith("/") ? fsSettings.host : fsSettings.host + "/"
    ).toString();
    const resp = await fetch(metadataUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(
          `${fsSettings.username}:${fsSettings.password}`
        ).toString("base64")}`,
      },
    });

    if (resp.ok) {
      const json = await resp.json();
      return NextResponse.json(json, { status: 200 });
    } else if (resp.status === 404) {
      // no metadata yet
      return NextResponse.json(null, { status: 200 });
    } else {
      const err = await resp.text();
      return NextResponse.json(
        { error: err || resp.statusText },
        { status: resp.status }
      );
    }
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

async function handleMetadataPostRequest(request: RequestWithTeam) {
  if (!request.teamId) {
    return NextResponse.json(
      { error: "Team context required." },
      { status: 401 }
    );
  }

  const { path, metadata } = await request.json();

  if (!path) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // Get filesystem configuration from database
    const fsSettings = await getFileSystemSettings(request.teamId);

    if (fsSettings.type !== "webdav") {
      return NextResponse.json(
        { error: "Unsupported FS type" },
        { status: 400 }
      );
    }

    if (!fsSettings.host || !fsSettings.username || !fsSettings.password) {
      return NextResponse.json(
        { error: "Incomplete WebDAV configuration" },
        { status: 400 }
      );
    }

    const url = new URL(
      path,
      fsSettings.host.endsWith("/") ? fsSettings.host : fsSettings.host + "/"
    ).toString();
    const resp = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${fsSettings.username}:${fsSettings.password}`
        ).toString("base64")}`,
      },
      body: JSON.stringify(metadata, null, 2),
    });

    if (resp.ok) {
      // echo back the saved metadata
      return NextResponse.json(
        { success: true, metadata },
        { status: resp.status }
      );
    } else {
      const err = await resp.text();
      return NextResponse.json(
        { error: err || resp.statusText },
        { status: resp.status }
      );
    }
  } catch (error) {
    console.error("Error saving metadata:", error);
    return NextResponse.json(
      { error: "Failed to save metadata" },
      { status: 500 }
    );
  }
}

export const GET = withTeamContext(handleMetadataGetRequest);
export const POST = withTeamContext(handleMetadataPostRequest);
