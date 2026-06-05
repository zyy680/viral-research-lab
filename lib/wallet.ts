"use client";

export const WALLET_STORAGE_KEY = "viral-lab-wallet";

export type Wallet = {
  balance: number;
  totalRecharged: number;
  updatedAt: string;
  mode?: "demo" | "database";
};

const defaultWallet: Wallet = {
  balance: 120,
  totalRecharged: 0,
  updatedAt: new Date().toISOString()
};

export function readWallet(): Wallet {
  if (typeof window === "undefined") return defaultWallet;
  const raw = localStorage.getItem(WALLET_STORAGE_KEY);
  if (!raw) return defaultWallet;

  try {
    const wallet = JSON.parse(raw) as Partial<Wallet>;
    return {
      balance: Number(wallet.balance ?? defaultWallet.balance),
      totalRecharged: Number(wallet.totalRecharged ?? 0),
      updatedAt: wallet.updatedAt || defaultWallet.updatedAt,
      mode: wallet.mode
    };
  } catch {
    return defaultWallet;
  }
}

export function saveWallet(wallet: Wallet) {
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
  window.dispatchEvent(new Event("viral-lab-wallet-updated"));
}

export function rechargeWallet(points: number) {
  const current = readWallet();
  const next = {
    balance: current.balance + points,
    totalRecharged: current.totalRecharged + points,
    updatedAt: new Date().toISOString()
  };
  saveWallet(next);
  return next;
}

export async function syncWalletFromServer() {
  try {
    const response = await fetch("/api/wallet");
    if (!response.ok) return readWallet();
    const data = await response.json();
    if (data.mode !== "database") return readWallet();
    const next = {
      balance: Number(data.balance ?? 0),
      totalRecharged: Number(data.totalRecharged ?? 0),
      updatedAt: new Date().toISOString(),
      mode: "database" as const
    };
    saveWallet(next);
    return next;
  } catch {
    return readWallet();
  }
}

export async function rechargePackage(packageId: string, provider: "wechat" | "alipay", fallbackPoints: number) {
  try {
    const response = await fetch("/api/recharge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId, provider })
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        ok: false,
        message: data.message || data.error || "充值失败",
        missingEnv: data.missingEnv as string[] | undefined
      };
    }
    if (data.mode === "demo") {
      rechargeWallet(Number(data.balanceAdded ?? fallbackPoints));
      return { ok: true, demo: true };
    }
    await syncWalletFromServer();
    return { ok: true, demo: false, message: data.message as string | undefined };
  } catch {
    rechargeWallet(fallbackPoints);
    return { ok: true, demo: true };
  }
}

export function spendWallet(points: number) {
  const current = readWallet();
  if (current.balance < points) return { ok: false, wallet: current };
  const next = {
    ...current,
    balance: current.balance - points,
    updatedAt: new Date().toISOString()
  };
  saveWallet(next);
  return { ok: true, wallet: next };
}
