export const initialCredits = 120;

export const toolCosts = {
  positioning: 30,
  copyOptimize: 10,
  extract: 35,
  analyze: 40,
  digitalHuman: 200
} as const;

export const rechargePackages = [
  {
    id: "starter",
    name: "体验包",
    price: "9.9",
    amountCents: 990,
    points: 300,
    tag: "适合试用",
    desc: "适合少量生成标题、文案和拆解。"
  },
  {
    id: "creator",
    name: "创作者包",
    price: "29.9",
    amountCents: 2990,
    points: 1200,
    tag: "推荐",
    desc: "适合日常做账号定位、文案优化和拆解。"
  },
  {
    id: "growth",
    name: "增长包",
    price: "99",
    amountCents: 9900,
    points: 5200,
    tag: "更划算",
    desc: "适合高频创作、团队试用和批量内容生产。"
  }
] as const;

export function getRechargePackage(packageId: string) {
  return rechargePackages.find((item) => item.id === packageId);
}
