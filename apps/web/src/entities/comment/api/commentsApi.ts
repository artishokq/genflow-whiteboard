import { apiClient } from "../../../shared/api/client";

import type { BoardCommentsPayload, CommentThreadStatus } from "../model/commentTypes";

type ShareOptions = { shareToken?: string | null };

function shareParams(options?: ShareOptions) {
  return options?.shareToken
    ? ({ params: { share: options.shareToken } } as const)
    : ({} as const);
}

export async function getBoardCommentsRequest(
  boardId: string,
  options?: ShareOptions,
) {
  const { data } = await apiClient.get<BoardCommentsPayload>(
    `/api/boards/${boardId}/comments`,
    shareParams(options),
  );
  return data;
}

export async function createCommentThreadRequest(
  boardId: string,
  body: { anchorX: number; anchorY: number; text: string },
  options?: ShareOptions,
) {
  const { data } = await apiClient.post<{ message: string; threadId: string }>(
    `/api/boards/${boardId}/comments/threads`,
    body,
    shareParams(options),
  );
  return data;
}

export async function addCommentMessageRequest(
  boardId: string,
  threadId: string,
  text: string,
  options?: ShareOptions,
) {
  const { data } = await apiClient.post<{ message: string }>(
    `/api/boards/${boardId}/comments/threads/${encodeURIComponent(threadId)}/messages`,
    { text },
    shareParams(options),
  );
  return data;
}

export async function updateCommentThreadStatusRequest(
  boardId: string,
  threadId: string,
  status: CommentThreadStatus,
  options?: ShareOptions,
) {
  const { data } = await apiClient.patch<{ message: string }>(
    `/api/boards/${boardId}/comments/threads/${encodeURIComponent(threadId)}`,
    { status },
    shareParams(options),
  );
  return data;
}

export async function deleteCommentThreadRequest(
  boardId: string,
  threadId: string,
  options?: ShareOptions,
) {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/boards/${boardId}/comments/threads/${encodeURIComponent(threadId)}`,
    shareParams(options),
  );
  return data;
}
