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

    // Read from projekt.json file directly
    const metadataUrl = new URL(
      path,
      fsSettings.host.endsWith("/") ? fsSettings.host : fsSettings.host + "/"
    ).toString();
    const resp = await fetch(metadataUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${fsSettings.username}:${fsSettings.password}`
        ).toString("base64")}`,
      },
    });

    if (resp.ok) {
      const jsonContent = await resp.text();
      
      try {
        const projektData = JSON.parse(jsonContent);
        
        // Extract metadata from nested structure (meta.meta)
        const metaData = projektData?.meta?.meta || {};
        
        // Return flattened structure for UI consumption
        const metadata = {
          auftraggeber: metaData.auftraggeber || "",
          aktenzeichen: metaData.aktenzeichen || "",
          ausschreibungsgegenstand: metaData.ausschreibungsgegenstand || "",
          datum: metaData.datum || "",
          lose: metaData.lose || [],
          selectedParser: metaData.selectedParser || "",
        };
        
        return NextResponse.json(metadata, { status: 200 });
      } catch (parseError) {
        console.error("Error parsing projekt.json:", parseError);
        return NextResponse.json(
          { error: "Invalid JSON format in projekt.json" },
          { status: 400 }
        );
      }
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

    // Use the same path for projekt.json (JSON output file)
  const jsonOutputPath = path;
    
    // First, try to read existing projekt.json to preserve other data
    let existingData: any = {};
    try {
      const readUrl = new URL(
        jsonOutputPath,
        fsSettings.host.endsWith("/") ? fsSettings.host : fsSettings.host + "/"
      ).toString();
      
      const readResp = await fetch(readUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${fsSettings.username}:${fsSettings.password}`
          ).toString("base64")}`,
        },
      });
      
      if (readResp.ok) {
        const existingContent = await readResp.text();
        existingData = JSON.parse(existingContent);
      }
    } catch (readError) {
      console.log("No existing projekt.json found, creating new structure");
    }
    
    // Transform metadata to match the projekt.json structure, preserving existing data
    const projektData = {
      ...existingData,
      meta: {
        ...(existingData.meta || {}),
        schema_version: "3.3-ai-optimized",
        meta: {
          auftraggeber: metadata.auftraggeber || "",
          aktenzeichen: metadata.aktenzeichen || "",
          ausschreibungsgegenstand: metadata.ausschreibungsgegenstand || "",
          datum: metadata.datum || "",
          // Preserve existing lose structure if it exists and is object array
          lose: (existingData.meta?.meta?.lose && Array.isArray(existingData.meta.meta.lose) && 
                 existingData.meta.meta.lose.length > 0 && 
                 typeof existingData.meta.meta.lose[0] === 'object') 
                ? existingData.meta.meta.lose 
                : metadata.lose || [],
          selectedParser: metadata.selectedParser || ""
        },
        Autor: `KI-generiert kontext.one@${new Date().toISOString()}`
      },
      // Keep existing structure for compatibility, only add if not present
      bdoks: existingData.bdoks || {
        schema_version: "3.3-ai-optimized",
        bieterdokumente: [],
        Autor: `KI-generiert kontext.one@${new Date().toISOString()}`
      },
      ids: existingData.ids || {
        schema_version: "3.2-ai-optimized", 
        kriterien: [],
        Autor: `KI-generiert kontext.one@${new Date().toISOString()}`
      }
    };

    const url = new URL(
      jsonOutputPath,
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
      body: JSON.stringify(projektData, null, 2),
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
