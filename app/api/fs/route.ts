import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js"; // Use xml2js for XML parsing

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "/klark0"; // Default to /klark0 if empty
  const type = url.searchParams.get("type") || "webdav"; // Default to WebDAV
  const host = url.searchParams.get("host");
  const username = url.searchParams.get("username");
  const password = url.searchParams.get("password");

  console.log("Received request with parameters:", { path, type, host, username });

  try {
    if (type === "webdav") {
      if (!host || !username || !password) {
        console.error("Incomplete WebDAV settings:", { host, username, password });
        return NextResponse.json({ error: "Incomplete WebDAV settings." }, { status: 400 });
      }

      // Construct the WebDAV URL correctly
      const webdavUrl = new URL(path, host.endsWith("/") ? host : `${host}/`).toString();
      console.log("Constructed WebDAV URL:", webdavUrl);

      console.log("Suggestion: Run 'curl -X PROPFIND -H \"Depth: 1\" -u " + username + ":" + password + " \"" + webdavUrl + "\"' from your terminal.");

      const response = await fetch(webdavUrl, {
        method: "PROPFIND",
        headers: {
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
          Depth: "1",
        },
      });

      console.log("WebDAV response status:", response.status, response.statusText);

      if (!response.ok) {
        console.error("WebDAV fetch failed:", {
          status: response.status,
          statusText: response.statusText,
          url: webdavUrl,
        });
        return NextResponse.json({ error: `Failed to fetch WebDAV data. Status: ${response.status} ${response.statusText}` },
          { status: response.status });
      }

      const text = await response.text();
      console.log("Raw WebDAV response text:", text);

      try {
        const parsedXml = await parseStringPromise(text, { explicitArray: false, ignoreAttrs: true });
        console.log("Parsed WebDAV XML (raw):", JSON.stringify(parsedXml, null, 2));

        // Check uppercase "D:" namespace, lower-case "d:", or no prefix.
        const multistatus = parsedXml["D:multistatus"] || parsedXml["d:multistatus"] || parsedXml["multistatus"];
        if (!multistatus) {
          console.error("Missing multistatus element in WebDAV XML:", parsedXml);
          return NextResponse.json({ error: "Invalid WebDAV XML structure." }, { status: 500 });
        }

        const responses = Array.isArray(
          multistatus["D:response"] || multistatus["d:response"] || multistatus["response"]
        )
          ? multistatus["D:response"] || multistatus["d:response"] || multistatus["response"]
          : [multistatus["D:response"] || multistatus["d:response"] || multistatus["response"]];

        const result = responses.map((node: any) => {
          const href = node["D:href"] || node["d:href"] || node["href"];
          const isDirectory = node["D:propstat"]?.["D:prop"]?.["D:resourcetype"]?.["D:collection"] !== undefined ||
                              node["d:propstat"]?.["d:prop"]?.["d:resourcetype"]?.["d:collection"] !== undefined ||
                              node["propstat"]?.["prop"]?.["resourcetype"]?.["collection"] !== undefined;
          let size;
          if (!isDirectory) {
            size = node["D:propstat"]?.["D:prop"]?.["D:getcontentlength"] ||
                   node["d:propstat"]?.["d:prop"]?.["d:getcontentlength"] ||
                   node["propstat"]?.["prop"]?.["getcontentlength"];
          }
          // Extract last modified date and creation date (if available)
          const lastModified = node["D:propstat"]?.["D:prop"]?.["D:getlastmodified"] ||
                               node["d:propstat"]?.["d:prop"]?.["d:getlastmodified"] ||
                               node["propstat"]?.["prop"]?.["getlastmodified"];
          const creationDate = node["D:propstat"]?.["D:prop"]?.["D:creationdate"] ||
                               node["d:propstat"]?.["d:prop"]?.["d:creationdate"] ||
                               node["propstat"]?.["prop"]?.["creationdate"];
          return {
            name: decodeURIComponent(href.split("/").filter(Boolean).pop() || ""),
            type: isDirectory ? "directory" : "file",
            path: href,
            ...(size !== undefined && { size }),
            ...(lastModified && { lastModified }),
            ...(creationDate && { creationDate })
          };
        });

        console.log("Final parsed result:", JSON.stringify(result, null, 2));
        return NextResponse.json(result);
      } catch (parseError) {
        console.error("Error parsing WebDAV XML:", { error: parseError, responseText: text });
        return NextResponse.json({ error: "Failed to parse WebDAV XML response." }, { status: 500 });
      }
    }

    console.error("Unsupported filesystem type:", type);
    return NextResponse.json({ error: "Unsupported filesystem type." }, { status: 400 });
  } catch (error) {
    console.error("Error in filesystem API:", error);
    return NextResponse.json({ error: "An error occurred while accessing the filesystem." }, { status: 500 });
  }
}
