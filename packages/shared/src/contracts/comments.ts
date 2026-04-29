import type { BoardAccessRole } from "./board";

export type CommentThreadStatus = "open" | "resolved";

export type CommentMessageDto = {
  id: string;
  threadId: string;
  authorId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  authorFirstName: string;
  authorLastName: string;
  authorEmail: string;
  authorAvatarObjectKey?: string | null;
};

export type CommentThreadDto = {
  id: string;
  boardId: string;
  anchorX: number;
  anchorY: number;
  status: CommentThreadStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  messages: CommentMessageDto[];
};

export type BoardCommentsPayload = {
  myRole: BoardAccessRole;
  threads: CommentThreadDto[];
};
