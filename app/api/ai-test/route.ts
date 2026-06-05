import { NextResponse } from "next/server";
import { getAiConfigStatus, openai } from "@/lib/ai";
import { getAllowedModel } from "@/lib/models";

export async function GET(request: Request) {
  const config = getAiConfigStatus();
  const requestedModel = new URL(request.url).searchParams.get("model");
  const testModel = getAllowedModel(requestedModel || config.model);

  if (!config.hasKey) {
    return NextResponse.json({
      ok: false,
      config,
      message: "没有读取到 AI_API_KEY 或 OPENAI_API_KEY"
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: testModel,
      messages: [{ role: "user", content: "只回复两个字：你好" }]
    });

    return NextResponse.json({
      ok: true,
      config: { ...config, model: testModel },
      reply: response.choices[0]?.message.content || ""
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      ok: false,
      config: { ...config, model: testModel },
      message
    });
  }
}
