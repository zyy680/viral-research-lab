import Link from "next/link";
import { ArrowRight, Bot, ClipboardList, FileText, MousePointerClick, ScanText, Sparkles, Target, Video, Zap } from "lucide-react";
import { Card } from "@/components/ui";
import { PublicNav } from "@/components/site-shell";

const tools = [
  { name: "AI账号定位师", icon: Target, text: "从个人背景生成定位、栏目、变现和 30 天计划。" },
  { name: "AI文案优化", icon: FileText, text: "根据流量、涨粉、转化目标，生成两版可直接发布的文案。" },
  { name: "文案提取器", icon: ScanText, text: "输入抖音或小红书链接，提取完整口播文案。" },
  { name: "文案拆解大师", icon: ClipboardList, text: "拆解钩子、痛点、结构，并生成同款模板。" },
  { name: "数字人视频生成", icon: Video, text: "上传形象照和文案，生成数字人口播视频。" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <PublicNav />
      <section className="surface-grid border-b border-white/50">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl content-center gap-10 px-4 py-12 lg:grid-cols-[1.03fr_0.97fr]">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/60 bg-white/45 px-4 py-2 text-sm font-bold shadow-xl shadow-pink-200/20 backdrop-blur-2xl">
              <Bot className="h-4 w-4 text-accent" />
              自媒体创作者 AI 工作台
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-normal sm:text-7xl">
              让AI帮你做好自媒体
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-foreground/78">
              3分钟找到账号方向，1分钟优化视频文案，输入链接提取口播内容，再把文案变成数字人口播视频。
            </p>
            <Link href="/register" className="mt-8 inline-flex h-12 w-fit items-center gap-2 rounded-full border border-white/60 bg-primary px-6 text-sm font-black text-primary-foreground shadow-xl shadow-lime-300/30 backdrop-blur-2xl transition hover:-translate-y-0.5">
              立即开始 <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {["定位", "改写", "拆解"].map((item, index) => (
                <div key={item} className={["rounded-full border border-white/60 px-3 py-3 text-center text-sm font-black shadow-lg backdrop-blur-2xl", index === 1 ? "bg-accent/90 text-accent-foreground shadow-pink-300/25" : "bg-white/45 shadow-slate-900/5"].join(" ")}>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="grid content-center gap-4">
            <div className="dopamine-panel rounded-[2rem] p-5">
              <div className="flex items-center justify-between border-b border-white/50 pb-4">
                <div>
                  <p className="text-sm font-bold text-muted-foreground">今日创作状态</p>
                  <h2 className="mt-1 text-2xl font-black">灵感正在爆发</h2>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-accent/90 text-accent-foreground shadow-lg shadow-pink-300/30">
                  <Zap className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {tools.slice(0, 4).map((tool, index) => (
                  <div key={tool.name} className={["flex items-start gap-4 rounded-3xl border border-white/55 p-4 shadow-lg backdrop-blur-2xl", index % 2 === 0 ? "bg-primary/70 shadow-lime-300/20" : "bg-white/48 shadow-pink-200/20"].join(" ")}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/65 text-accent shadow-sm">
                      <tool.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-black">{tool.name}</h2>
                      <p className="mt-1 text-sm font-medium leading-6 text-foreground/72">{tool.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-accent/90 px-4 py-2 text-sm font-black text-accent-foreground shadow-xl shadow-pink-300/25 backdrop-blur-2xl">
              <Sparkles className="h-4 w-4" /> 五个创作工具
            </div>
            <h2 className="mt-4 text-3xl font-black">从想法到发布，一路加速</h2>
          </div>
          <MousePointerClick className="hidden h-10 w-10 text-accent sm:block" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {tools.map((tool) => (
            <Card key={tool.name} className="p-5 transition hover:-translate-y-1">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/65 bg-primary/85 shadow-lg shadow-lime-300/20">
                <tool.icon className="h-6 w-6 text-foreground" />
              </span>
              <h3 className="mt-4 font-black">{tool.name}</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{tool.text}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
