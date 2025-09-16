import { NextResponse } from "next/server";
import { getFileSystemSettings } from "@/lib/db/settings";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";

async function handleRenameRequest(request: RequestWithTeam) {
  if (!request.teamId) {
    return NextResponse.json(
      { error: "Team context required." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const rawPaths = url.searchParams.getAll("path");
  const destination = url.searchParams.get("destination");

  if (rawPaths.length === 0 || !destination) {
    return NextResponse.json({ error: "Missing parameters." }, { status: 400 });
  }

  try {
    // Get filesystem configuration from database
    const fsSettings = await getFileSystemSettings(request.teamId);

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

    const paths = rawPaths.flatMap((p) =>
      p
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const results = await Promise.all(
      paths.map(async (p) => {
        const sourceUrl = new URL(
          p,
          fsSettings.host!.endsWith("/")
            ? fsSettings.host!
            : fsSettings.host! + "/"
        ).toString();
        
        // Construct full destination URL for WebDAV MOVE operation
        const destinationUrl = new URL(
          destination,
          fsSettings.host!.endsWith("/")
            ? fsSettings.host!
            : fsSettings.host! + "/"
        ).toString();
        
        const resp = await fetch(sourceUrl, {
          method: "MOVE",
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${fsSettings.username!}:${fsSettings.password!}`
            ).toString("base64")}`,
            Destination: destinationUrl, // Use full URL for destination header
            Overwrite: "T",
          },
        });
        return {
          path: p,
          destination: destination, // Return path in response
          status: resp.status,
          ok: resp.ok,
        };
      })
    );

    const status = results.every((r) => r.ok) ? 200 : 207;
    return NextResponse.json(results, { status });
  } catch (error) {
    console.error("Error renaming files:", error);
    return NextResponse.json(
      { error: "Failed to rename files" },
      { status: 500 }
    );
  }
}

export const POST = withTeamContext(handleRenameRequest);
