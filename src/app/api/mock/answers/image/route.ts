import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { groqGenerateVision } from "@/lib/ai/groq";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const attemptId = formData.get("attemptId") as string;
  const questionId = formData.get("questionId") as string;
  const image = formData.get("image");

  if (!attemptId || !questionId || !(image instanceof File)) {
    return NextResponse.json({ error: "attemptId, questionId, and image required" }, { status: 400 });
  }

  const { data: attempt } = await supabase
    .from("mock_attempts")
    .select("id")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const buffer = await image.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const path = `${user.id}/${attemptId}/${questionId}-image.${image.name.split(".").pop() ?? "jpg"}`;

  let answerText = "";
  try {
    const { text } = await groqGenerateVision(
      { text: "Transcribe the handwritten answer exactly.", imageBase64: base64, mimeType: image.type || "image/jpeg" },
      { route: "mock-answer-ocr" }
    );
    answerText = text;
  } catch {
    answerText = "";
  }

  try {
    const service = createServiceClient();
    await service.storage
      .from("mock-uploads")
      .upload(path, Buffer.from(buffer), { contentType: image.type || "image/jpeg", upsert: true });

    const { data: urlData } = service.storage.from("mock-uploads").getPublicUrl(path);

    await supabase.from("mock_answers").upsert(
      {
        question_id: questionId,
        attempt_id: attemptId,
        answer_image_url: urlData.publicUrl,
        answer_text: answerText || null,
      },
      { onConflict: "question_id" }
    );

    return NextResponse.json({ url: urlData.publicUrl, answerText });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
