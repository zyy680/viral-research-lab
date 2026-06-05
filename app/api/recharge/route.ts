import { NextResponse } from "next/server";
import { z } from "zod";
import { getRechargePackage } from "@/lib/credits";
import { requireUser, unauthorized } from "@/lib/api";
import { getPaymentConfigStatus, getPaymentProvider } from "@/lib/payments";

const schema = z.object({
  packageId: z.string(),
  provider: z.enum(["wechat", "alipay"]).default("wechat")
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请选择充值套餐" }, { status: 400 });
  }

  const pack = getRechargePackage(parsed.data.packageId);
  if (!pack) {
    return NextResponse.json({ error: "充值套餐不存在" }, { status: 404 });
  }
  const provider = getPaymentProvider(parsed.data.provider);
  if (!provider) {
    return NextResponse.json({ error: "支付方式不存在" }, { status: 404 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      mode: "demo",
      provider: provider.id,
      order: {
        id: `demo-${Date.now()}`,
        packageId: pack.id,
        packageName: pack.name,
        amountCents: pack.amountCents,
        credits: pack.points,
        status: "PAID",
        provider: provider.id
      },
      balanceAdded: pack.points
    });
  }

  const { prisma } = await import("@/lib/prisma");
  const configStatus = getPaymentConfigStatus(provider.id);
  if (!configStatus.configured) {
    const order = await prisma.rechargeOrder.create({
      data: {
        userId: user.id,
        packageId: pack.id,
        packageName: pack.name,
        amountCents: pack.amountCents,
        credits: pack.points,
        status: "PENDING_CONFIG",
        provider: provider.id,
        metadata: {
          missingEnv: configStatus.missing,
          note: "支付商户资料未配置，暂未创建真实支付订单"
        }
      }
    });

    return NextResponse.json(
      {
        order,
        provider: provider.id,
        requiresConfig: true,
        missingEnv: configStatus.missing,
        message: `请先配置${provider.name}商户资料`
      },
      { status: 400 }
    );
  }

  // Real WeChat Pay / Alipay order creation will be plugged in here after merchant credentials are configured.
  // The order is intentionally left pending so credits are only added by a verified payment callback.
  const pendingOrder = await prisma.rechargeOrder.create({
    data: {
      userId: user.id,
      packageId: pack.id,
      packageName: pack.name,
      amountCents: pack.amountCents,
      credits: pack.points,
      status: "PENDING_PAYMENT",
      provider: provider.id,
      metadata: { note: "等待接入真实支付下单接口" }
    }
  });

  return NextResponse.json({
    order: pendingOrder,
    provider: provider.id,
    status: "PENDING_PAYMENT",
    message: "支付通道配置已存在，下一步接入真实下单接口"
  });

  /*
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.rechargeOrder.create({
      data: {
        userId: user.id,
        packageId: pack.id,
        packageName: pack.name,
        amountCents: pack.amountCents,
        credits: pack.points,
        status: "PAID",
        provider: "demo",
        paidAt: new Date(),
        metadata: { note: "演示支付成功，后续替换为真实支付回调" }
      }
    });

    const updated = await tx.user.update({
      where: { id: user.id },
      data: { creditBalance: { increment: pack.points } },
      select: { creditBalance: true }
    });

    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        type: "RECHARGE",
        amount: pack.points,
        balanceAfter: updated.creditBalance,
        description: `${pack.name} 充值到账 ${pack.points} 积分`,
        metadata: { orderId: order.id, packageId: pack.id }
      }
    });

    return { order, balance: updated.creditBalance };
  });

  return NextResponse.json(result);
  */
}
