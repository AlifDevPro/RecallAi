import type { SupabaseClient } from "@supabase/supabase-js";
import type { Paper } from "@/lib/data/question-papers";

const BUCKET = "question-uploads";
const SIGNED_URL_TTL = 3600;

function isExternalUrl(path: string): boolean {
  return path.startsWith("http://") || path.startsWith("https://");
}

/** Normalize storage object path from DB (strip bucket prefix / leading slashes). */
export function normalizeStoragePath(path: string): string {
  let p = path.trim();
  if (isExternalUrl(p)) return p;
  p = p.replace(/^question-uploads\//, "");
  p = p.replace(/^\//, "");
  return p;
}

/** Resolve a storage path or external URL to something the browser can load. */
export async function resolveScanUrl(
  service: SupabaseClient,
  rawPath: string
): Promise<string | null> {
  if (!rawPath?.trim()) return null;

  const path = normalizeStoragePath(rawPath);
  if (isExternalUrl(path)) return path;

  const { data: signed, error } = await service.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (!error && signed?.signedUrl) return signed.signedUrl;

  // Private bucket — never return a raw path (browser cannot load it).
  return null;
}

/** Same-origin proxy — streams PDF/images with correct Content-Type for browser preview. */
export function scanProxyUrl(storagePath: string): string {
  return `/api/public/papers/scan?path=${encodeURIComponent(normalizeStoragePath(storagePath))}`;
}

/** Browser-facing URL for a scan (same-origin proxy for private storage paths). */
export function browserScanUrl(rawPath: string): string | null {
  if (!rawPath?.trim()) return null;
  const path = normalizeStoragePath(rawPath);
  if (!path) return null;
  if (isExternalUrl(path)) return path;
  return scanProxyUrl(path);
}

export async function resolvePaperScanUrls(
  _service: SupabaseClient,
  paper: Paper
): Promise<Paper> {
  if (!paper.scans?.length) return paper;

  const scans = paper.scans
    .map((scan) => {
      const url = browserScanUrl(scan.pageUrl);
      return url ? { ...scan, pageUrl: url } : { ...scan, pageUrl: "" };
    })
    .filter((s) => s.pageUrl);

  return { ...paper, scans };
}

export async function getFirstScanDownloadUrl(
  service: SupabaseClient,
  paper: Paper
): Promise<string | null> {
  if (!paper.scans?.length) return null;
  const raw = paper.scans[0].pageUrl;
  const proxy = browserScanUrl(raw);
  if (proxy && !proxy.startsWith("http")) {
    return `${proxy}&download=1`;
  }
  return resolveScanUrl(service, raw);
}
