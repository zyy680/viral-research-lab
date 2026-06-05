import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJson } from "@/lib/ai";
import { ensureCredits, isInsufficientCreditsError, requireUser, saveUsage, spendCredits, unauthorized } from "@/lib/api";
import { toolCosts } from "@/lib/credits";
import { getAllowedModel } from "@/lib/models";

const schema = z.object({
  age: z.string(),
  education: z.string(),
  city: z.string(),
  expertInterests: z.string(),
  familiarIndustries: z.string(),
  industryResources: z.string(),
  aiModel: z.string().optional()
});

const fallback = {
  bestPositioning: "本地经验型个人IP账号：围绕个人兴趣、熟悉行业和可调动资源，输出真实、有场景、有决策价值的内容。",
  alternativePositioning: [
    "行业避坑型账号：专门讲熟悉行业里的真实问题、成本、流程和避坑经验。",
    "城市资源型账号：结合所在城市，分享机会、资源、消费决策和生活经验。",
    "技能成长型账号：把精通兴趣和过往经验拆成普通人能学会的方法。"
  ],
  targetAudience: [
    "正在进入相关行业的新手",
    "想通过自媒体建立个人影响力的普通人",
    "对本地资源、行业内幕或实用经验感兴趣的人",
    "有类似兴趣但缺少系统方法的人"
  ],
  personaTags: ["真实经验", "本地视角", "行业熟人", "会讲人话", "实操派"],
  contentDirection: [
    "行业内幕与避坑经验",
    "城市生活与资源信息",
    "个人成长与技能方法",
    "真实案例拆解",
    "新手入门清单",
    "资源对接与机会判断"
  ],
  launchStrategy: [
    "先用真实经历建立信任，不急着做泛知识内容。",
    "前30天集中测试3个栏目：避坑、清单、案例。",
    "每条内容只解决一个具体问题，优先做收藏型选题。",
    "用评论区问题反推下一批选题，快速找到精准人群。"
  ],
  plan30Days: [
    "第1-3天：明确目标人群，写出3个账号定位备选，并确定一个主定位。",
    "第4-7天：围绕熟悉行业整理30个真实问题，发布5条测试内容。",
    "第8-14天：每天发布1条内容，分别测试避坑、清单、案例、观点、故事五种形式。",
    "第15-20天：复盘完播率、收藏率和评论问题，保留表现最好的2个栏目。",
    "第21-25天：连续发布同一栏目系列内容，建立账号记忆点。",
    "第26-30天：整理私信和评论需求，设计一个低门槛转化产品或服务入口。"
  ],
  topics: [
    "我为什么建议新手先从自己熟悉的行业做账号",
    "普通人做自媒体，最容易忽略的一个城市优势",
    "把兴趣变成账号定位前，先问自己这5个问题",
    "熟悉一个行业但不会表达，怎么做第一条内容",
    "没有大资源，也能做出信任感的3种内容",
    "同城账号为什么更容易起步",
    "如何把过去的工作经历变成选题库",
    "行业新人最想知道但没人讲清楚的事",
    "一个账号定位好不好，看这4个信号",
    "不要一上来就做泛知识账号，原因很现实",
    "我会如何用30天测试一个新账号方向",
    "把资源写成内容时，怎么避免像广告",
    "一个适合普通人的账号简介怎么写",
    "兴趣爱好很多，账号到底该选哪一个",
    "熟人资源能不能变成自媒体优势",
    "为什么你的内容没人看，可能不是选题问题",
    "做账号前先列这张个人优势表",
    "从城市、行业、兴趣里找到账号差异点",
    "没有镜头感，也能做的3种内容形式",
    "一条高信任内容通常长什么样",
    "如何把行业经验讲得让小白听懂",
    "别急着追热点，先做这类长期内容",
    "用真实经历做内容，最怕犯这个错误",
    "如何判断一个选题有没有商业价值",
    "把评论区问题变成下一条爆款选题",
    "行业避坑内容为什么更容易被收藏",
    "如何设计账号的三个固定栏目",
    "你的城市里有哪些内容机会",
    "做本地内容，怎样避免太像流水账",
    "一个新账号前10条内容应该怎么发",
    "如何用资源做内容，但不透支人情",
    "普通人做个人IP，先别急着卖课",
    "什么样的经历最适合做账号人设",
    "账号定位太宽，应该如何收窄",
    "从熟悉行业里找细分人群的方法",
    "内容没人互动，可以这样改开头",
    "如何把专业词翻译成用户听得懂的话",
    "新账号最值得测试的5类标题",
    "为什么清单型内容适合新手起号",
    "如何做一个能持续更新的选题表",
    "你的资源适合做咨询、社群还是资料",
    "怎样判断粉丝是不是真的精准",
    "一个月内不要频繁换定位的原因",
    "行业案例拆解怎么写才不空",
    "如何把一次聊天变成3条内容",
    "适合本地账号的10个内容角度",
    "如何把个人经历包装成账号故事",
    "内容越具体，越容易被谁关注",
    "首月复盘时最该看的3个数据",
    "第二个月如何从内容测试走向变现测试"
  ],
  monetization: [
    "咨询服务：围绕熟悉行业提供一对一建议",
    "资料产品：整理清单、模板、避坑指南",
    "社群陪跑：聚集同城或同赛道人群",
    "资源撮合：基于行业资源做信息连接",
    "品牌合作：承接垂直行业广告或探店合作"
  ],
  notRecommended: [
    "不建议一开始做泛泛的情感、成长、搞钱大赛道，差异化不够。",
    "不建议频繁更换定位，前30天应集中测试一个主方向。",
    "不建议只做搬运式干货，要加入自己的经历、城市和行业资源。",
    "不建议一开始就强卖产品，先用内容建立信任和需求。"
  ]
};

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "输入信息不完整" }, { status: 400 });

  const selectedModel = getAllowedModel(parsed.data.aiModel);
  let output: typeof fallback;
  try {
    await ensureCredits(user.id, toolCosts.positioning);
    output = await generateJson(
      [
        "你是资深中文自媒体账号定位顾问，擅长根据普通人的真实背景找到可执行的账号方向。",
        "只返回 JSON，不要返回 Markdown。",
        "字段必须为 bestPositioning, alternativePositioning, targetAudience, personaTags, contentDirection, launchStrategy, plan30Days, topics, monetization, notRecommended。",
        "所有内容必须是中文，标题和正文不要出现英文。",
        "bestPositioning 是最适合用户的账号定位，必须是一段清晰、可执行的定位描述。",
        "alternativePositioning 是 3 个备选定位方向。",
        "targetAudience 是目标人群画像，必须具体到人群、需求和痛点。",
        "personaTags 是 5 到 8 个账号人设标签。",
        "contentDirection 是 5 到 8 个栏目方向。",
        "launchStrategy 是首月起号策略，必须讲清楚测试方向、内容节奏和复盘方式。",
        "plan30Days 是 6 到 10 条具体行动计划。",
        "topics 必须是 50 个首月选题，每个选题都要不同，不能套模板重复，不能使用“选题1”这类占位文字。",
        "monetization 是 4 到 6 个变现路径。",
        "notRecommended 是不建议做的方向，必须说明为什么不建议。",
        "所有输出必须结合年龄、学历、城市、兴趣、行业经历和资源情况。",
        "选题要贴近用户输入的城市、兴趣、行业和资源，兼顾新账号容易拍、容易写、容易引发收藏评论。"
      ].join("\n"),
      parsed.data,
      fallback,
      { model: selectedModel }
    );
  } catch (error) {
    if (isInsufficientCreditsError(error)) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "积分不足，请先充值" }, { status: 402 });
    }
    return NextResponse.json({ error: "调用模型失败，请检查模型、令牌或余额后重试" }, { status: 502 });
  }

  if (process.env.DATABASE_URL) {
    const { prisma } = await import("@/lib/prisma");
    await prisma.positioningReport.create({
      data: {
        userId: user.id,
        positioning: output.bestPositioning,
        contentDirection: output.contentDirection,
        monetization: output.monetization,
        plan30Days: output.plan30Days,
        topics: output.topics
      }
    });
  }
  await saveUsage(user.id, "AI账号定位师", { ...parsed.data, selectedModel }, output);
  await spendCredits(user.id, toolCosts.positioning, "AI账号定位师", { selectedModel });

  return NextResponse.json(output);
}
