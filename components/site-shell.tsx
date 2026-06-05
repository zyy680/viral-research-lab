import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-3 font-black tracking-normal">
      <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[1.05rem] border border-white/70 bg-white/55 shadow-xl shadow-pink-300/25 backdrop-blur-2xl transition group-hover:-translate-y-0.5">
        <span className="absolute inset-0 bg-[linear-gradient(135deg,#a6ff3d_0%,#ff3cae_72%)] opacity-90" />
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-white/80" />
        <span className="relative text-[1.35rem] font-black leading-none text-[#101122]">爆</span>
      </span>
      <span className="leading-tight">
        <span className="block text-lg">爆款研究所</span>
        <span className="hidden text-[0.68rem] font-black uppercase tracking-[0.24em] text-accent sm:block">Viral Lab</span>
      </span>
    </Link>
  );
}

export function PublicNav() {
  return (
    <header className="border-b border-white/55 bg-white/55 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/recharge" className="hidden h-10 items-center rounded-full border border-transparent px-4 text-sm font-semibold hover:border-white/60 hover:bg-white/45 sm:inline-flex">
            套餐
          </Link>
          <Link href="/login" className="hidden h-10 items-center rounded-full border border-transparent px-4 text-sm font-semibold hover:border-white/60 hover:bg-white/45 sm:inline-flex">
            登录
          </Link>
          <Link href="/register" className="inline-flex h-10 items-center rounded-full border border-white/60 bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-lime-300/30 transition hover:-translate-y-0.5">
            免费注册
          </Link>
        </div>
      </div>
    </header>
  );
}
