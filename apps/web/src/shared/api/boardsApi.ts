import { apiClient } from "./client";

export type BoardAccessRole = "owner" | "editor" | "viewer";
export type BoardTemplateId = "blank" | "flowchart" | "mindmap" | "retrospective";

export type BoardSummary = {
  id: string;
  title: string;
  isStarred: boolean;
  myRole: BoardAccessRole;
  createdAt: string;
  updatedAt: string;
};

export type BoardShareLinkRow = {
  id: string;
  role: "viewer" | "editor";
  createdAt: string;
  revokedAt: string | null;
};

export type BoardMemberRow = {
  userId: string;
  role: "viewer" | "editor";
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarObjectKey: string | null;
};

export type BoardSectionSummary = {
  id: string;
  name: string;
  position: number;
  boardsCount: number;
  containsBoard: boolean;
};

function shareParams(shareToken?: string | null) {
  return shareToken
    ? ({ params: { share: shareToken } } as const)
    : ({} as const);
}

export async function createBoardRequest(body?: {
  title?: string;
  templateId?: BoardTemplateId;
}) {
  const { data } = await apiClient.post<{
    message: string;
    board: BoardSummary;
    myRole: BoardAccessRole;
  }>("/api/boards", body ?? {});
  return data;
}

export async function listBoardsRequest(options?: {
  starred?: boolean;
  recent?: boolean;
}) {
  const { data } = await apiClient.get<{ boards: BoardSummary[] }>(
    "/api/boards",
    { params: options },
  );
  return data;
}

export async function getBoardRequest(
  boardId: string,
  options?: { shareToken?: string | null },
) {
  const { data } = await apiClient.get<{
    board: BoardSummary;
    myRole: BoardAccessRole;
  }>(`/api/boards/${boardId}`, shareParams(options?.shareToken));
  return data;
}

export async function claimBoardAccessRequest(boardId: string, shareToken: string) {
  const { data } = await apiClient.post<{
    message: string;
    board: BoardSummary;
    myRole: BoardAccessRole;
  }>(`/api/boards/${boardId}/claim`, { shareToken });
  return data;
}

export async function patchBoardRequest(boardId: string, title: string) {
  const { data } = await apiClient.patch<{
    message: string;
    board: BoardSummary;
    myRole: BoardAccessRole;
  }>(`/api/boards/${boardId}`, { title });
  return data;
}

export async function deleteBoardRequest(boardId: string) {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/boards/${boardId}`,
  );
  return data;
}

export async function setBoardStarredRequest(boardId: string, isStarred: boolean) {
  const { data } = await apiClient.patch<{
    message: string;
    board: BoardSummary;
    myRole: BoardAccessRole;
  }>(`/api/boards/${boardId}/starred`, { isStarred });
  return data;
}

export async function getBoardSnapshotRequest(
  boardId: string,
  options?: { shareToken?: string | null },
) {
  const { data } = await apiClient.get<ArrayBuffer>(
    `/api/boards/${boardId}/snapshot`,
    {
      ...shareParams(options?.shareToken),
      responseType: "arraybuffer",
    },
  );
  return new Uint8Array(data);
}

export async function putBoardSnapshotRequest(
  boardId: string,
  state: Uint8Array,
  options?: { shareToken?: string | null },
) {
  const { data } = await apiClient.put<{ message: string }>(
    `/api/boards/${boardId}/snapshot`,
    state,
    {
      ...shareParams(options?.shareToken),
      headers: { "Content-Type": "application/octet-stream" },
    },
  );
  return data;
}

const rawBase =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

/** Image URL for Konva (token query authorizes <img> without Authorization header). */
export function boardImageSrc(
  boardId: string,
  filename: string,
  accessToken: string | null,
  shareToken?: string | null,
): string {
  if (/^https?:\/\//i.test(filename)) {
    return filename;
  }
  const u = new URL(
    `${rawBase}/api/boards/${boardId}/images/${encodeURIComponent(filename)}`,
  );
  if (accessToken) {
    u.searchParams.set("token", accessToken);
  }
  if (shareToken) {
    u.searchParams.set("share", shareToken);
  }
  return u.toString();
}

export async function uploadBoardImageRequest(
  boardId: string,
  file: File,
  options?: { shareToken?: string | null },
) {
  const body = new FormData();
  body.append("file", file);
  const share = options?.shareToken?.trim();
  const path =
    share && share.length > 0
      ? `/api/boards/${boardId}/images?share=${encodeURIComponent(share)}`
      : `/api/boards/${boardId}/images`;
  const { data } = await apiClient.post<{ message: string; filename: string }>(
    path,
    body,
  );
  return data;
}

export async function createBoardShareLinkRequest(
  boardId: string,
  role: "viewer" | "editor",
) {
  const { data } = await apiClient.post<{
    message: string;
    link: { id: string; role: "viewer" | "editor"; createdAt: string; token: string };
  }>(`/api/boards/${boardId}/share-links`, { role });
  return data;
}

export async function listBoardShareLinksRequest(boardId: string) {
  const { data } = await apiClient.get<{ links: BoardShareLinkRow[] }>(
    `/api/boards/${boardId}/share-links`,
  );
  return data;
}

export async function revokeBoardShareLinkRequest(boardId: string, linkId: string) {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/boards/${boardId}/share-links/${encodeURIComponent(linkId)}`,
  );
  return data;
}

export async function listBoardMembersRequest(boardId: string) {
  const { data } = await apiClient.get<{ members: BoardMemberRow[] }>(
    `/api/boards/${boardId}/members`,
  );
  return data;
}

export async function updateBoardMemberRoleRequest(
  boardId: string,
  userId: string,
  role: "viewer" | "editor",
) {
  const { data } = await apiClient.post<{ message: string }>(
    `/api/boards/${boardId}/members`,
    { userId, role },
  );
  return data;
}

export async function removeBoardMemberRequest(boardId: string, userId: string) {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/boards/${boardId}/members/${encodeURIComponent(userId)}`,
  );
  return data;
}

export async function listBoardSectionsRequest(options?: { boardId?: string }) {
  const { data } = await apiClient.get<{ sections: BoardSectionSummary[] }>(
    "/api/board-sections",
    { params: options },
  );
  return data;
}

export async function createBoardSectionRequest(name: string) {
  const { data } = await apiClient.post<{
    message: string;
    section: BoardSectionSummary;
  }>("/api/board-sections", { name });
  return data;
}

export async function deleteBoardSectionRequest(sectionId: string) {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/board-sections/${encodeURIComponent(sectionId)}`,
  );
  return data;
}

export async function renameBoardSectionRequest(sectionId: string, name: string) {
  const { data } = await apiClient.patch<{
    message: string;
    section: BoardSectionSummary;
  }>(`/api/board-sections/${encodeURIComponent(sectionId)}`, { name });
  return data;
}

export async function reorderBoardSectionsRequest(sectionIds: string[]) {
  const { data } = await apiClient.post<{ message: string }>(
    "/api/board-sections/reorder",
    { sectionIds },
  );
  return data;
}

export async function listBoardsInSectionRequest(sectionId: string) {
  const { data } = await apiClient.get<{
    section: { id: string; name: string };
    boards: BoardSummary[];
  }>(`/api/board-sections/${encodeURIComponent(sectionId)}/boards`);
  return data;
}

export async function addBoardToSectionRequest(sectionId: string, boardId: string) {
  const { data } = await apiClient.post<{ message: string }>(
    `/api/board-sections/${encodeURIComponent(sectionId)}/boards`,
    { boardId },
  );
  return data;
}

export async function removeBoardFromSectionRequest(sectionId: string, boardId: string) {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/board-sections/${encodeURIComponent(sectionId)}/boards/${encodeURIComponent(boardId)}`,
  );
  return data;
}

export async function reorderBoardsInSectionRequest(sectionId: string, boardIds: string[]) {
  const { data } = await apiClient.post<{ message: string }>(
    `/api/board-sections/${encodeURIComponent(sectionId)}/boards/reorder`,
    { boardIds },
  );
  return data;
}
