import OpenAI from "openai";
import { aiModels } from "@/lib/models";

const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "missing-key";
const baseURL = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL;
const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
const strictModels = new Set(["gpt-5.1-2025-11-13"]);

export const openai = new OpenAI({
  apiKey,
  ...(baseURL ? { baseURL } : {})
});

export function getAiConfigStatus() {
  return {
    hasKey: Boolean(apiKey && apiKey !== "missing-key"),
    baseURL: baseURL || "https://api.openai.com/v1",
    model,
    keySource: process.env.AI_API_KEY ? "AI_API_KEY" : process.env.OPENAI_API_KEY ? "OPENAI_API_KEY" : "未配置"
  };
}

export class AiGenerationError extends Error {
  constructor(message = "调用模型失败") {
    super(message);
    this.name = "AiGenerationError";
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "调用模型失败";
}

function parseJsonObject<T>(content: string) {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error(`AI response is not JSON: ${cleaned.slice(0, 180)}`);
  }
}

export async function generateJson<T>(
  system: string,
  user: unknown,
  fallback: T,
  options?: { model?: string }
): Promise<T> {
  if (!apiKey || apiKey === "missing-key") {
    throw new AiGenerationError("未配置模型令牌");
  }

  const messages = [
    {
      role: "system" as const,
      content: `${system}\n\n重要：最终只输出一个合法 JSON 对象，不要输出解释、代码块或多余文字。`
    },
    { role: "user" as const, content: JSON.stringify(user) }
  ];

  async function requestJson(useResponseFormat: boolean, selectedModel: string) {
    const supportsExtraParams = !strictModels.has(selectedModel);
    const response = await openai.chat.completions.create({
      model: selectedModel,
      ...(supportsExtraParams ? { temperature: 0.85 } : {}),
      ...(useResponseFormat && supportsExtraParams ? { response_format: { type: "json_object" as const } } : {}),
      messages
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new AiGenerationError("模型没有返回内容");
    return parseJsonObject<T>(content);
  }

  const selectedModel = options?.model || model;
  const modelCandidates = Array.from(
    new Set([
      selectedModel,
      model,
      ...aiModels.map((item) => item.value)
    ])
  ).filter(Boolean);
  let lastError: unknown;

  for (const candidate of modelCandidates) {
    try {
      return await requestJson(true, candidate);
    } catch (error) {
      lastError = error;
      console.error(`AI JSON mode failed for ${candidate}, retrying compatible mode:`, error);
    }

    try {
      return await requestJson(false, candidate);
    } catch (error) {
      lastError = error;
      console.error(`AI compatible mode failed for ${candidate}:`, error);
    }
  }

  throw new AiGenerationError(getErrorMessage(lastError));
}
