import { ToolRunner } from "@/components/tool-runner";

export default function ExtractPage() {
  return (
    <ToolRunner
      config={{
        title: "文案提取器",
        description: "输入抖音或小红书链接，自动解析视频并转写完整口播文案。",
        endpoint: "/api/tools/extract",
        multipart: true,
        cost: 35,
        fields: [
          { name: "douyinLink", label: "抖音链接转文字", required: false },
          { name: "xhsLink", label: "小红书链接转文字", required: false }
        ]
      }}
    />
  );
}
