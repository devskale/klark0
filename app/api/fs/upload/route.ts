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
      
      // Ensure path is relative for proper URL construction
      const relativePath = path.startsWith("/") ? path.substring(1) : path;
      const fullPath = relativePath ? [relativePath.replace(/\/$/, ""), filename].join("/") : filename;
      
      const uploadUrl = new URL(
        fullPath,
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
