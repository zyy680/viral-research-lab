import { ToolRunner } from "@/components/tool-runner";

export default function PositioningPage() {
  return (
    <ToolRunner
      config={{
        title: "AI账号定位师",
        description: "输入你的真实背景、兴趣、行业经验和资源，生成适合起号的账号定位、内容方向、变现路径和首月选题。",
        endpoint: "/api/tools/positioning",
        modelSelect: true,
        cost: 30,
        fields: [
          { name: "age", label: "年龄" },
          { name: "education", label: "学历" },
          { name: "city", label: "所在城市" },
          { name: "expertInterests", label: "兴趣爱好（精通）", type: "textarea" },
          { name: "familiarIndustries", label: "之前做过的/熟悉的行业", type: "textarea" },
          { name: "industryResources", label: "有无在任何行业有资源", type: "textarea" }
        ]
      }}
    />
  );
}
