"use client";

import Link from "next/link";
import { ArrowLeft, Check, Coins, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { TokenWallet } from "@/components/token-wallet";
import { rechargePackages } from "@/lib/credits";
import { rechargePackage } from "@/lib/wallet";

export default function RechargePage() {
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState<"wechat" | "alipay">("wechat");

  async function recharge(packageId: string, points: number, name: string) {
    const result = await rechargePackage(packageId, provider, points);
    if (!result.ok) {
      setMessage(`${result.message}${result.missingEnv?.length ? `：${result.missingEnv.join("、")}` : ""}`);
      return;
    }
    setMessage(result.demo ? `已提交${provider === "wechat" ? "微信" : "支付宝"} ${name}，演示模式下到账 ${points} 积分。` : result.message || "已创建支付订单，请完成支付。");
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/45 px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm backdrop-blur-2xl hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 返回 Dashboard
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-6">
            <TokenWallet />
            <Card className="p-6">
              <div className="inline-flex rounded-full bg-accent/90 px-4 py-2 text-sm font-black text-accent-foreground shadow-lg shadow-pink-300/20">
                充值说明
              </div>
              <ul className="mt-5 space-y-3 text-sm font-medium leading-6 text-muted-foreground">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-accent" /> 本地无数据库时是演示充值，不会真实扣款。</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-accent" /> 配置微信或支付宝商户资料后，才会创建真实支付订单。</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-accent" /> 正式版会把余额、订单和使用记录保存到用户账号数据库。</li>
              </ul>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/85 px-4 py-2 text-sm font-black text-primary-foreground shadow-lg shadow-lime-300/20">
                  <Coins className="h-4 w-4" />
                  积分充值
                </div>
                <h1 className="text-3xl font-black">选择适合你的创作套餐</h1>
                <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">积分可用于账号定位、文案优化、文案提取、拆解和数字人视频生成。</p>
              </div>
              <Sparkles className="hidden h-10 w-10 text-accent sm:block" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { id: "wechat" as const, name: "微信支付", desc: "适合国内用户扫码支付" },
                { id: "alipay" as const, name: "支付宝", desc: "适合支付宝扫码或跳转支付" }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setProvider(item.id)}
                  className={[
                    "rounded-3xl border p-4 text-left shadow-lg backdrop-blur-xl transition hover:-translate-y-0.5",
                    provider === item.id ? "border-white/70 bg-primary/55 shadow-lime-300/25" : "border-white/60 bg-white/42 shadow-slate-900/5"
                  ].join(" ")}
                >
                  <p className="font-black">{item.name}</p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">{item.desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {rechargePackages.map((item) => (
                <div key={item.name} className="rounded-3xl border border-white/60 bg-white/42 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-black">{item.name}</h2>
                    <span className="rounded-full bg-accent/90 px-3 py-1 text-xs font-black text-accent-foreground">{item.tag}</span>
                  </div>
                  <p className="mt-4 text-sm font-medium leading-6 text-muted-foreground">{item.desc}</p>
                  <div className="mt-5">
                    <span className="text-sm font-bold">¥</span>
                    <span className="text-4xl font-black">{item.price}</span>
                  </div>
                  <p className="mt-2 text-sm font-black text-accent">{item.points} 积分</p>
                  <Button className="mt-5 w-full" onClick={() => recharge(item.id, item.points, item.name)}>
                    立即充值
                  </Button>
                </div>
              ))}
            </div>

            {message ? (
              <div className="mt-5 rounded-3xl border border-white/60 bg-primary/35 p-4 text-sm font-black text-foreground shadow-lg shadow-lime-300/20 backdrop-blur-xl">
                {message}
              </div>
            ) : null}
          </Card>
        </section>
      </div>
    </main>
  );
}
