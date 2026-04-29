import { apiClient } from "./client";

import type {
  AiGenerationCreateResponse,
  AiGenerationMode,
  AiGenerationStatusResponse,
} from "shared";
import {
  AiGenerationCreateBodySchema,
  AiGenerationCreateResponseSchema,
  AiGenerationStatusResponseSchema,
} from "shared";

export type {
  AiGenerationCreateResponse,
  AiGenerationMode,
  AiGenerationStatusResponse,
};

function shareParams(shareToken?: string | null) {
  return shareToken ? ({ params: { share: shareToken } } as const) : ({} as const);
}

export async function createAiGenerationRequest(
  boardId: string,
  body: { mode: AiGenerationMode; prompt: string },
  options?: { shareToken?: string | null },
) {
  const validatedBody = AiGenerationCreateBodySchema.parse(body);
  const { data } = await apiClient.post<AiGenerationCreateResponse>(
    `/api/boards/${boardId}/ai/generations`,
    validatedBody,
    shareParams(options?.shareToken),
  );
  return AiGenerationCreateResponseSchema.parse(data);
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
  return AiGenerationStatusResponseSchema.parse(data);
}
