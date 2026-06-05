"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Play, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { readWallet, spendWallet, syncWalletFromServer } from "@/lib/wallet";

type VideoResult = {
  status?: string;
  videoUrl?: string;
  taskId?: string;
  statusUrl?: string;
  error?: string;
};

export function DigitalHumanRunner() {
  const cost = 200;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<VideoResult | null>(null);
  const pollRef = useRef<number | null>(null);

  async function poll(taskId: string, statusUrl?: string) {
    setStatus("正在生成视频...");
    pollRef.current = window.setInterval(async () => {
      const response = await fetch(`/api/tools/digital-human/status?taskId=${encodeURIComponent(taskId)}${statusUrl ? `&statusUrl=${encodeURIComponent(statusUrl)}` : ""}`);
      const data = await response.json();
      if (!response.ok || data.status === "failed") {
        if (pollRef.current) window.clearInterval(pollRef.current);
        setLoading(false);
        setStatus(data.error || "数字人视频生成失败");
        setResult(data);
      }
      if (data.status === "completed" && data.videoUrl) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        setLoading(false);
        setStatus("生成完成");
        setResult(data);
      }
    }, 5000);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wallet = readWallet();
    if (wallet.balance < cost) {
      setStatus(`积分不足，本次需要 ${cost} 积分，请先充值。`);
      setResult({ error: `积分不足，本次需要 ${cost} 积分，请先充值。` });
      return;
    }

    setLoading(true);
    setStatus("正在提交任务...");
    setResult(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/tools/digital-human", {
      method: "POST",
      body: form
    });
    const data = await response.json();

    if (!response.ok) {
      setLoading(false);
      setStatus(data.error || "数字人视频生成失败");
      setResult(data);
      return;
    }

    setResult(data);
    spendWallet(cost);
    await syncWalletFromServer();
    if (data.videoUrl) {
      setLoading(false);
      setStatus("生成完成");
      return;
    }
    if (data.taskId) {
      await poll(data.taskId, data.statusUrl);
      return;
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/45 px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm backdrop-blur-2xl hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 返回 Dashboard
        </Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6">
            <div className="mb-5 inline-flex rounded-full bg-primary/85 px-4 py-2 text-sm font-black text-primary-foreground shadow-lg shadow-lime-300/20">
              AI 视频工具 · {cost} 积分/次
            </div>
            <h1 className="text-3xl font-black">数字人视频生成</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">上传授权形象照，输入文案，生成一段数字人口播视频。</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>用户形象照</Label>
                <Input name="image" type="file" accept="image/*" required />
              </div>
              <div className="space-y-2">
                <Label>视频文案</Label>
                <Textarea name="script" required />
              </div>
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input name="consent" value="yes" type="checkbox" required className="mt-1" />
                我确认已获得该形象照授权，并同意用于生成数字人视频。
              </label>
              <Button disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {loading ? "生成中..." : "生成视频"}
              </Button>
              {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            </form>
          </Card>
          <Card className="min-h-[520px] p-6">
            <h2 className="text-xl font-black">生成结果</h2>
            {result?.videoUrl ? (
              <div className="mt-5 space-y-4">
                <video src={result.videoUrl} controls className="aspect-video w-full rounded-md border bg-black" />
                <a className="inline-flex items-center gap-2 text-sm font-medium text-primary" href={result.videoUrl} target="_blank">
                  <Play className="h-4 w-4" /> 打开视频
                </a>
              </div>
            ) : (
              <div className="mt-24 text-center text-sm text-muted-foreground">
                {result?.error || "提交任务后，数字人视频会显示在这里。"}
                {result?.error?.includes("积分不足") ? <Link className="ml-1 text-accent underline" href="/recharge">去充值</Link> : null}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
