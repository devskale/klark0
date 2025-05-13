import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "/";
  const type = url.searchParams.get("type") || "webdav";
  const host = url.searchParams.get("host");
  const username = url.searchParams.get("username");
  const password = url.searchParams.get("password");

  if (type !== "webdav") {
    return NextResponse.json({ error: "Unsupported filesystem type." }, { status: 400 });
  }
  if (!host || !username || !password) {
    return NextResponse.json({ error: "Missing WebDAV credentials." }, { status: 400 });
  }

  const webdavUrl = new URL(path, host.endsWith("/") ? host : host + "/").toString();
  const resp = await fetch(webdavUrl, {
    method: "MKCOL",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
    },
  });

  if (resp.ok) {
    // MKCOL returns 201 if created, 405 if exists
    return NextResponse.json({ success: true }, { status: resp.status });
  } else {
    const text = await resp.text();
    return NextResponse.json({ error: text || resp.statusText }, { status: resp.status });
  }
}
