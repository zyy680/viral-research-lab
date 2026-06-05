import { ToolRunner } from "@/components/tool-runner";

export default function CopyOptimizePage() {
  return (
    <ToolRunner
      config={{
        title: "AI文案优化",
        description: "根据文案目标和风格，把原始文案优化成两版长度接近、可直接发布的内容。",
        endpoint: "/api/tools/copy-optimize",
        modelSelect: true,
        cost: 10,
        fields: [
          { name: "goal", label: "文案目标", type: "select", options: ["流量", "涨粉", "转化"] },
          { name: "rawCopy", label: "原始文案", type: "textarea" }
        ]
      }}
    />
  );
}
