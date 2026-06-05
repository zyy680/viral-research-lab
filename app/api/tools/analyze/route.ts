import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJson } from "@/lib/ai";
import { ensureCredits, isInsufficientCreditsError, requireUser, saveUsage, spendCredits, unauthorized } from "@/lib/api";
import { toolCosts } from "@/lib/credits";
import { getAllowedModel } from "@/lib/models";

const schema = z.object({
  copy: z.string().min(20),
  aiModel: z.string().optional()
});

function splitCopy(copy: string) {
  const text = copy.trim().replace(/\n{3,}/g, "\n\n");
  const sentences = text
    .split(/(?<=[。！？!?；;])|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return {
      opening: text.slice(0, 60),
      middle: text.slice(60, 180) || text,
      ending: text.slice(180) || text.slice(-60)
    };
  }

  return {
    opening: sentences.slice(0, Math.min(2, sentences.length)).join(""),
    middle: sentences.slice(2, Math.max(3, sentences.length - 1)).join("") || sentences[Math.floor(sentences.length / 2)],
    ending: sentences.slice(-1).join("")
  };
}

function createFallback(copy: string) {
  const parts = splitCopy(copy);
  const shortTopic = parts.opening.replace(/[，。！？!?；;、\s]/g, "").slice(0, 18) || "这个问题";

  return {
    hook: `原文开头是“${parts.opening}”。它的作用是先把用户带进一个具体问题或观点里，但如果想更抓人，可以把最强结果、最大反差或最痛的场景提前。`,
    pain: `原文主要抓的是用户在“${shortTopic}”相关场景里的困惑：知道问题存在，但不知道原因、方法或下一步怎么做。这个痛点适合继续写得更具体，比如谁遇到、什么时候遇到、代价是什么。`,
    benefit: "这篇文案给用户的利益点是：看完以后能获得一个更清晰的判断方式、行动方向或情绪确认。优化时要把“看完能得到什么”说得更直接。",
    emotion: "情绪设计上，原文适合走“困惑/焦虑 -> 被理解 -> 找到方法 -> 获得确定感”的路径。前半段制造共鸣，后半段给出解决感，结尾再引导收藏或行动。",
    structure: {
      "开头": parts.opening,
      "冲突": `用户面对的问题没有被讲透，或者旧方法无法解决当前困境。原文中段可对应“${parts.middle}”。`,
      "解决方案": "把观点拆成步骤、清单、经验或判断标准，让用户觉得马上能用。",
      "结果": `结尾要落到明确收益。原文结尾是“${parts.ending}”，可以进一步强化为看完后的变化或行动。`
    },
    formula: "具体场景 + 用户痛点 + 反常识观点 + 可执行方法 + 明确结果",
    template: [
      "很多【目标人群】都遇到过【具体场景/问题】。",
      "表面看是【表层原因】，其实真正卡住你的是【深层原因】。",
      "我建议你先做三件事：第一【动作一】，第二【动作二】，第三【动作三】。",
      "当你这样做之后，至少能得到【具体结果】。",
      "如果你也在【相关困境】里，先把这条收藏起来。"
    ].join("\n"),
    rewrites: [
      `很多人刷到“${shortTopic}”这类内容时，第一反应是懂了，但真正去做还是卡住。问题不在于你不努力，而是你没有把场景、问题和方法连起来。先找到用户最痛的那个瞬间，再给出一个能马上照做的步骤，这条内容才有价值。`,
      `如果你正在做类似“${shortTopic}”的内容，别一上来就讲大道理。先说一个用户熟悉的场景，再指出他为什么一直做不好，最后给一个简单方法。用户觉得你说中了，他才愿意继续看。`,
      `这类文案最怕写成泛泛而谈。你可以先问自己：用户是谁？他现在卡在哪里？看完这条能立刻改变什么？把这三个问题写清楚，内容就不会散。`,
      `一个好开头，不是声音大，而是精准。先把“${shortTopic}”背后的真实困扰说出来，再给出你的判断。用户一旦觉得被理解，后面的建议才有说服力。`,
      `同样的主题，普通写法是在讲信息，高级写法是在帮用户做决定。你要告诉他什么不要做、为什么不要做、应该怎么做，这样文案才有收藏价值。`,
      `如果想让这条内容更像爆款，可以把结论提前：很多人做错不是因为能力不够，而是第一步方向就偏了。接着再拆原因、给方法、讲结果。`,
      `别把所有信息都塞进一条文案。围绕一个核心问题讲透：先讲现象，再讲误区，然后给解决方案。内容越集中，用户越容易记住你。`,
      `这条文案可以改成经验分享型：我以前也以为【旧认知】，后来发现真正重要的是【新认知】。如果你也遇到这个问题，先从【具体动作】开始。`,
      `这类内容的重点不是炫专业，而是降低用户理解成本。把复杂问题翻译成一句人话，再给三个步骤，最后告诉用户做完会有什么变化。`,
      `想让用户评论，可以在结尾加一个开放问题：你现在最卡的是方向、方法还是执行？这样既能引发互动，也能帮你找到下一批选题。`
    ]
  };
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "请粘贴至少 20 个字的文案" }, { status: 400 });

  const fallback = createFallback(parsed.data.copy);
  const selectedModel = getAllowedModel(parsed.data.aiModel);
  let output: ReturnType<typeof createFallback>;
  try {
    await ensureCredits(user.id, toolCosts.analyze);
    output = await generateJson(
      [
        "你是中文爆款文案拆解专家，必须基于用户提供的原文逐句分析，不能泛泛而谈。",
        "只返回 JSON，不要返回 Markdown。",
        "JSON 字段仍使用 hook, pain, benefit, emotion, structure, formula, template, rewrites，方便系统读取；但字段值里的标题和正文必须全部是中文，不要出现英文单词。",
        "hook：分析原文具体钩子，必须引用或概括原文开头，不要空写套路。",
        "pain：分析原文具体痛点，必须说明痛点对应哪类人群、什么场景。",
        "benefit：分析用户看完能获得什么明确收益。",
        "emotion：分析情绪路径，例如焦虑、好奇、共鸣、确定感、行动欲。",
        "structure 必须使用中文子字段：开头、冲突、解决方案、结果，且每项都要对应原文具体内容。",
        "formula 要提炼这篇原文自己的爆款公式，不要每次都写同一个公式。",
        "template 要给出可替换的仿写模板，方便用户套用。",
        "rewrites 必须生成 10 到 30 篇同结构文案，每篇都要完整、不同、可直接发布。",
        "最终展示给用户的内容不要出现英文标题、英文字段名、英文说明。",
        "所有分析和仿写都必须围绕原文主题，不要编造和原文无关的行业、身份或结果。"
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
  await saveUsage(user.id, "文案拆解大师", { ...parsed.data, selectedModel }, output);
  await spendCredits(user.id, toolCosts.analyze, "文案拆解大师", { selectedModel });
  return NextResponse.json(output);
}
