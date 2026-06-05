import { NextResponse } from "next/server";
import { initialCredits } from "@/lib/credits";
import { requireUser, unauthorized } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      mode: "demo",
      balance: initialCredits,
      totalRecharged: 0,
      transactions: []
    });
  }

  const { prisma } = await import("@/lib/prisma");
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { creditBalance: true }
  });
  const transactions = await prisma.creditTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  const totalRecharged = await prisma.creditTransaction.aggregate({
    where: { userId: user.id, type: "RECHARGE" },
    _sum: { amount: true }
  });

  return NextResponse.json({
    mode: "database",
    balance: dbUser?.creditBalance ?? initialCredits,
    totalRecharged: totalRecharged._sum.amount ?? 0,
    transactions
  });
}
