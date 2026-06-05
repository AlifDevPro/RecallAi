import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFailover } from "@/lib/ai/router";
import { MOCK_GRADE_SYSTEM } from "@/lib/ai/prompts";
import { groqGenerateVision } from "@/lib/ai/groq";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let questionBody = "";
  let answerText = "";
  let maxMarks = 10;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    questionBody = (formData.get("question") as string) ?? "";
    answerText = (formData.get("answerText") as string) ?? "";
    maxMarks = Number(formData.get("maxMarks") ?? 10);
    const image = formData.get("answerImage");
    if (image instanceof File) {
      const buffer = await image.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const { text } = await groqGenerateVision(
        {
          text: "Transcribe the handwritten answer exactly.",
          imageBase64: base64,
          mimeType: image.type || "image/jpeg",
        },
        { route: "mock-grade-ocr" }
      );
      answerText = text;
    }
  } else {
    const body = await request.json();
    questionBody = body.question ?? "";
    answerText = body.answer ?? "";
    maxMarks = body.maxMarks ?? 10;
  }

  const { text } = await generateWithFailover(
    `Question: ${questionBody}\nMax marks: ${maxMarks}\nStudent answer: ${answerText}\n\nGrade this answer.`,
    { system: MOCK_GRADE_SYSTEM, json: true, route: "mock-grade", userId: user.id }
  );

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({
      awarded: 0,
      max: maxMarks,
      feedback: text,
      deductions: [],
      modelAnswer: "",
    });
  }
}
