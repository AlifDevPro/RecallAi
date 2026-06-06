import { groqGenerateVision } from "./groq";
import { isPdfFile, preparePdfOcrSource } from "./pdf-extract";
import { generateWithFailover } from "./router";
import { OCR_STRUCTURE, OCR_TRANSCRIBE } from "./prompts";

export type ExtractedQuestion = {
  raw: string;
  cleaned: string;
  inst: string;
  year: number;
  term: string;
  topic: string;
  marks: number;
  type: string;
  conf: { inst: number; year: number; term: number; topic: number; marks: number };
};

function fileMime(file: File): string {
  return (
    file.type ||
    (file.name.endsWith(".png")
      ? "image/png"
      : file.name.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg")
  );
}

async function visionTranscribePng(png: Uint8Array, mimeType = "image/png"): Promise<string> {
  const base64 = Buffer.from(png).toString("base64");
  const { text } = await groqGenerateVision(
    { text: OCR_TRANSCRIBE, imageBase64: base64, mimeType },
    { system: OCR_TRANSCRIBE, route: "ocr-vision" }
  );
  return text;
}

export async function ocrFromFiles(
  files: File[],
  options: { userId?: string | null } = {}
): Promise<ExtractedQuestion[]> {
  const textParts: string[] = [];

  for (const file of files) {
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      textParts.push(await file.text());
      continue;
    }

    if (isPdfFile(file)) {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const source = await preparePdfOcrSource(buffer);

      if (source.text.trim()) {
        textParts.push(source.text);
      }

      for (const png of source.images) {
        textParts.push(await visionTranscribePng(png));
      }
      continue;
    }

    const buffer = await file.arrayBuffer();
    textParts.push(await visionTranscribePng(new Uint8Array(buffer), fileMime(file)));
  }

  const combined = textParts.join("\n\n---\n\n");
  if (!combined.trim()) {
    return [];
  }

  const { text } = await generateWithFailover(
    `Raw OCR text:\n\n${combined}\n\n${OCR_STRUCTURE}`,
    { system: OCR_STRUCTURE, json: true, route: "ocr-structure", userId: options.userId }
  );

  try {
    const parsed = JSON.parse(text) as ExtractedQuestion[] | { questions: ExtractedQuestion[] };
    const arr = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeExtracted);
  } catch {
    return [
      {
        raw: combined.slice(0, 500),
        cleaned: combined.slice(0, 500),
        inst: "",
        year: new Date().getFullYear(),
        term: "Unknown",
        topic: "General",
        marks: 5,
        type: "Short",
        conf: { inst: 0.5, year: 0.5, term: 0.5, topic: 0.5, marks: 0.5 },
      },
    ];
  }
}

function normalizeExtracted(q: Partial<ExtractedQuestion>): ExtractedQuestion {
  return {
    raw: q.raw ?? "",
    cleaned: q.cleaned ?? q.raw ?? "",
    inst: q.inst ?? "",
    year: typeof q.year === "number" ? q.year : new Date().getFullYear(),
    term: q.term ?? "Unknown",
    topic: q.topic ?? "General",
    marks: typeof q.marks === "number" ? q.marks : 5,
    type: q.type ?? "Short",
    conf: q.conf ?? { inst: 0.8, year: 0.8, term: 0.8, topic: 0.8, marks: 0.8 },
  };
}
