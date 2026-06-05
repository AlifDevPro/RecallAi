import Groq from "groq-sdk";
import { AI_CONFIG } from "./config";

function getClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  return new Groq({ apiKey: key });
}

export type GenerateOptions = {
  system?: string;
  json?: boolean;
  route?: string;
};

export type VisionInput = {
  text: string;
  imageBase64: string;
  mimeType: string;
};

export async function groqGenerateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const client = getClient();
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (options.system) {
    messages.push({ role: "system", content: options.system });
  }
  messages.push({ role: "user", content: prompt });

  const completion = await client.chat.completions.create({
    model: AI_CONFIG.groqModel,
    messages,
    max_tokens: AI_CONFIG.maxOutputTokens,
    response_format: options.json ? { type: "json_object" } : undefined,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  return {
    text,
    tokensIn: completion.usage?.prompt_tokens ?? 0,
    tokensOut: completion.usage?.completion_tokens ?? 0,
  };
}

export async function groqGenerateVision(
  input: VisionInput,
  options: GenerateOptions = {}
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const client = getClient();
  type Msg = Parameters<typeof client.chat.completions.create>[0]["messages"][number];
  const messages: Msg[] = [];

  if (options.system) {
    messages.push({ role: "system", content: options.system });
  }

  messages.push({
    role: "user",
    content: [
      { type: "text", text: input.text },
      {
        type: "image_url",
        image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` },
      },
    ],
  });

  const completion = await client.chat.completions.create({
    model: AI_CONFIG.groqVisionModel,
    messages,
    max_tokens: AI_CONFIG.maxOutputTokens,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  return {
    text,
    tokensIn: completion.usage?.prompt_tokens ?? 0,
    tokensOut: completion.usage?.completion_tokens ?? 0,
  };
}

export async function groqStreamText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<{
  stream: AsyncIterable<string>;
  tokensIn: number;
  getTokensOut: () => number;
}> {
  const client = getClient();
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (options.system) {
    messages.push({ role: "system", content: options.system });
  }
  messages.push({ role: "user", content: prompt });

  const stream = await client.chat.completions.create({
    model: AI_CONFIG.groqModel,
    messages,
    max_tokens: AI_CONFIG.maxOutputTokens,
    stream: true,
  });

  let tokensOut = 0;
  const tokensIn = Math.ceil(prompt.length / 4);

  async function* iterate() {
    for await (const chunk of stream) {
      const t = chunk.choices[0]?.delta?.content ?? "";
      if (t) {
        tokensOut += Math.ceil(t.length / 4);
        yield t;
      }
    }
  }

  return {
    stream: iterate(),
    tokensIn,
    getTokensOut: () => tokensOut,
  };
}
