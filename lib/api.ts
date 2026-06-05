export async function requireUser() {
  if (!process.env.DATABASE_URL) {
    return { id: "demo-user", name: "演示用户", email: "demo@example.com" };
  }

  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session.user : null;
}

export function unauthorized() {
  return Response.json({ error: "请先登录后再使用工具" }, { status: 401 });
}

export async function saveUsage(userId: string, toolName: string, input: unknown, output: unknown) {
  if (!process.env.DATABASE_URL) return;
  const { prisma } = await import("@/lib/prisma");
  await prisma.usageHistory.create({
    data: { userId, toolName, input: input as object, output: output as object }
  });
}

export class InsufficientCreditsError extends Error {
  constructor(required: number) {
    super(`积分不足，本次需要 ${required} 积分，请先充值`);
    this.name = "InsufficientCreditsError";
  }
}

export function isInsufficientCreditsError(error: unknown) {
  return error instanceof InsufficientCreditsError || (error instanceof Error && error.name === "InsufficientCreditsError");
}

export async function ensureCredits(userId: string, amount: number) {
  if (!process.env.DATABASE_URL) return;
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true }
  });
  if (!user || user.creditBalance < amount) {
    throw new InsufficientCreditsError(amount);
  }
}

export async function spendCredits(userId: string, amount: number, toolName: string, metadata?: unknown) {
  if (!process.env.DATABASE_URL) return;
  const { prisma } = await import("@/lib/prisma");

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true }
    });

    if (!user || user.creditBalance < amount) {
      throw new InsufficientCreditsError(amount);
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { decrement: amount } },
      select: { creditBalance: true }
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "SPEND",
        amount: -amount,
        balanceAfter: updated.creditBalance,
        toolName,
        description: `${toolName} 消耗 ${amount} 积分`,
        ...(metadata === undefined ? {} : { metadata: metadata as object })
      }
    });
  });
}
