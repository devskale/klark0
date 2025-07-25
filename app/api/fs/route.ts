import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js"; // Use xml2js for XML parsing
import { getFileSystemSettings } from "@/lib/db/settings";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";

const PDF2MD_INDEX_FILE_NAME = ".pdf2md_index.json";

async function handleFileSystemRequest(request: RequestWithTeam) {
  const url = new URL(request.url);
  const requestedPath = url.searchParams.get("path");

  console.log(
    "Received filesystem request with path:",
    requestedPath || "not provided",
    "for team:",
    request.teamId
  );

  if (!request.teamId) {
    return NextResponse.json(
      { error: "Team context required." },
      { status: 401 }
    );
  }

  try {
    // Get filesystem configuration from database
    const fsSettings = await getFileSystemSettings(request.teamId);
    
    // Use requested path if provided, otherwise fall back to path from settings or root
    let path = requestedPath || (fsSettings.path || "/");
    
    // Override path if it starts with "/klark0" to use path from settings
    if (path.startsWith("/klark0")) {
      console.log("Detected hardcoded path '/klark0' in request, overriding...");
      // Extract the subdirectory after "/klark0" if any
      const subPath = path.length > 7 ? path.substring(7) : "";
      
      if (fsSettings.path && fsSettings.path !== "/") {
        // Use the path from settings, but avoid double klark0
        if (fsSettings.path === "klark0" || fsSettings.path === "/klark0") {
          // If settings path is 'klark0', use it as base and append subPath
          path = "klark0" + subPath;
        } else {
          // For other paths, use them directly with subPath
          path = fsSettings.path + subPath;
        }
        console.log("Overridden with path from settings:", path);
      } else {
        // If no valid path in settings, strip "/klark0" and use the subdirectory or default to "/"
        path = subPath || "/";
        console.log("Overridden with default root or subdirectory (no valid path in settings):", path);
      }
    }

    console.log("Using filesystem settings:", {
      type: fsSettings.type,
      host: fsSettings.host,
    });

    if (fsSettings.type === "webdav") {
      if (!fsSettings.host || !fsSettings.username || !fsSettings.password) {
        console.error("Incomplete WebDAV configuration:", fsSettings);
        return NextResponse.json(
          {
            error:
              "WebDAV nicht konfiguriert. Bitte überprüfen Sie die Einstellungen.",
          },
          { status: 400 }
        );
      }

      const webdavUrl = new URL(
        path,
        fsSettings.host.endsWith("/") ? fsSettings.host : `${fsSettings.host}/`
      ).toString();
      console.log("Constructed WebDAV URL:", webdavUrl); // Check if the request is for the specific index file content
      if (path.endsWith(PDF2MD_INDEX_FILE_NAME)) {
        console.log(`Fetching content for index file: ${webdavUrl}`);
        const response = await fetch(webdavUrl, {
          method: "GET",
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${fsSettings.username}:${fsSettings.password}`
            ).toString("base64")}`,
          },
        });

        console.log(
          "WebDAV GET response status for index file:",
          response.status,
          response.statusText
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("WebDAV GET for index file failed:", {
            status: response.status,
            statusText: response.statusText,
            errorText,
            url: webdavUrl,
          });
          return NextResponse.json(
            {
              error: `Failed to fetch index file content. Status: ${response.status} ${response.statusText}. ${errorText}`,
            },
            { status: response.status }
          );
        }

        try {
          const jsonContent = await response.json();
          console.log(
            "Successfully fetched and parsed index file content:",
            jsonContent
          );
          return NextResponse.json(jsonContent);
        } catch (jsonError) {
          const textContent = await response.text(); // Re-read as text if json parsing fails
          console.error("Error parsing index file content as JSON:", {
            error: jsonError,
            responseText: textContent,
          });
          return NextResponse.json(
            { error: "Failed to parse index file content as JSON." },
            { status: 500 }
          );
        }
      } else {
        // Existing logic for directory listing (PROPFIND)
        console.log("Performing PROPFIND for directory listing:", webdavUrl);
        console.log(
          'Suggestion: Run \'curl -X PROPFIND -H "Depth: 1" -u ' +
            fsSettings.username +
            ":" +
            fsSettings.password +
            ' "' +
            webdavUrl +
            "\"' from your terminal."
        );

        const response = await fetch(webdavUrl, {
          method: "PROPFIND",
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${fsSettings.username}:${fsSettings.password}`
            ).toString("base64")}`,
            Depth: "1",
          },
        });

        console.log(
          "WebDAV PROPFIND response status:",
          response.status,
          response.statusText
        );

        if (!response.ok) {
          console.error("WebDAV PROPFIND failed:", {
            status: response.status,
            statusText: response.statusText,
            url: webdavUrl,
          });
          return NextResponse.json(
            {
              error: `Failed to fetch WebDAV data (PROPFIND). Status: ${response.status} ${response.statusText}`,
            },
            { status: response.status }
          );
        }

        const text = await response.text();
        console.log("Raw WebDAV PROPFIND response text:", text);

        try {
          const parsedXml = await parseStringPromise(text, {
            explicitArray: false,
            ignoreAttrs: true,
          });
          console.log(
            "Parsed WebDAV XML (raw for PROPFIND):",
            JSON.stringify(parsedXml, null, 2)
          );

          const multistatus =
            parsedXml["D:multistatus"] ||
            parsedXml["d:multistatus"] ||
            parsedXml["multistatus"];
          if (!multistatus) {
            console.error(
              "Missing multistatus element in WebDAV XML (PROPFIND):",
              parsedXml
            );
            return NextResponse.json(
              { error: "Invalid WebDAV XML structure (PROPFIND)." },
              { status: 500 }
            );
          }

          const responses = Array.isArray(
            multistatus["D:response"] ||
              multistatus["d:response"] ||
              multistatus["response"]
          )
            ? multistatus["D:response"] ||
              multistatus["d:response"] ||
              multistatus["response"]
            : [
                multistatus["D:response"] ||
                  multistatus["d:response"] ||
                  multistatus["response"],
              ].filter(Boolean);

          const result = responses.map((node: any) => {
            const href = node["D:href"] || node["d:href"] || node["href"];
            const propstatNode =
              node["D:propstat"] || node["d:propstat"] || node["propstat"];
            const propNode =
              propstatNode?.["D:prop"] ||
              propstatNode?.["d:prop"] ||
              propstatNode?.["prop"];
            const resourceTypeNode =
              propNode?.["D:resourcetype"] ||
              propNode?.["d:resourcetype"] ||
              propNode?.["resourcetype"];

            const isDirectory =
              resourceTypeNode?.["D:collection"] !== undefined ||
              resourceTypeNode?.["d:collection"] !== undefined ||
              resourceTypeNode?.["collection"] !== undefined;
            let size;
            if (!isDirectory) {
              size =
                propNode?.["D:getcontentlength"] ||
                propNode?.["d:getcontentlength"] ||
                propNode?.["getcontentlength"];
            }
            const lastModified =
              propNode?.["D:getlastmodified"] ||
              propNode?.["d:getlastmodified"] ||
              propNode?.["getlastmodified"];
            const creationDate =
              propNode?.["D:creationdate"] ||
              propNode?.["d:creationdate"] ||
              propNode?.["creationdate"];
            return {
              name: decodeURIComponent(
                href.split("/").filter(Boolean).pop() || ""
              ),
              type: isDirectory ? "directory" : "file",
              path: href,
              ...(size !== undefined && { size }),
              ...(lastModified && { lastModified }),
              ...(creationDate && { creationDate }),
            };
          });

          console.log(
            "Final parsed result (PROPFIND):",
            JSON.stringify(result, null, 2)
          );
          return NextResponse.json(result);
        } catch (parseError) {
          console.error("Error parsing WebDAV XML (PROPFIND):", {
            error: parseError,
            responseText: text,
          });
          return NextResponse.json(
            { error: "Failed to parse WebDAV XML response (PROPFIND)." },
            { status: 500 }
          );
        }
      }
    }
    console.error("Unsupported filesystem type:", fsSettings.type);
    return NextResponse.json(
      { error: "Unsupported filesystem type." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in filesystem API:", error);
    return NextResponse.json(
      { error: "An error occurred while accessing the filesystem." },
      { status: 500 }
    );
  }
}

// Export the GET handler with team context
export const GET = withTeamContext(handleFileSystemRequest);
