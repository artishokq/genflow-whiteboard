import { z } from "zod";

import { BoardAccessRoleSchema } from "./board";

export const CommentThreadStatusSchema = z.enum(["open", "resolved"]);

export const CommentMessageDtoSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  authorId: z.string().uuid(),
  text: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  authorFirstName: z.string(),
  authorLastName: z.string(),
  authorEmail: z.string().email(),
  authorAvatarObjectKey: z.string().nullable().optional(),
});

export const CommentThreadDtoSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  anchorX: z.number(),
  anchorY: z.number(),
  status: CommentThreadStatusSchema,
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(CommentMessageDtoSchema),
});

export const BoardCommentsPayloadSchema = z.object({
  myRole: BoardAccessRoleSchema,
  threads: z.array(CommentThreadDtoSchema),
});
