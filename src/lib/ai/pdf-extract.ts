import {
  createIsomorphicCanvasFactory,
  definePDFJSModule,
  extractImages,
  extractText,
  getDocumentProxy,
} from "unpdf";

export const MIN_PDF_TEXT_CHARS = 80;
export const MIN_PAGE_TEXT_CHARS = 30;
export const MAX_PDF_PAGES = 10;
export const MAX_PDF_VISION_ITEMS = 25;
export const MIN_EMBEDDED_IMAGE_AREA = 2500;
const MIN_EMBEDDED_IMAGE_DIMENSION = 50;

type PdfDocument = Awaited<ReturnType<typeof getDocumentProxy>>;
type EmbeddedImage = Awaited<ReturnType<typeof extractImages>>[number];

let pdfJsReady: Promise<void> | null = null;
let canvasFactoryReady: Promise<Awaited<ReturnType<typeof createIsomorphicCanvasFactory>>> | null =
  null;

function ensurePdfJs(): Promise<void> {
  if (!pdfJsReady) {
    pdfJsReady = definePDFJSModule(() => import("pdfjs-dist/legacy/build/pdf.mjs"));
  }
  return pdfJsReady;
}

function ensureCanvasFactory() {
  if (!canvasFactoryReady) {
    canvasFactoryReady = createIsomorphicCanvasFactory(() => import("@napi-rs/canvas"));
  }
  return canvasFactoryReady;
}

async function ensurePdfRuntime(): Promise<Awaited<ReturnType<typeof createIsomorphicCanvasFactory>>> {
  await ensurePdfJs();
  return ensureCanvasFactory();
}

async function loadPdf(buffer: Uint8Array): Promise<PdfDocument> {
  const CanvasFactory = await ensurePdfRuntime();
  return getDocumentProxy(buffer, { CanvasFactory });
}

function pdfReadError(cause: unknown): Error {
  const msg = cause instanceof Error ? cause.message : String(cause);
  if (/password|encrypted/i.test(msg)) {
    return new Error("This PDF is password-protected — remove the password and try again.");
  }
  const err = new Error("Could not read PDF — try exporting as images or a text-based PDF");
  (err as Error & { cause?: unknown }).cause = cause;
  return err;
}

function isSignificantEmbeddedImage(img: { width: number; height: number }): boolean {
  if (img.width < MIN_EMBEDDED_IMAGE_DIMENSION || img.height < MIN_EMBEDDED_IMAGE_DIMENSION) {
    return false;
  }
  return img.width * img.height >= MIN_EMBEDDED_IMAGE_AREA;
}

async function embeddedImageToPng(img: EmbeddedImage): Promise<Uint8Array> {
  const { createCanvas } = await import("@napi-rs/canvas");
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  const { data, channels } = img;

  if (channels === 4) {
    rgba.set(data);
  } else if (channels === 3) {
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      rgba[j] = data[i];
      rgba[j + 1] = data[i + 1];
      rgba[j + 2] = data[i + 2];
      rgba[j + 3] = 255;
    }
  } else {
    for (let i = 0, j = 0; i < data.length; i++, j += 4) {
      rgba[j] = data[i];
      rgba[j + 1] = data[i];
      rgba[j + 2] = data[i];
      rgba[j + 3] = 255;
    }
  }

  const imageData = ctx.createImageData(img.width, img.height);
  imageData.data.set(rgba);
  ctx.putImageData(imageData, 0, 0);
  return new Uint8Array(canvas.toBuffer("image/png"));
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export type PdfOcrSource = {
  text: string;
  images: Uint8Array[];
  totalPages: number;
};

export async function preparePdfOcrSource(buffer: Uint8Array): Promise<PdfOcrSource> {
  try {
    const pdf = await loadPdf(buffer);
    const { text: mergedText, totalPages } = await extractText(pdf, { mergePages: true });
    const { text: pageTexts } = await extractText(pdf, { mergePages: false });
    const normalized = mergedText ?? "";

    if (totalPages === 0) {
      throw new Error("Could not read PDF — the file has no pages");
    }

    const images: Uint8Array[] = [];
    const pagesToScan = Math.min(totalPages, MAX_PDF_PAGES);

    for (let pageNum = 1; pageNum <= pagesToScan; pageNum++) {
      if (images.length >= MAX_PDF_VISION_ITEMS) break;

      const pageText = (pageTexts[pageNum - 1] ?? "").trim();
      let pageHasSignificantImages = false;

      let embedded: EmbeddedImage[] = [];
      try {
        embedded = await extractImages(pdf, pageNum);
      } catch {
        embedded = [];
      }

      for (const img of embedded) {
        if (images.length >= MAX_PDF_VISION_ITEMS) break;
        if (!isSignificantEmbeddedImage(img)) continue;
        pageHasSignificantImages = true;
        images.push(await embeddedImageToPng(img));
      }

      if (
        pageText.length < MIN_PAGE_TEXT_CHARS &&
        !pageHasSignificantImages &&
        images.length < MAX_PDF_VISION_ITEMS
      ) {
        images.push(await renderPdfPageImage(pdf, pageNum));
      }
    }

    if (normalized.trim().length < MIN_PDF_TEXT_CHARS && images.length === 0) {
      for (let pageNum = 1; pageNum <= pagesToScan; pageNum++) {
        if (images.length >= MAX_PDF_VISION_ITEMS) break;
        images.push(await renderPdfPageImage(pdf, pageNum));
      }
    }

    return { text: normalized, images, totalPages };
  } catch (e) {
    if (e instanceof Error && e.message.includes("no pages")) {
      throw e;
    }
    throw pdfReadError(e);
  }
}

export async function extractPdfText(
  buffer: Uint8Array
): Promise<{ text: string; totalPages: number }> {
  try {
    const pdf = await loadPdf(buffer);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    return { text: text ?? "", totalPages };
  } catch (e) {
    throw pdfReadError(e);
  }
}

async function renderPdfPageImage(pdf: PdfDocument, pageNumber: number, scale = 2): Promise<Uint8Array> {
  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error(`Invalid page number. Must be between 1 and ${pdf.numPages}.`);
  }

  const CanvasFactory = await ensureCanvasFactory();
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const drawingContext = new CanvasFactory().create(viewport.width, viewport.height);

  await page.render({
    canvas: drawingContext.canvas as HTMLCanvasElement,
    canvasContext: drawingContext.context as CanvasRenderingContext2D,
    viewport,
  }).promise;

  const canvas = drawingContext.canvas as {
    toBuffer?: (mime: string) => Buffer;
  };

  if (typeof canvas.toBuffer === "function") {
    return new Uint8Array(canvas.toBuffer("image/png"));
  }

  const dataUrl = drawingContext.canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  if (!base64) {
    throw new Error("Could not render PDF page as PNG");
  }
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

export async function renderPdfPageImages(
  buffer: Uint8Array,
  maxPages: number,
  totalPages?: number
): Promise<Uint8Array[]> {
  try {
    const pdf = await loadPdf(buffer);
    const pageCount = totalPages ?? pdf.numPages;

    if (pageCount === 0) {
      throw new Error("Could not read PDF — the file has no pages");
    }

    const pages = Math.min(pageCount, maxPages);
    const images: Uint8Array[] = [];
    for (let pageNum = 1; pageNum <= pages; pageNum++) {
      images.push(await renderPdfPageImage(pdf, pageNum));
    }
    return images;
  } catch (e) {
    if (e instanceof Error && e.message.includes("no pages")) {
      throw e;
    }
    throw pdfReadError(e);
  }
}
