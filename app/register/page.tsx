"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { Logo } from "@/components/site-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const data = await response.json();
      setLoading(false);
      return setError(data.error || "注册失败");
    }
    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md p-7">
        <Logo />
        <h1 className="mt-8 text-3xl font-black">注册</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input name="name" required placeholder="你的昵称" />
          </div>
          <div className="space-y-2">
            <Label>邮箱</Label>
            <Input name="email" type="email" required placeholder="creator@example.com" />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input name="password" type="password" required minLength={6} placeholder="至少 6 位" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={loading} className="w-full">
            <UserPlus className="h-4 w-4" /> {loading ? "创建中..." : "创建账号"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          已有账号？<Link className="text-primary" href="/login">去登录</Link>
        </p>
      </Card>
    </main>
  );
}
