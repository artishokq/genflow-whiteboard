import crypto from "node:crypto";

type GenerationMode = "text" | "image" | "video";

type OpenAiChatResponse = {
  id?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: { message?: string };
};

type GenApiCreateResponse = {
  request_id?: number | string;
  status?: string;
  model?: string;
  error?: string;
};

type GenApiResultResponse = {
  id: number | string;
  status: string;
  response_type?: string;
  progress?: number;
  result?: string[];
  full_response?: unknown[];
};

const GEN_API_BASE = "https://api.gen-api.ru/api/v1";
const GEN_API_PROXY_BASE = "https://proxy.gen-api.ru/v1";
const IMAGE_MODEL = "gpt-image-1";
const VIDEO_MODEL = "ltx-2";
const LOCAL_RESULT_TTL_MS = 15 * 60 * 1000;
const TEXT_GENERATION_SYSTEM_PROMPT = [
  "You are a concise assistant inside a whiteboard app.",
  "Answer directly and only to the user's request.",
  "Do not use markdown emphasis symbols such as ** or __.",
  "Do not use emojis or emoticons.",
  "Do not add conversational fillers like 'sure', 'of course', 'here you go', 'I can'.",
  "Do not mention that you are generating or about to generate.",
  "Return only final answer content, no preface and no postscript.",
  "Target length: 300 to 350 words.",
].join(" ");

type LocalResult = {
  createdAt: number;
  status: string;
  responseType: string | null;
  progress: number | null;
  result: string[];
  fullResponse: unknown[];
};

const localResults = new Map<string, LocalResult>();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function cleanupLocalResults(now = Date.now()) {
  for (const [id, value] of localResults.entries()) {
    if (now - value.createdAt > LOCAL_RESULT_TTL_MS) {
      localResults.delete(id);
    }
  }
}

function readTextFromOpenAiContent(
  content: string | Array<{ type?: string; text?: string }> | undefined,
): string {
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content.trim();
  }
  const text = content
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
  return text;
}

function textModelsForAttempt(): string[] {
  const fromEnv = process.env.GEN_API_TEXT_MODEL;
  if (fromEnv && fromEnv.trim()) {
    return [fromEnv.trim()];
  }
  // Different API keys can expose either slug or concrete dated version.
  return [
    "gemini-2-5-flash",
    "gemini-2.5-flash-preview-04-17",
    "gemini-2-5-flash-preview-04-17",
  ];
}

function authHeaders(): Record<string, string> {
  const token = requiredEnv("GEN_API_TOKEN");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

class GenApiService {
  async createGeneration(mode: GenerationMode, prompt: string) {
    if (mode === "image") {
      const response = await fetch(
        `${GEN_API_BASE}/networks/${encodeURIComponent(IMAGE_MODEL)}`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            prompt,
            model: IMAGE_MODEL,
            quality: "medium",
            size: "1024x1024",
            output_format: "png",
          }),
        },
      );

      const body = await parseJsonSafe<GenApiCreateResponse>(response);
      if (!response.ok) {
        throw new Error(body?.error || `GenApi image create failed with ${response.status}`);
      }
      const requestIdRaw = body?.request_id;
      if (requestIdRaw === undefined || requestIdRaw === null || String(requestIdRaw).trim() === "") {
        throw new Error("GenApi image create returned invalid request_id");
      }
      return {
        requestId: String(requestIdRaw),
        status: typeof body?.status === "string" ? body.status : "queued",
        model: IMAGE_MODEL,
        mode,
      };
    }
    if (mode === "video") {
      const response = await fetch(
        `${GEN_API_BASE}/networks/${encodeURIComponent(VIDEO_MODEL)}`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            prompt,
            mode: "fast",
            duration: 6,
            resolution: "1080p",
            aspect_ratio: "16:9",
            fps: 25,
            generate_audio: true,
          }),
        },
      );

      const body = await parseJsonSafe<GenApiCreateResponse>(response);
      if (!response.ok) {
        throw new Error(body?.error || `GenApi video create failed with ${response.status}`);
      }
      const requestIdRaw = body?.request_id;
      if (requestIdRaw === undefined || requestIdRaw === null || String(requestIdRaw).trim() === "") {
        throw new Error("GenApi video create returned invalid request_id");
      }
      return {
        requestId: String(requestIdRaw),
        status: typeof body?.status === "string" ? body.status : "queued",
        model: VIDEO_MODEL,
        mode,
      };
    }

    cleanupLocalResults();
    const modelCandidates = textModelsForAttempt();
    let selectedModel: string | null = null;
    let lastError: string | null = null;
    let body: OpenAiChatResponse | null = null;
    for (const model of modelCandidates) {
      const response = await fetch(`${GEN_API_PROXY_BASE}/chat/completions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: "system", content: TEXT_GENERATION_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
      });
      body = await parseJsonSafe<OpenAiChatResponse>(response);
      if (response.ok) {
        selectedModel = model;
        break;
      }
      const err = body?.error?.message || `GenApi create failed with ${response.status}`;
      lastError = err;
      const isInvalidModel =
        /invalid model/i.test(err) ||
        /Call `\/v1\/models`/i.test(err);
      if (!isInvalidModel) {
        throw new Error(err);
      }
    }
    if (!selectedModel) {
      throw new Error(lastError || "No compatible text model found for this key");
    }
    const text = readTextFromOpenAiContent(body?.choices?.[0]?.message?.content);
    if (!text) {
      throw new Error("Model returned empty text");
    }
    const requestId = body?.id?.trim() || crypto.randomUUID();
    localResults.set(requestId, {
      createdAt: Date.now(),
      status: "completed",
      responseType: "text",
      progress: 100,
      result: [text],
      fullResponse: body ? [body] : [],
    });

    return {
      requestId,
      status: "completed",
      model: selectedModel,
      mode,
    };
  }

  async getGenerationResult(requestId: string) {
    cleanupLocalResults();
    const local = localResults.get(requestId);
    if (local) {
      return {
        requestId,
        status: local.status,
        responseType: local.responseType,
        progress: local.progress,
        result: local.result,
        fullResponse: local.fullResponse,
      };
    }
    const response = await fetch(`${GEN_API_BASE}/request/get/${encodeURIComponent(requestId)}`, {
      method: "GET",
      headers: authHeaders(),
    });
    const body = await parseJsonSafe<GenApiResultResponse | { error?: string }>(response);
    if (!response.ok) {
      const err = body && "error" in body ? body.error : undefined;
      throw new Error(err || `GenApi status failed with ${response.status}`);
    }
    if (!body || !("status" in body)) {
      throw new Error("GenApi status returned invalid response");
    }

    return {
      requestId,
      status: body.status,
      responseType: typeof body.response_type === "string" ? body.response_type : null,
      progress: typeof body.progress === "number" ? body.progress : null,
      result: Array.isArray(body.result) ? body.result : [],
      fullResponse: Array.isArray(body.full_response) ? body.full_response : [],
    };
  }
}

const genApiService = new GenApiService();

export type { GenerationMode };
export default genApiService;
