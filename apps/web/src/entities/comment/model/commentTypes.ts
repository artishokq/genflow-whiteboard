import type { BoardAccessRole } from "../../../shared/api/boardsApi";

export type CommentThreadStatus = "open" | "resolved";

export type CommentMessage = {
  id: string;
  threadId: string;
  authorId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  authorFirstName: string;
  authorLastName: string;
  authorEmail: string;
  /** Present when API returns it; omit on older payloads. */
  authorAvatarObjectKey?: string | null;
};

export type CommentThread = {
  id: string;
  boardId: string;
  anchorX: number;
  anchorY: number;
  status: CommentThreadStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  messages: CommentMessage[];
};

export type BoardCommentsPayload = {
  myRole: BoardAccessRole;
  threads: CommentThread[];
};
