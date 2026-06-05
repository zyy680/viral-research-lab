"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Button, Card } from "@/components/ui";

type HistoryItem = {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  createdAt: string;
};

function renderValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item, index) => `${index + 1}. ${renderValue(item)}`).join("\n");
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${key}：${renderValue(item)}`).join("\n");
  }
  return String(value ?? "");
}

function renderInput(input: Record<string, unknown>) {
  return Object.entries(input)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .map(([key, value]) => `${key}：${renderValue(value)}`)
    .join("\n");
}

export function UsageHistory({ serverHistory }: { serverHistory: HistoryItem[] }) {
  const [items, setItems] = useState<HistoryItem[]>(serverHistory);
  const [openId, setOpenId] = useState<string | null>(serverHistory[0]?.id || null);

  useEffect(() => {
    const localItems = JSON.parse(localStorage.getItem("viral-lab-history") || "[]") as HistoryItem[];
    if (localItems.length) {
      setItems(localItems);
      setOpenId(localItems[0]?.id || null);
    }
  }, []);

  if (!items.length) {
    return <Card className="mt-4 p-6 text-sm font-medium text-muted-foreground">暂无记录，先从一个工具开始。</Card>;
  }

  return (
    <Card className="mt-4 divide-y divide-white/45 overflow-hidden">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const outputText = renderValue(item.output);
        return (
          <section key={item.id} className="p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              <div>
                <p className="font-black">{item.toolName}</p>
                <p className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString("zh-CN")}</p>
              </div>
              {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </button>
            {isOpen ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/60 bg-white/42 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
                  <h3 className="mb-3 text-sm font-black text-accent">输入内容</h3>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7">{renderInput(item.input) || "无输入详情"}</pre>
                </div>
                <div className="rounded-3xl border border-white/60 bg-white/42 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-accent">生成结果</h3>
                    <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(outputText)}>
                      <Copy className="h-4 w-4" /> 复制
                    </Button>
                  </div>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-7">{outputText}</pre>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </Card>
  );
}
