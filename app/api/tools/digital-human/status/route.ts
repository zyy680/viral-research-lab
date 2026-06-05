import { NextResponse } from "next/server";

const HEYGEN_API_BASE = "https://api.heygen.com";
const YUNWU_VIDEO_ENDPOINT = "/kling/v1/videos/avatar/image2video";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getServiceOrigin(baseURL: string) {
  try {
    return new URL(baseURL).origin;
  } catch {
    return baseURL.replace(/\/v1$/, "").replace(/\/$/, "");
  }
}

function normalizeStatus(data: JsonRecord) {
  const dataNode = asRecord(data.data);
  const outputNode = asRecord(data.output);
  const taskResultNode = asRecord(dataNode.task_result);
  const videos = Array.isArray(taskResultNode.videos) ? taskResultNode.videos : [];
  const firstVideo = asRecord(videos[0]);
  const errorNode = asRecord(data.error);

  const status = data.status || dataNode.status || outputNode.status || dataNode.task_status;
  const videoUrl =
    data.video_url ||
    data.url ||
    dataNode.video_url ||
    dataNode.url ||
    outputNode.video_url ||
    firstVideo.url;
  const error = stringValue(errorNode.message) || stringValue(data.error) || stringValue(dataNode.error) || stringValue(data.message);

  return {
    status: videoUrl ? "completed" : status === "failed" || status === "error" ? "failed" : "processing",
    videoUrl,
    error
  };
}

export async function GET(request: Request) {
  const apiKey = process.env.DIGITAL_HUMAN_PROVIDER === "heygen" ? process.env.HEYGEN_API_KEY || "" : process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId") || "";
  const statusUrl = url.searchParams.get("statusUrl") || "";

  if (!apiKey) {
    return NextResponse.json({ error: "数字人服务未配置" }, { status: 400 });
  }
  if (!taskId) {
    return NextResponse.json({ error: "缺少任务编号" }, { status: 400 });
  }

  try {
    if ((process.env.DIGITAL_HUMAN_PROVIDER || "yunwu") === "yunwu") {
      const baseURL = (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || "https://yunwu.ai/v1").replace(/\/$/, "");
      const serviceOrigin = getServiceOrigin(baseURL);
      const videoEndpoint = process.env.DIGITAL_HUMAN_ENDPOINT || YUNWU_VIDEO_ENDPOINT;
      const endpoint = statusUrl || `${serviceOrigin}${videoEndpoint}/${encodeURIComponent(taskId)}`;
      const response = await fetch(endpoint, {
        headers: { authorization: `Bearer ${apiKey}` }
      });
      const data = asRecord(await response.json());
      if (!response.ok) {
        const errorNode = asRecord(data.error);
        throw new Error(stringValue(errorNode.message) || stringValue(data.message) || "查询云雾视频状态失败");
      }
      return NextResponse.json(normalizeStatus(data));
    }

    const response = await fetch(`${HEYGEN_API_BASE}/v1/video_status.get?video_id=${encodeURIComponent(taskId)}`, {
      headers: { "x-api-key": apiKey }
    });
    const data = asRecord(await response.json());
    if (!response.ok) {
      throw new Error(stringValue(data.message) || stringValue(data.error) || "查询视频状态失败");
    }

    const dataNode = asRecord(data.data);
    const status = dataNode.status || data.status;
    const videoUrl = dataNode.video_url || data.video_url;
    const error = dataNode.error || data.error;

    return NextResponse.json({
      status: status === "completed" ? "completed" : status === "failed" ? "failed" : "processing",
      videoUrl,
      error
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询视频状态失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
