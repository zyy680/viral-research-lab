"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { aiModels } from "@/lib/models";
import { readWallet, spendWallet, syncWalletFromServer } from "@/lib/wallet";

type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "file";
  options?: string[];
  accept?: string;
  required?: boolean;
};

export type ToolConfig = {
  title: string;
  description: string;
  endpoint: string;
  fields: Field[];
  multipart?: boolean;
  modelSelect?: boolean;
  cost?: number;
};

function inputFromForm(form: FormData) {
  const input: Record<string, unknown> = {};
  form.forEach((value, key) => {
    if (value instanceof File) {
      if (value.size > 0) input[key] = value.name;
      return;
    }
    input[key] = value;
  });
  return input;
}

function saveLocalUsage(toolName: string, input: Record<string, unknown>, output: Record<string, unknown>) {
  const current = JSON.parse(localStorage.getItem("viral-lab-history") || "[]") as unknown[];
  const next = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      toolName,
      input,
      output,
      createdAt: new Date().toISOString()
    },
    ...current
  ].slice(0, 20);
  localStorage.setItem("viral-lab-history", JSON.stringify(next));
}

function renderValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item, index) => `${index + 1}. ${renderValue(item)}`).join("\n");
  if (value && typeof value === "object") {
    const nestedLabels: Record<string, string> = {
      opening: "开头",
      conflict: "冲突",
      solution: "解决方案",
      result: "结果"
    };
    return Object.entries(value).map(([key, item]) => `${nestedLabels[key] || key}：${renderValue(item)}`).join("\n");
  }
  return String(value ?? "");
}

const resultLabels: Record<string, string> = {
  positioning: "账号定位",
  bestPositioning: "最适合你的账号定位",
  alternativePositioning: "备选定位",
  targetAudience: "目标人群画像",
  personaTags: "账号人设标签",
  why: "为什么适合",
  contentDirection: "内容栏目设计",
  launchStrategy: "首月起号策略",
  monetization: "变现路径",
  plan30Days: "30天起号计划",
  topics: "首月50个选题",
  notRecommended: "不建议做的方向",
  viral: "爆款版",
  story: "故事版",
  spoken: "口播版",
  emotional: "情绪版",
  versionOne: "优化版一",
  versionTwo: "优化版二",
  titleSuggestions: "标题建议",
  hookSuggestions: "开头钩子",
  endingGuides: "结尾引导",
  text: "完整文案文本",
  hook: "钩子分析",
  pain: "痛点分析",
  benefit: "利益点分析",
  emotion: "情绪设计分析",
  structure: "结构拆解",
  formula: "爆款公式",
  template: "仿写模板",
  rewrites: "一键生成同款"
};

export function ToolRunner({ config }: { config: ToolConfig }) {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cost = config.cost ?? 10;
    const wallet = readWallet();
    if (wallet.balance < cost) {
      setError(`积分不足，本次需要 ${cost} 积分，请先充值。`);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData(event.currentTarget);
    const input = inputFromForm(form);
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: config.multipart ? undefined : { "Content-Type": "application/json" },
      body: config.multipart ? form : JSON.stringify(Object.fromEntries(form.entries()))
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error || "生成失败，请稍后再试");
    spendWallet(cost);
    await syncWalletFromServer();
    setResult(data);
    saveLocalUsage(config.title, input, data);
  }

  const outputText = result
    ? typeof result.text === "string" && result.text.trim()
      ? result.text
      : renderValue(result)
    : "";

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/45 px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm backdrop-blur-2xl hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 返回 Dashboard
        </Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6">
            <div className="mb-5 inline-flex rounded-full bg-primary/85 px-4 py-2 text-sm font-black text-primary-foreground shadow-lg shadow-lime-300/20">
              AI 创作工具 · {config.cost ?? 10} 积分/次
            </div>
            <h1 className="text-3xl font-black">{config.title}</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{config.description}</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {config.modelSelect ? (
                <div className="space-y-2">
                  <Label>选择模型</Label>
                  <select name="aiModel" className="h-11 w-full rounded-2xl border border-white/60 bg-white/45 px-4 text-sm outline-none backdrop-blur-xl focus:ring-2 focus:ring-ring">
                    {aiModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs leading-5 text-muted-foreground">不同模型的速度、效果和费用可能不同。</p>
                </div>
              ) : null}
              {config.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea name={field.name} required={field.required ?? true} />
                  ) : field.type === "select" ? (
                    <select name={field.name} required={field.required ?? true} className="h-11 w-full rounded-2xl border border-white/60 bg-white/45 px-4 text-sm outline-none backdrop-blur-xl focus:ring-2 focus:ring-ring">
                      {field.options?.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : field.type === "file" ? (
                    <Input name={field.name} type="file" accept={field.accept} />
                  ) : (
                    <Input name={field.name} required={field.required ?? true} />
                  )}
                </div>
              ))}
              {error ? (
                <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  {error} {error.includes("积分不足") ? <Link className="underline" href="/recharge">去充值</Link> : null}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? "生成中..." : "开始生成"}
                </Button>
                <Button type="reset" variant="outline" onClick={() => setResult(null)}>
                  <RotateCcw className="h-4 w-4" /> 重新生成
                </Button>
              </div>
            </form>
          </Card>
          <Card className="min-h-[520px] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">生成结果</h2>
              <Button variant="outline" size="sm" disabled={!outputText} onClick={() => navigator.clipboard.writeText(outputText)}>
                <Copy className="h-4 w-4" /> 复制
              </Button>
            </div>
            {result ? (
              <div className="mt-5 space-y-4">
                {Object.entries(result).map(([key, value]) => (
                  <section key={key} className="rounded-3xl border border-white/60 bg-white/42 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
                    <h3 className="mb-3 text-sm font-black text-accent">{resultLabels[key] || key}</h3>
                    <pre className="whitespace-pre-wrap break-words text-sm leading-7 font-sans">{renderValue(value)}</pre>
                  </section>
                ))}
              </div>
            ) : (
              <div className="mt-24 text-center text-sm text-muted-foreground">填写左侧内容后，结果会显示在这里。</div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
