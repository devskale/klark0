import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { path, host, username, password, type } = await req.json();

  if (type !== "webdav") {
    return NextResponse.json({ error: "Unsupported FS" }, { status: 400 });
  }
  
  if (!path || !host || !username || !password) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const fileUrl = new URL(path, host.endsWith("/") ? host : host + "/").toString();
    
    const response = await fetch(fileUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `File fetch failed: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type");
    let content;

    // Handle different content types
    if (contentType && contentType.includes("application/json")) {
      content = await response.json();
      return NextResponse.json({ content: JSON.stringify(content) }, { status: 200 });
    } else {
      content = await response.text();
      return NextResponse.json({ content }, { status: 200 });
    }
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
