"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Chrome, LogIn } from "lucide-react";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { Logo } from "@/components/site-shell";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    if (!process.env.NEXT_PUBLIC_REQUIRE_AUTH) {
      router.push("/dashboard");
      return;
    }
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false
    });
    setLoading(false);
    if (result?.error) return setError("邮箱或密码不正确");
    router.push("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md p-7">
        <Logo />
        <h1 className="mt-8 text-3xl font-black">登录</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>邮箱</Label>
            <Input name="email" type="email" required placeholder="creator@example.com" />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input name="password" type="password" required placeholder="请输入密码" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={loading} className="w-full">
            <LogIn className="h-4 w-4" /> {loading ? "登录中..." : "邮箱登录"}
          </Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
          <Chrome className="h-4 w-4" /> Google登录
        </Button>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          还没有账号？<Link className="text-primary" href="/register">立即注册</Link>
        </p>
      </Card>
    </main>
  );
}
