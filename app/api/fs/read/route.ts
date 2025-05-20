import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const path = url.searchParams.get("path");
  const host = url.searchParams.get("host");
  const username = url.searchParams.get("username");
  const password = url.searchParams.get("password");

  if (type !== "webdav") {
    return NextResponse.json({ error: "Unsupported FS" }, { status: 400 });
  }

  if (!path || !host || !username || !password) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // Construct the file URL
    const fileUrl = new URL(path, host.endsWith("/") ? host : host + "/").toString();
    
    // Fetch the file content
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

    // Directly return the body stream to correctly transfer binary and text files
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

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

    // Return the content as text
    const content = await response.text();
    return NextResponse.json({ content }, { status: 200 });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
