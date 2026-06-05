import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJson } from "@/lib/ai";
import { ensureCredits, isInsufficientCreditsError, requireUser, saveUsage, spendCredits, unauthorized } from "@/lib/api";
import { toolCosts } from "@/lib/credits";
import { getAllowedModel } from "@/lib/models";

const schema = z.object({
  goal: z.string(),
  rawCopy: z.string().min(10),
  aiModel: z.string().optional()
});

function createFallback(input: z.infer<typeof schema>) {
  const { goal, rawCopy } = input;
  const copy = rawCopy.trim();
  return {
    versionOne: [
      `如果这条文案的目标是${goal}，开头就不能只是在陈述信息，而要先让用户知道“这件事和我有什么关系”。`,
      "",
      copy,
      "",
      "我会把它改成更适合传播的表达：先把问题讲具体，再把原因讲明白，最后给出一个清晰的行动方向。这样用户看完之后，不只是觉得“有道理”，而是知道自己下一步应该怎么做。",
      `如果你也遇到类似情况，可以先把这条内容收藏起来，下次写文案前直接对照检查。`
    ].join("\n"),
    versionTwo: [
      `很多文案不是内容不好，而是表达顺序不够抓人。用户还没进入状态，就已经划走了。`,
      "",
      copy,
      "",
      `所以优化时，我会保留原文的核心意思和信息量，只调整节奏、情绪和表达重点。前半段先制造共鸣，中间补足逻辑，后半段给用户一个明确结果。整体长度尽量和原文接近，但读起来更顺、更有停留感，也更适合完成${goal}。`
    ].join("\n")
  };
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "请粘贴至少 10 个字的原始文案" }, { status: 400 });

  const fallback = createFallback(parsed.data);
  const selectedModel = getAllowedModel(parsed.data.aiModel);
  let output: typeof fallback;
  try {
    await ensureCredits(user.id, toolCosts.copyOptimize);
    output = await generateJson(
      [
        "你是中文短视频文案优化师。",
        "只返回 JSON，字段必须为 versionOne, versionTwo。",
        "两个字段都必须是一版已经改写完成、可以直接复制发布或口播的完整中文文案。",
        "不要只解释改写思路，不要写“建议”“可以这样优化”，不要输出提纲。",
        "必须结合用户选择的文案目标。",
        "两个版本要明显不同，但都要保留原文的核心意思和主要信息。",
        "改写后的每个版本长度必须和原文接近，允许上下浮动 20%，不能明显缩短。",
        "如果原文很长，改写后也要保持长文表达，不要压缩成摘要。",
        "versionOne 偏爆款表达：强化开头、痛点、节奏、结果和行动引导。",
        "versionTwo 偏自然表达：更顺、更真实、更有故事感和共鸣感。",
        "所有内容必须是中文，不要出现英文标题。"
      ].join("\n"),
      parsed.data,
      fallback,
      { model: selectedModel }
    );
  } catch (error) {
    if (isInsufficientCreditsError(error)) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "积分不足，请先充值" }, { status: 402 });
    }
    const message = error instanceof Error ? error.message : "调用模型失败";
    return NextResponse.json({ error: `调用模型失败：${message}` }, { status: 502 });
  }
  await saveUsage(user.id, "AI文案优化", { ...parsed.data, selectedModel }, output);
  await spendCredits(user.id, toolCosts.copyOptimize, "AI文案优化", { selectedModel });
  return NextResponse.json(output);
}
