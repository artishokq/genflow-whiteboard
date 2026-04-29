import { z } from "zod";

export const BoardAccessRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const BoardCollaboratorRoleSchema = z.enum(["editor", "viewer"]);
export const BoardTemplateIdSchema = z.enum(["blank", "flowchart", "mindmap", "retrospective"]);
export const BoardShareLinkRoleSchema = z.enum(["viewer", "editor"]);

export const BoardSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  isStarred: z.boolean(),
  myRole: BoardAccessRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const BoardShareLinkRowSchema = z.object({
  id: z.string().uuid(),
  role: BoardShareLinkRoleSchema,
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
});

export const BoardMemberRowSchema = z.object({
  userId: z.string().uuid(),
  role: BoardShareLinkRoleSchema,
  createdAt: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  avatarObjectKey: z.string().nullable(),
});

export const BoardSectionSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  position: z.number(),
  boardsCount: z.number(),
  containsBoard: z.boolean(),
});

export const BoardDetailsResponseSchema = z.object({
  board: BoardSummarySchema,
  myRole: BoardAccessRoleSchema,
});

export const BoardListResponseSchema = z.object({
  boards: z.array(BoardSummarySchema),
});
