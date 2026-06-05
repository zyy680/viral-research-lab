import { NextResponse } from "next/server";

export async function POST() {
  // WeChat Pay v3 notifications must be verified and decrypted with the merchant API v3 key.
  // Keep this locked until merchant credentials are configured.
  return NextResponse.json(
    {
      code: "FAIL",
      message: "微信支付回调未配置"
    },
    { status: 400 }
  );
}

