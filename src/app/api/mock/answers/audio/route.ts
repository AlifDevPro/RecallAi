import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
  const audio = formData.get("audio");

  if (!attemptId || !questionId || !(audio instanceof File)) {
    return NextResponse.json({ error: "attemptId, questionId, and audio required" }, { status: 400 });
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

  const path = `${user.id}/${attemptId}/${questionId}-audio.webm`;
  const buffer = Buffer.from(await audio.arrayBuffer());

  try {
    const service = createServiceClient();
    const { error: uploadError } = await service.storage
      .from("mock-uploads")
      .upload(path, buffer, { contentType: audio.type || "audio/webm", upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = service.storage.from("mock-uploads").getPublicUrl(path);

    await supabase.from("mock_answers").upsert(
      {
        question_id: questionId,
        attempt_id: attemptId,
        answer_audio_url: urlData.publicUrl,
      },
      { onConflict: "question_id" }
    );

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
