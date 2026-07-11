import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  filenameFromStoragePath,
  guessContentType,
} from "@/lib/papers/scan-media";
import { normalizeStoragePath, resolveScanUrl } from "@/lib/papers/scan-urls";

/** Stream or redirect a question-bank scan from private storage. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path?.trim()) {
    return NextResponse.json({ error: "path query parameter required" }, { status: 400 });
  }

  try {
    const service = createServiceClient();
    const normalized = normalizeStoragePath(path);
    const signed = await resolveScanUrl(service, normalized);
    if (!signed) {
      return NextResponse.json({ error: "Scan not available" }, { status: 404 });
    }

    if (searchParams.get("redirect") === "1") {
      return NextResponse.redirect(signed, 307);
    }

    const upstream = await fetch(signed, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Scan not available" }, { status: 502 });
    }

    const contentType =
      upstream.headers.get("content-type")?.split(";")[0]?.trim() ??
      guessContentType(normalized);
    const filename = filenameFromStoragePath(normalized);
    const disposition = searchParams.get("download") === "1" ? "attachment" : "inline";

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=1800",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to resolve scan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** JSON helper for clients that need the signed URL without redirect. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path : "";
  if (!path.trim()) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  try {
    const service = createServiceClient();
    const url = await resolveScanUrl(service, normalizeStoragePath(path));
    if (!url) {
      return NextResponse.json({ error: "Scan not available" }, { status: 404 });
    }
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to resolve scan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
