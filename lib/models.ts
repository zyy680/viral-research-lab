export const aiModels = [
  {
    label: "豆包轻量模型",
    value: "doubao-seed-2-0-mini-260428",
    description: "速度快，适合日常文案生成。"
  },
  {
    label: "Gemini 轻量模型",
    value: "gemini-3.1-flash-lite",
    description: "速度快，适合低成本批量生成。"
  },
  {
    label: "GPT深度模型",
    value: "gpt-5.1-2025-11-13",
    description: "适合复杂定位、深度拆解和高质量改写。"
  }
] as const;

export function getAllowedModel(value?: string | null) {
  if (!value) return process.env.AI_MODEL || aiModels[0].value;
  return aiModels.some((model) => model.value === value) ? value : process.env.AI_MODEL || aiModels[0].value;
}
