import { NextResponse } from "next/server";
import { ensureCredits, isInsufficientCreditsError, requireUser, saveUsage, spendCredits, unauthorized } from "@/lib/api";
import { toolCosts } from "@/lib/credits";

const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 25000;
const TRANSCRIBE_TIMEOUT_MS = 180000;

function timeoutSignal(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function getTranscribeConfig() {
  return {
    baseURL: (process.env.TRANSCRIBE_BASE_URL || process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    apiKey: process.env.TRANSCRIBE_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "",
    model: process.env.TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe"
  };
}

function extractUrl(value: string) {
  return value.match(/https?:\/\/\S+/)?.[0]?.replace(/[，。！？!\s]+$/g, "") || value.trim();
}

function cleanExtractedText(text: string) {
  return text
    .replace(/#在抖音，记录美好生活/g, "")
    .replace(/抖音-记录美好生活/g, "")
    .replace(/ - 抖音/g, "")
    .replace(/_抖音/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isDouyinLink(link: string) {
  return /douyin\.com|iesdouyin\.com/.test(link);
}

function isXiaohongshuLink(link: string) {
  return /xiaohongshu\.com|xhslink\.com/.test(link);
}

function valueToText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return Object.values(value).map(valueToText).filter(Boolean).join("\n");
  }
  return String(value);
}

function pickApiText(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const root = data as Record<string, unknown>;
  const payload = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const text =
    valueToText(payload.desc) ||
    valueToText(payload.title) ||
    valueToText(payload.content) ||
    valueToText(payload.text) ||
    valueToText(payload.share_title);

  return cleanExtractedText(text);
}

function collectMediaCandidates(value: unknown, keyName = ""): Array<{ key: string; url: string; score: number }> {
  if (!value) return [];
  if (typeof value === "string") {
    const urls = value.match(/https?:\/\/[^\s"'<>，。]+/g) || [];
    return urls.map((url) => {
      const lower = `${keyName} ${url}`.toLowerCase();
      const isAudio = /audio|music|mp3|m4a|aac|wav|sound/.test(lower);
      const isVideo = /video|play|mp4|download|url/.test(lower);
      return { key: keyName, url, score: isAudio ? 100 : isVideo ? 50 : 10 };
    });
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMediaCandidates(item, keyName));
  }
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => collectMediaCandidates(item, key));
  }
  return [];
}

function pickApiMediaUrl(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const root = data as Record<string, unknown>;
  const payload = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const candidates = [
    payload.music_url,
    payload.audio_url,
    payload.musicUrl,
    payload.audioUrl,
    payload.music,
    payload.audio,
    payload.url,
    payload.video,
    payload.play,
    payload.video_url,
    payload.play_addr,
    payload.download_url
  ];

  for (const candidate of candidates) {
    const text = valueToText(candidate).split("\n").find((item) => /^https?:\/\//.test(item.trim()));
    if (text) return text.trim();
  }

  return collectMediaCandidates(payload).sort((a, b) => b.score - a.score)[0]?.url || "";
}

function pickApiNote(data: unknown, source: string) {
  if (!data || typeof data !== "object") return `已调用${source}解析接口。`;
  const root = data as Record<string, unknown>;
  const payload = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const author = valueToText(payload.author || payload.nickname || payload.user);
  const media = valueToText(payload.music || payload.audio || payload.url || payload.video || payload.play || payload.imgurl || payload.images);
  return [`已调用${source}解析接口。`, author ? `作者：${author}` : "", media ? `解析媒体：${media}` : ""]
    .filter(Boolean)
    .join("\n");
}

async function extractFromBugPk(link: string, platform?: "douyin" | "xhs") {
  const endpoint = platform === "douyin" || (!platform && isDouyinLink(link))
    ? "https://api.bugpk.com/api/douyin"
    : platform === "xhs" || (!platform && isXiaohongshuLink(link))
      ? "https://api.bugpk.com/api/xhs"
      : "";

  if (!endpoint) return null;

  try {
    const timeout = timeoutSignal(FETCH_TIMEOUT_MS);
    const response = await fetch(`${endpoint}?url=${encodeURIComponent(link)}`, {
      signal: timeout.signal,
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "Mozilla/5.0"
      }
    });
    timeout.clear();
    const data = await response.json();
    const text = pickApiText(data);
    const mediaUrl = pickApiMediaUrl(data);

    if (response.ok && (text || mediaUrl)) {
      return {
        text,
        mediaUrl,
        note: pickApiNote(data, platform === "xhs" || isXiaohongshuLink(link) ? "小红书" : "抖音"),
        raw: data
      };
    }

    return {
      text: "",
      note: valueToText((data as Record<string, unknown>)?.msg) || valueToText((data as Record<string, unknown>)?.message) || "解析接口没有返回可用文案。"
    };
  } catch {
    return {
      text: "",
      note: "第三方解析接口调用失败，请稍后重试或改为上传视频。"
    };
  }
}

async function fileFromUrl(url: string) {
  const timeout = timeoutSignal(FETCH_TIMEOUT_MS);
  const response = await fetch(url, {
    signal: timeout.signal,
    headers: {
      "user-agent": "Mozilla/5.0",
      referer: "https://www.douyin.com/"
    }
  });
  timeout.clear();

  if (!response.ok) {
    throw new Error("视频媒体下载失败");
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_MEDIA_BYTES) {
    throw new Error("视频文件过大");
  }

  const blob = await response.blob();
  if (blob.size > MAX_MEDIA_BYTES) {
    throw new Error("视频文件过大");
  }

  const contentType = response.headers.get("content-type") || blob.type || "video/mp4";
  const ext = contentType.includes("audio") ? "mp3" : "mp4";
  return {
    file: new File([blob], `source.${ext}`, { type: contentType }),
    size: blob.size,
    type: contentType,
    url
  };
}

async function extractAndTranscribe(link: string, platform: "douyin" | "xhs") {
  const parsedByApi = await extractFromBugPk(link, platform);

  if (!parsedByApi?.mediaUrl) {
    return {
      text: "",
      note: parsedByApi?.note || "解析接口没有返回可转写的视频媒体地址。"
    };
  }

  try {
    const media = await fileFromUrl(parsedByApi.mediaUrl);
    const transcription = await transcribeVideo(media.file);
    return {
      text: transcription.text || parsedByApi.text,
      note: [
        parsedByApi.note,
        `转写媒体：${media.type}，大小：${(media.size / 1024 / 1024).toFixed(2)}MB`,
        transcription.note
      ].filter(Boolean).join("\n\n"),
      mediaUrl: parsedByApi.mediaUrl
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "下载或转写失败";
    return {
      text: parsedByApi.text,
      note: [
        parsedByApi.note,
        `已解析到视频地址，但${message}。如果上方有文案，则为平台返回的标题/描述，不是完整口播转写。`
      ].filter(Boolean).join("\n\n"),
      mediaUrl: parsedByApi.mediaUrl
    };
  }
}

async function transcribeVideo(video: File) {
  const config = getTranscribeConfig();
  if (!config.apiKey) {
    return {
      text: "",
      note: `当前未配置 AI_API_KEY 或 TRANSCRIBE_API_KEY，无法进行语音转写。`
    };
  }

  if (/audio-preview|gpt-audio/i.test(config.model)) {
    return {
      text: "",
      note: `${config.model} 不支持语音转文字接口。请使用 gpt-4o-mini-transcribe、gpt-4o-transcribe 或 whisper-1 这类转写模型。`
    };
  }

  try {
    const timeout = timeoutSignal(TRANSCRIBE_TIMEOUT_MS);
    const formData = new FormData();
    formData.append("file", video);
    formData.append("model", config.model);
    formData.append("language", "zh");
    formData.append("response_format", "json");

    const response = await fetch(`${config.baseURL}/audio/transcriptions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`
      },
      body: formData,
      signal: timeout.signal
    });
    timeout.clear();

    const rawText = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      data = { text: rawText };
    }

    if (!response.ok) {
      const message = valueToText(data.error) || valueToText(data.message) || rawText.slice(0, 200);
      throw new Error(message || `转写接口返回 ${response.status}`);
    }

    const text = valueToText(data.text);
    return {
      text,
      note: `已调用转写模型：${config.model}`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "视频转写失败";
    return {
      text: "",
      note: `${message}。请确认视频文件大小和格式可用，或换一个更短、更清晰的视频。`
    };
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const formData = await request.formData();
  const douyinLink = extractUrl(String(formData.get("douyinLink") || ""));
  const xhsLink = extractUrl(String(formData.get("xhsLink") || ""));

  if (!douyinLink && !xhsLink) {
    return NextResponse.json({ error: "请输入抖音链接或小红书链接" }, { status: 400 });
  }

  if (douyinLink && xhsLink) {
    return NextResponse.json({ error: "一次只支持解析一个链接，请保留一个输入框" }, { status: 400 });
  }

  try {
    await ensureCredits(user.id, toolCosts.extract);
  } catch (error) {
    if (isInsufficientCreditsError(error)) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "积分不足，请先充值" }, { status: 402 });
    }
    throw error;
  }
  const output = douyinLink
    ? await extractAndTranscribe(douyinLink, "douyin")
    : await extractAndTranscribe(xhsLink, "xhs");

  await saveUsage(user.id, "文案提取器", { douyinLink, xhsLink }, output);
  await spendCredits(user.id, toolCosts.extract, "文案提取器", { platform: douyinLink ? "douyin" : "xhs" });
  return NextResponse.json(output);
}
