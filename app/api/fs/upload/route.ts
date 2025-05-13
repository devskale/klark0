import { NextResponse } from "next/server";

export const runtime = "edge"; // for formData()

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
      const uploadUrl = new URL(
        [path.replace(/\/$/, ""), filename].join("/"),
        host.endsWith("/") ? host : host + "/"
      ).toString();

      const resp = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        },
        body: f.stream(),
      });

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
