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
  let path = url.searchParams.get("path") || "/";

  // Get FS settings from database
  const fsSettings = await getFileSystemSettings(teamId);
  
  // Override path if it starts with "/klark0" to use basePath from settings
  if (path.startsWith("/klark0")) {
    console.log("Detected hardcoded path '/klark0' in upload request, overriding...");
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
        "Content-Length": f.size.toString(), // Add Content-Length
      };

      // Add Content-Type header if the blob/file has a type specified
      if (f.type) {
        headers["Content-Type"] = f.type;
      }

      const resp = await fetch(uploadUrl, {
        method: "PUT",
        headers: headers,
        body: f, // Use the file directly
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("Upload failed for file:", filename, "to URL:", uploadUrl, "Status:", resp.status, "Error:", errorText);
        return {
          name: filename,
          status: resp.status,
          ok: resp.ok,
          error: `Upload failed: ${resp.status} ${resp.statusText}. ${errorText}`,
        };
      }

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
