export type PaymentProvider = "wechat" | "alipay";

export const paymentProviders: Array<{
  id: PaymentProvider;
  name: string;
  label: string;
  envKeys: string[];
}> = [
  {
    id: "wechat",
    name: "微信支付",
    label: "微信",
    envKeys: ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PRIVATE_KEY", "WECHAT_PAY_CERT_SERIAL_NO"]
  },
  {
    id: "alipay",
    name: "支付宝",
    label: "支付宝",
    envKeys: ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY", "ALIPAY_PUBLIC_KEY"]
  }
];

export function getPaymentProvider(id: string) {
  return paymentProviders.find((provider) => provider.id === id);
}

export function getPaymentConfigStatus(provider: PaymentProvider) {
  const config = paymentProviders.find((item) => item.id === provider);
  if (!config) return { configured: false, missing: [] as string[] };
  const missing = config.envKeys.filter((key) => !process.env[key]);
  return {
    configured: missing.length === 0,
    missing
  };
}

