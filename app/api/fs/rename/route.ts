import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "webdav";
  const host = url.searchParams.get("host");
  const username = url.searchParams.get("username");
  const password = url.searchParams.get("password");
  const rawPaths = url.searchParams.getAll("path");
  const destination = url.searchParams.get("destination");

  if (type !== "webdav") {
    return NextResponse.json({ error: "Unsupported filesystem type." }, { status: 400 });
  }
  if (!host || !username || !password || rawPaths.length === 0 || !destination) {
    return NextResponse.json({ error: "Missing parameters." }, { status: 400 });
  }

  const paths = rawPaths.flatMap((p) =>
    p.split(",").map((s) => s.trim()).filter(Boolean)
  );
  const results = await Promise.all(
    paths.map(async (p) => {
      const sourceUrl = new URL(p, host.endsWith("/") ? host : host + "/").toString();
      const destinationUrl = new URL(destination, host.endsWith("/") ? host : host + "/").toString();
      const resp = await fetch(sourceUrl, {
        method: "MOVE",
        headers: {
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
          Destination: destinationUrl,
          Overwrite: "T",
        },
      });
      return { path: p, destination: destinationUrl, status: resp.status, ok: resp.ok };
    })
  );

  const status = results.every((r) => r.ok) ? 200 : 207;
  return NextResponse.json(results, { status });
}
