import { NextResponse } from "next/server";
import { getTeamIdFromRequest } from "@/lib/auth/team-context";
import { getFileSystemSettings } from "@/lib/db/settings";

 // for formData()

export async function POST(request: Request) {
  // Extract team context from request
  const teamId = await getTeamIdFromRequest(request as any);
  if (!teamId) {
    return NextResponse.json(
      { error: "Team context not found. Please ensure you are logged in." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "/";

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

  const form = await request.formData();
  const files = form.getAll("files");
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided." }, { status: 400 });
  }

  const results = await Promise.all(
    files.map(async (f) => {
      if (!(f instanceof Blob)) {
        return { name: String(f), error: "Invalid file object" };
      }
      const filename = f instanceof File ? f.name : "upload";
      const uploadUrl = new URL(
        [path.replace(/\/$/, ""), filename].join("/"),
        host.endsWith("/") ? host : host + "/"
      ).toString();

      const headers: HeadersInit = {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      };

      // Add Content-Type header if the blob/file has a type specified
      if (f.type) {
        headers["Content-Type"] = f.type;
      }

      const resp = await fetch(uploadUrl, {
        method: "PUT",
        headers: headers,
        body: f.stream(),
      });

      return {
        name: filename,
        status: resp.status,
        ok: resp.ok,
      };
    })
  );

  return NextResponse.json(results, {
    status: results.every((r) => r.ok) ? 200 : 207,
  });
}
