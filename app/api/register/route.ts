import { NextResponse } from "next/server";
import { z } from "zod";
import { initialCredits } from "@/lib/credits";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请填写有效的注册信息" }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      user: {
        id: "demo-user",
        name: parsed.data.name,
        email: parsed.data.email
      }
    });
  }

  const { default: bcrypt } = await import("bcryptjs");
  const { prisma } = await import("@/lib/prisma");
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const password = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: { ...parsed.data, password, creditBalance: initialCredits },
    select: { id: true, name: true, email: true }
  });

  return NextResponse.json({ user });
}
