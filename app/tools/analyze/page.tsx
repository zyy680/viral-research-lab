import { ToolRunner } from "@/components/tool-runner";

export default function AnalyzePage() {
  return (
    <ToolRunner
      config={{
        title: "文案拆解大师",
        description: "拆解钩子、痛点、利益点、情绪设计、结构、爆款公式、仿写模板，并生成同结构文案。",
        endpoint: "/api/tools/analyze",
        modelSelect: true,
        cost: 40,
        fields: [{ name: "copy", label: "文案内容", type: "textarea" }]
      }}
    />
  );
}
