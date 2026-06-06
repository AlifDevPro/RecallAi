import { NextResponse } from "next/server";
import { ocrFromFiles } from "@/lib/ai/ocr";
import { isGroqConfigured } from "@/lib/ai/config";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"];

export async function POST(request: Request) {
  if (!isGroqConfigured()) {
    return NextResponse.json({ error: "AI is not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File ${file.name} exceeds 25MB` }, { status: 400 });
    }
    const ok =
      ALLOWED_TYPES.includes(file.type) ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".pdf");
    if (!ok) {
      return NextResponse.json({ error: `Unsupported file type: ${file.name}` }, { status: 400 });
    }
  }

  const filePaths: string[] = [];
  if (user) {
    try {
      const service = createServiceClient();
      for (const file of files) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error } = await service.storage
          .from("question-uploads")
          .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });
        if (!error) filePaths.push(path);
      }
    } catch {
      /* bucket may not exist yet */
    }
  }

  try {
    const extracted = await ocrFromFiles(files, { userId: user?.id });
    return NextResponse.json({ extracted, filePaths });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
