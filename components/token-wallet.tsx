"use client";

import Link from "next/link";
import { Coins, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { readWallet, syncWalletFromServer, type Wallet } from "@/lib/wallet";

export function TokenWallet({ compact = false }: { compact?: boolean }) {
  const [wallet, setWallet] = useState<Wallet>(() => readWallet());

  useEffect(() => {
    const update = () => setWallet(readWallet());
    syncWalletFromServer().then(setWallet);
    update();
    window.addEventListener("storage", update);
    window.addEventListener("viral-lab-wallet-updated", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("viral-lab-wallet-updated", update);
    };
  }, []);

  if (compact) {
    return (
      <Link href="/recharge" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/60 bg-white/45 px-3 text-sm font-bold shadow-sm backdrop-blur-2xl hover:bg-white/70">
        <Coins className="h-4 w-4 text-accent" />
        {wallet.balance} 积分
      </Link>
    );
  }

  return (
    <div className="dopamine-panel rounded-[2rem] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-accent">账户余额</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-4xl font-black">{wallet.balance}</span>
            <span className="pb-1 text-sm font-bold text-muted-foreground">积分</span>
          </div>
          <p className="mt-2 text-sm font-medium text-muted-foreground">生成内容会按工具扣除积分。</p>
        </div>
        <Link href="/recharge" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/60 bg-primary px-5 text-sm font-black text-primary-foreground shadow-xl shadow-lime-300/30 transition hover:-translate-y-0.5">
          <Plus className="h-4 w-4" />
          充值
        </Link>
      </div>
    </div>
  );
}
