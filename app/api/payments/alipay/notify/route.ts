import { NextResponse } from "next/server";

export async function POST() {
  // Alipay notifications must verify the Alipay signature before marking orders as paid.
  // Keep this locked until merchant credentials are configured.
  return NextResponse.json(
    {
      error: "支付宝回调未配置"
    },
    { status: 400 }
  );
}

