import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const type = url.searchParams.get("type");
  const host = url.searchParams.get("host");
  const username = url.searchParams.get("username");
  const password = url.searchParams.get("password");

  if (type !== "webdav") {
    return NextResponse.json({ error: "Unsupported FS type" }, { status: 400 });
  }
  if (!host || !username || !password || !path) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // direct WebDAV GET of the JSON side-car
  const metadataUrl = new URL(path, host.endsWith("/") ? host : host + "/").toString();
  const resp = await fetch(metadataUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
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
    return NextResponse.json({ error: err || resp.statusText }, { status: resp.status });
  }
}

export async function POST(request: Request) {
  const { path, metadata, host, username, password, type } = await request.json();

  if (type !== "webdav") {
    return NextResponse.json({ error: "Unsupported FS type" }, { status: 400 });
  }
  if (!host || !username || !password || !path) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const url = new URL(path, host.endsWith("/") ? host : host + "/").toString();
  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
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
    return NextResponse.json({ error: err || resp.statusText }, { status: resp.status });
  }
}
