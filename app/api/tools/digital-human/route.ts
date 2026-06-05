import { NextResponse } from "next/server";
import { ensureCredits, isInsufficientCreditsError, requireUser, saveUsage, spendCredits, unauthorized } from "@/lib/api";
import { toolCosts } from "@/lib/credits";

const HEYGEN_API_BASE = "https://api.heygen.com";
const YUNWU_VIDEO_MODEL = "kling-avatar-image2video";
const YUNWU_VIDEO_ENDPOINT = "/kling/v1/videos/avatar/image2video";
const YUNWU_SPEECH_MODEL = "speech-02-turbo";
const YUNWU_SPEECH_ENDPOINT = "/minimax/v1/t2a_v2";
const DEFAULT_SPEECH_VOICE = "Chinese (Mandarin)_Warm_Girl";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function imageToDataUrl(image: File) {
  const bytes = Buffer.from(await image.arrayBuffer());
  const mimeType = image.type || "image/png";
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

async function blobToDataUrl(blob: Blob) {
  const bytes = Buffer.from(await blob.arrayBuffer());
  const mimeType = blob.type || "audio/mpeg";
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function hexToDataUrl(hexAudio: string) {
  const normalized = hexAudio.replace(/^0x/, "").replace(/\s/g, "");
  const bytes = Buffer.from(normalized, "hex");
  return `data:audio/mpeg;base64,${bytes.toString("base64")}`;
}

function looksLikeAudioUrl(value: string) {
  return /^https?:\/\//i.test(value) && /\.(mp3|m4a|wav|aac|ogg|flac)(\?|$)/i.test(value);
}

function looksLikeDataAudio(value: string) {
  return value.startsWith("data:audio/");
}

function looksLikeBase64Audio(value: string) {
  return value.length > 200 && /^[A-Za-z0-9+/=]+$/.test(value);
}

function looksLikeHexAudio(value: string) {
  return value.length > 200 && /^[\da-fA-F\s]+$/.test(value);
}

function findAudioValue(value: unknown, key = ""): string | null {
  if (typeof value === "string") {
    if (looksLikeDataAudio(value) || looksLikeAudioUrl(value)) return value;
    if (/audio|voice|file|url/i.test(key) && looksLikeHexAudio(value)) return hexToDataUrl(value);
    if (/audio|voice|file/i.test(key) && looksLikeBase64Audio(value)) return `data:audio/mpeg;base64,${value}`;
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAudioValue(item, key);
      if (found) return found;
    }
    return null;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const prioritized = entries.sort(([a], [b]) => {
      const score = (name: string) => (/audio|voice|file|url/i.test(name) ? 0 : 1);
      return score(a) - score(b);
    });
    for (const [childKey, item] of prioritized) {
      const found = findAudioValue(item, childKey);
      if (found) return found;
    }
  }

  return null;
}

function summarizeKeys(value: unknown, depth = 0): string {
  if (!value || typeof value !== "object" || depth > 2) return "";
  return Object.entries(value as Record<string, unknown>)
    .slice(0, 12)
    .map(([key, item]) => {
      if (item && typeof item === "object") {
        const nested = summarizeKeys(item, depth + 1);
        return nested ? `${key}.{${nested}}` : key;
      }
      return key;
    })
    .join(", ");
}

function getServiceOrigin(baseURL: string) {
  try {
    return new URL(baseURL).origin;
  } catch {
    return baseURL.replace(/\/v1$/, "").replace(/\/$/, "");
  }
}

function pickTask(data: JsonRecord) {
  const dataNode = asRecord(data.data);
  const outputNode = asRecord(data.output);
  const taskNode = asRecord(dataNode.task);
  const taskResultNode = asRecord(dataNode.task_result);
  const videos = Array.isArray(taskResultNode.videos) ? taskResultNode.videos : [];
  const firstVideo = asRecord(videos[0]);

  return {
    taskId: data.id || data.task_id || data.video_id || dataNode.id || dataNode.task_id || dataNode.video_id || taskNode.id,
    videoUrl:
      data.video_url ||
      data.url ||
      outputNode.video_url ||
      dataNode.video_url ||
      dataNode.url ||
      firstVideo.url,
    statusUrl: data.status_url || dataNode.status_url
  };
}

async function createSpeechAudio(script: string, apiKey: string, baseURL: string) {
  const speechBaseURL = (process.env.SPEECH_BASE_URL || getServiceOrigin(baseURL)).replace(/\/$/, "");
  const speechEndpoint = process.env.SPEECH_ENDPOINT || YUNWU_SPEECH_ENDPOINT;
  const response = await fetch(`${speechBaseURL}${speechEndpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.SPEECH_MODEL || YUNWU_SPEECH_MODEL,
      text: script,
      stream: false,
      language_boost: "Chinese",
      output_format: "url",
      voice_setting: {
        voice_id: process.env.SPEECH_VOICE || DEFAULT_SPEECH_VOICE,
        speed: 1,
        vol: 1,
        pitch: 0
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3",
        channel: 1
      }
    })
  });

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const text = await response.text();
    let data: JsonRecord = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    const errorNode = asRecord(data.error);
    throw new Error(stringValue(errorNode.message) || stringValue(data.message) || "语音生成失败");
  }

  if (contentType.includes("application/json")) {
    const data = asRecord(await response.json());
    const baseResp = asRecord(data.base_resp);
    if (baseResp.status_code && baseResp.status_code !== 0) {
      throw new Error(stringValue(baseResp.status_msg) || "语音生成失败");
    }
    const audio = findAudioValue(data);
    if (audio && /^https?:\/\//i.test(audio)) return audio;
    if (audio) {
      throw new Error("语音接口返回了音频数据，但 Kling 数字人需要可访问的音频链接");
    }
    const errorNode = asRecord(data.error);
    throw new Error(stringValue(errorNode.message) || stringValue(data.message) || `语音生成接口没有返回音频，可见字段：${summarizeKeys(data) || "空"}`);
  }

  return blobToDataUrl(await response.blob());
}

function getProviderError(data: JsonRecord) {
  const errorNode = asRecord(data.error);
  const dataNode = asRecord(data.data);
  const dataErrorNode = asRecord(dataNode.error);
  const baseResp = asRecord(data.base_resp);

  return (
    stringValue(errorNode.message) ||
    stringValue(data.error) ||
    stringValue(data.message) ||
    stringValue(data.msg) ||
    stringValue(dataErrorNode.message) ||
    stringValue(dataNode.error) ||
    stringValue(dataNode.message) ||
    stringValue(baseResp.status_msg) ||
    "云雾视频模型调用失败"
  );
}

async function createYunwuVideo(image: File, script: string) {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
  const baseURL = (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || "https://yunwu.ai/v1").replace(/\/$/, "");
  if (!apiKey) {
    throw new Error("未配置 AI_API_KEY，无法调用云雾视频模型");
  }

  const imageDataUrl = await imageToDataUrl(image);
  const audioData = await createSpeechAudio(script, apiKey, baseURL);
  const prompt = [
    "根据用户形象照生成一段竖屏数字人口播视频。",
    "人物保持照片中的身份特征、五官和发型，动作自然，镜头稳定。",
    "必须使用提供的音频驱动口型和面部动作。",
    "画面适合自媒体口播，真实自然，不夸张变形。",
    `口播文案：${script}`
  ].join("\n");

  const serviceOrigin = getServiceOrigin(baseURL);
  const videoEndpoint = process.env.DIGITAL_HUMAN_ENDPOINT || YUNWU_VIDEO_ENDPOINT;
  const response = await fetch(`${serviceOrigin}${videoEndpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.DIGITAL_HUMAN_MODEL || YUNWU_VIDEO_MODEL,
      image: imageDataUrl,
      sound_file: audioData,
      prompt,
      mode: "std",
      callback_url: "",
      external_task_id: ""
    })
  });

  const text = await response.text();
  let data: JsonRecord = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const providerError = getProviderError(data);
    throw new Error(`${providerError}。音频地址：${audioData.slice(0, 120)}`);
  }

  return pickTask(data);
}

async function uploadAsset(image: File, apiKey: string) {
  const formData = new FormData();
  formData.append("file", image);

  const response = await fetch(`${HEYGEN_API_BASE}/v3/assets`, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || "形象照上传失败");
  }

  return data.data?.id || data.data?.asset_id || data.id || data.asset_id;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const formData = await request.formData();
  const image = formData.get("image") as File | null;
  const script = String(formData.get("script") || "").trim();
  const consent = String(formData.get("consent") || "");

  if (!image || image.size === 0) {
    return NextResponse.json({ error: "请上传用户形象照" }, { status: 400 });
  }
  if (script.length < 30) {
    return NextResponse.json({ error: "视频文案太短，容易导致音频时长无效。请至少输入 30 个字" }, { status: 400 });
  }
  if (script.length > 220) {
    return NextResponse.json({ error: "视频文案太长，容易超过数字人音频 60 秒限制。请先控制在 220 个字以内" }, { status: 400 });
  }
  if (consent !== "yes") {
    return NextResponse.json({ error: "请确认已获得形象授权" }, { status: 400 });
  }

  try {
    if ((process.env.DIGITAL_HUMAN_PROVIDER || "yunwu") === "yunwu") {
      await ensureCredits(user.id, toolCosts.digitalHuman);
      const task = await createYunwuVideo(image, script);
      await saveUsage(user.id, "数字人视频生成", { image: image.name, script, provider: "yunwu", model: process.env.DIGITAL_HUMAN_MODEL || YUNWU_VIDEO_MODEL }, task);
      await spendCredits(user.id, toolCosts.digitalHuman, "数字人视频生成", { provider: "yunwu", model: process.env.DIGITAL_HUMAN_MODEL || YUNWU_VIDEO_MODEL });
      return NextResponse.json({ ...task, status: task.videoUrl ? "completed" : "processing" });
    }

    const apiKey = process.env.HEYGEN_API_KEY || "";
    const voiceId = process.env.HEYGEN_VOICE_ID || "";
    if (!apiKey || !voiceId) {
      return NextResponse.json(
        { error: "数字人服务未配置，请先配置 HEYGEN_API_KEY 和 HEYGEN_VOICE_ID" },
        { status: 400 }
      );
    }

    await ensureCredits(user.id, toolCosts.digitalHuman);
    const assetId = await uploadAsset(image, apiKey);
    const response = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: "talking_photo",
              talking_photo_id: assetId
            },
            voice: {
              type: "text",
              input_text: script,
              voice_id: voiceId
            }
          }
        ],
        dimension: {
          width: 1080,
          height: 1920
        }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || "数字人视频任务创建失败");
    }

    const taskId = data.data?.video_id || data.video_id || data.data?.id || data.id;
    await saveUsage(user.id, "数字人视频生成", { image: image.name, script }, { taskId });
    await spendCredits(user.id, toolCosts.digitalHuman, "数字人视频生成", { provider: "heygen" });
    return NextResponse.json({ taskId, status: "processing" });
  } catch (error) {
    if (isInsufficientCreditsError(error)) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "积分不足，请先充值" }, { status: 402 });
    }
    const message = error instanceof Error ? error.message : "数字人视频生成失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
