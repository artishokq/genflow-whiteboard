import { apiClient } from "./client";

export type AiGenerationMode = "text" | "image" | "video";

export type AiGenerationCreateResponse = {
  requestId: string;
  status: string;
  model: string | null;
  mode: AiGenerationMode;
};

export type AiGenerationStatusResponse = {
  requestId: string;
  status: string;
  responseType: string | null;
  progress: number | null;
  result: string[];
  fullResponse: unknown[];
};

function shareParams(shareToken?: string | null) {
  return shareToken ? ({ params: { share: shareToken } } as const) : ({} as const);
}

export async function createAiGenerationRequest(
  boardId: string,
  body: { mode: AiGenerationMode; prompt: string },
  options?: { shareToken?: string | null },
) {
  const { data } = await apiClient.post<AiGenerationCreateResponse>(
    `/api/boards/${boardId}/ai/generations`,
    body,
    shareParams(options?.shareToken),
  );
  return data;
}

export async function getAiGenerationStatusRequest(
  boardId: string,
  requestId: string,
  options?: { shareToken?: string | null },
) {
  const { data } = await apiClient.get<AiGenerationStatusResponse>(
    `/api/boards/${boardId}/ai/generations/${encodeURIComponent(requestId)}`,
    shareParams(options?.shareToken),
  );
  return data;
}
