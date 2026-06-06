import type { SupabaseClient } from "@supabase/supabase-js";
import type { Paper } from "@/lib/data/question-papers";

const BUCKET = "question-uploads";
const SIGNED_URL_TTL = 3600;

function isExternalUrl(path: string): boolean {
  return path.startsWith("http://") || path.startsWith("https://");
}

export async function resolvePaperScanUrls(
  service: SupabaseClient,
  paper: Paper
): Promise<Paper> {
  if (!paper.scans?.length) return paper;

  const scans = await Promise.all(
    paper.scans.map(async (scan) => {
      if (isExternalUrl(scan.pageUrl)) {
        return scan;
      }
      const { data, error } = await service.storage
        .from(BUCKET)
        .createSignedUrl(scan.pageUrl, SIGNED_URL_TTL);
      if (error || !data?.signedUrl) {
        return scan;
      }
      return { ...scan, pageUrl: data.signedUrl };
    })
  );

  return { ...paper, scans };
}

export async function getFirstScanDownloadUrl(
  service: SupabaseClient,
  paper: Paper
): Promise<string | null> {
  if (!paper.scans?.length) return null;
  const first = paper.scans[0];
  if (isExternalUrl(first.pageUrl)) return first.pageUrl;
  const { data } = await service.storage.from(BUCKET).createSignedUrl(first.pageUrl, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}
