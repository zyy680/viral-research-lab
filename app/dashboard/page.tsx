import Link from "next/link";
import { BarChart3, ClipboardList, FileText, ScanText, Target, UserCircle, Video } from "lucide-react";
import { Card } from "@/components/ui";
import { Logo } from "@/components/site-shell";
import { LogoutButton } from "@/components/logout-button";
import { TokenWallet } from "@/components/token-wallet";
import { UsageHistory } from "@/components/usage-history";

const tools = [
  { name: "AI账号定位师", href: "/tools/positioning", icon: Target, text: "定位、人设、选题和变现路径" },
  { name: "AI文案优化", href: "/tools/copy-optimize", icon: FileText, text: "按流量、涨粉、转化重写文案" },
  { name: "文案提取器", href: "/tools/extract", icon: ScanText, text: "提取抖音、小红书口播内容" },
  { name: "文案拆解大师", href: "/tools/analyze", icon: ClipboardList, text: "拆结构、公式和同款模板" },
  { name: "数字人视频生成", href: "/tools/digital-human", icon: Video, text: "形象照和文案生成口播视频" }
];

export default async function DashboardPage() {
  const session = { user: { id: "demo-user", name: "演示用户", email: "demo@example.com" } };
  const history = process.env.DATABASE_URL
    ? await (await import("@/lib/prisma")).prisma.usageHistory.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    : [];
  const serverHistory = history.map((item) => ({
    id: item.id,
    toolName: item.toolName,
    input: "input" in item ? (item.input as Record<string, unknown>) : {},
    output: "output" in item ? (item.output as Record<string, unknown>) : {},
    createdAt: item.createdAt.toISOString()
  }));

  return (
    <main className="min-h-screen">
      <header className="border-b border-white/50 bg-white/45 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-white/60 bg-white/45 px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur-2xl sm:flex">
              <UserCircle className="h-4 w-4" />
              {session.user.name || session.user.email}
            </div>
            <TokenWallet compact />
            <Link href="/dashboard" className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:bg-white/50 sm:block">个人中心</Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="dopamine-panel flex items-center justify-between gap-4 rounded-[2rem] p-6">
          <div>
            <h1 className="text-3xl font-black">创作工作台</h1>
            <p className="mt-2 font-medium text-muted-foreground">选择工具，快速完成定位、文案、拆解和数字人口播。</p>
          </div>
          <span className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-accent/90 text-accent-foreground shadow-xl shadow-pink-300/25 sm:flex">
            <BarChart3 className="h-7 w-7" />
          </span>
        </div>

        <section className="mt-6">
          <TokenWallet />
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <Card className="h-full p-5 transition hover:-translate-y-1 hover:bg-white/65">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/85 text-foreground shadow-lg shadow-lime-300/20">
                  <tool.icon className="h-7 w-7" />
                </span>
                <h2 className="mt-5 font-black">{tool.name}</h2>
                <p className="mt-2 min-h-10 text-sm font-medium leading-5 text-muted-foreground">{tool.text}</p>
              </Card>
            </Link>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-black">最近使用记录</h2>
          <UsageHistory serverHistory={serverHistory} />
        </section>
      </section>
    </main>
  );
}
