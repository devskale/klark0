import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const {
    indexPath,
    fileName,
    meta,
    parserDefault, // ← new
    host,
    username,
    password,
    type,
  } = await req.json();

  if (type !== "webdav") {
    return NextResponse.json({ error: "Unsupported FS" }, { status: 400 });
  }
  if (!indexPath || !fileName || !host || !username || !password) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // 1) Fetch existing index
  const idxUrl = new URL(indexPath, host.endsWith("/") ? host : host + "/")
    .toString();
  const idxRes = await fetch(idxUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${username}:${password}`
      ).toString("base64")}`,
    },
  });
  if (!idxRes.ok) {
    return NextResponse.json(
      { error: `Index fetch failed: ${idxRes.status}` },
      { status: idxRes.status }
    );
  }
  const indexJson = await idxRes.json();

  // 2) Patch entry
  const entry = (indexJson.files || []).find((f: any) => f.name === fileName);
  if (entry) {
    // update metadata
    entry.meta = { ...(entry.meta || {}), ...(meta || {}) };

    // update default parser if provided
    if (parserDefault != null) {
      entry.parsers = {
        ...(entry.parsers || {}),
        default: parserDefault,
      };
    }
  }

  // 3) Update timestamp
  indexJson.timestamp = Date.now() / 1000;

  // 4) Write back via PUT
  const putRes = await fetch(idxUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(
        `${username}:${password}`
      ).toString("base64")}`,
    },
    body: JSON.stringify(indexJson, null, 2),
  });
  if (!putRes.ok) {
    const text = await putRes.text();
    return NextResponse.json(
      { error: text || putRes.statusText },
      { status: putRes.status }
    );
  }

  return NextResponse.json({ success: true, index: indexJson }, { status: 200 });
}
