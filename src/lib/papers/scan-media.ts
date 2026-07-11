/** True when the URL likely points at a PDF (storage path or signed URL). */
export function isPdfMediaUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes(".pdf") || lower.includes("application/pdf");
}

export function isImageMediaUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(lower);
}

export function filenameFromStoragePath(path: string): string {
  const segment = path.split("/").pop() ?? "scan";
  return segment.split("?")[0] || "scan";
}

export function guessContentType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}
