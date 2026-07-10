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

const MIN_FALLBACK_TEXT_CHARS = 40;

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
  return text.trim();
}

function fallbackQuestion(combined: string): ExtractedQuestion {
  const snippet = combined.trim().slice(0, 2000);
  return {
    raw: snippet.slice(0, 500),
    cleaned: snippet,
    inst: "",
    year: new Date().getFullYear(),
    term: "Unknown",
    topic: "General",
    marks: 5,
    type: "Short",
    conf: { inst: 0.5, year: 0.5, term: 0.5, topic: 0.5, marks: 0.5 },
  };
}

function extractQuestionArray(parsed: unknown): Partial<ExtractedQuestion>[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  for (const key of ["questions", "items", "data"]) {
    const val = obj[key];
    if (Array.isArray(val)) return val as Partial<ExtractedQuestion>[];
  }
  return null;
}

function parseStructuredQuestions(text: string, combined: string): ExtractedQuestion[] {
  const trimmed = combined.trim();

  try {
    const parsed = JSON.parse(text) as unknown;
    const arr = extractQuestionArray(parsed);
    if (arr && arr.length > 0) {
      return arr.map(normalizeExtracted).filter((q) => q.cleaned.trim() || q.raw.trim());
    }
    if (arr && arr.length === 0 && trimmed.length >= MIN_FALLBACK_TEXT_CHARS) {
      return [fallbackQuestion(trimmed)];
    }
    if (arr && arr.length === 0) {
      return [];
    }
  } catch {
    /* fall through to fallback */
  }

  if (trimmed.length >= MIN_FALLBACK_TEXT_CHARS) {
    return [fallbackQuestion(trimmed)];
  }

  return [];
}

export async function ocrFromFiles(
  files: File[],
  options: { userId?: string | null } = {}
): Promise<ExtractedQuestion[]> {
  const textParts: string[] = [];
  const failedFiles: string[] = [];

  for (const file of files) {
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = (await file.text()).trim();
      if (text) {
        textParts.push(text);
      } else {
        failedFiles.push(file.name);
      }
      continue;
    }

    if (isPdfFile(file)) {
      const buffer = new Uint8Array(await file.arrayBuffer());
      let pdfHadText = false;

      try {
        const source = await preparePdfOcrSource(buffer);

        if (source.text.trim()) {
          textParts.push(source.text.trim());
          pdfHadText = true;
        }

        for (const png of source.images) {
          const transcribed = await visionTranscribePng(png);
          if (transcribed) {
            textParts.push(transcribed);
            pdfHadText = true;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not read PDF";
        throw new Error(`${file.name}: ${msg}`);
      }

      if (!pdfHadText) {
        failedFiles.push(file.name);
      }
      continue;
    }

    const buffer = await file.arrayBuffer();
    const transcribed = await visionTranscribePng(new Uint8Array(buffer), fileMime(file));
    if (transcribed) {
      textParts.push(transcribed);
    } else {
      failedFiles.push(file.name);
    }
  }

  const combined = textParts.join("\n\n---\n\n");
  if (!combined.trim()) {
    const names = failedFiles.length ? failedFiles.join(", ") : "uploaded files";
    throw new Error(`Could not read text from ${names}. Try a clearer scan, text-based PDF, or paste as .txt`);
  }

  const { text } = await generateWithFailover(
    `Raw OCR text:\n\n${combined}\n\n${OCR_STRUCTURE}`,
    { system: OCR_STRUCTURE, json: true, route: "ocr-structure", userId: options.userId }
  );

  return parseStructuredQuestions(text, combined);
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
