import type { SupabaseClient } from "@supabase/supabase-js";
import type { Paper } from "@/lib/data/question-papers";

const BUCKET = "question-uploads";
const SIGNED_URL_TTL = 3600;

function isExternalUrl(path: string): boolean {
  return path.startsWith("http://") || path.startsWith("https://");
}

/** Resolve a storage path or external URL to something the browser can load. */
export async function resolveScanUrl(
  service: SupabaseClient,
  path: string
): Promise<string | null> {
  if (!path) return null;
  if (isExternalUrl(path)) return path;

  const { data: signed, error } = await service.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (!error && signed?.signedUrl) return signed.signedUrl;

  const { data: pub } = service.storage.from(BUCKET).getPublicUrl(path);
  return pub?.publicUrl ?? null;
}

export async function resolvePaperScanUrls(
  service: SupabaseClient,
  paper: Paper
): Promise<Paper> {
  if (!paper.scans?.length) return paper;

  const scans = await Promise.all(
    paper.scans.map(async (scan) => {
      const pageUrl = (await resolveScanUrl(service, scan.pageUrl)) ?? scan.pageUrl;
      return { ...scan, pageUrl };
    })
  );

  return { ...paper, scans };
}

export async function getFirstScanDownloadUrl(
  service: SupabaseClient,
  paper: Paper
): Promise<string | null> {
  if (!paper.scans?.length) return null;
  return resolveScanUrl(service, paper.scans[0].pageUrl);
}
