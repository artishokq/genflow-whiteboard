import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import {
  boardCommentMessages,
  boardCommentThreads,
  users,
} from "../../db/schema";
import boardService from "./board.service";

type ThreadStatus = "open" | "resolved";

function canResolve(role: "owner" | "editor" | "viewer"): boolean {
  return role === "owner" || role === "editor";
}

function normalizeCommentText(raw: unknown): string {
  if (typeof raw !== "string") {
    return "";
  }
  const text = raw.trim();
  return text.slice(0, 2000);
}

class BoardCommentsService {
  async listForBoard(userId: string, boardId: string, shareToken?: string | null) {
    const access = await boardService.resolveBoardAccess(userId, boardId, shareToken);
    if (!access) {
      return null;
    }

    const threads = await db
      .select({
        id: boardCommentThreads.id,
        boardId: boardCommentThreads.boardId,
        anchorX: boardCommentThreads.anchorX,
        anchorY: boardCommentThreads.anchorY,
        status: boardCommentThreads.status,
        createdBy: boardCommentThreads.createdBy,
        createdAt: boardCommentThreads.createdAt,
        updatedAt: boardCommentThreads.updatedAt,
      })
      .from(boardCommentThreads)
      .where(eq(boardCommentThreads.boardId, boardId))
      .orderBy(asc(boardCommentThreads.createdAt));

    if (threads.length === 0) {
      return { myRole: access.role, threads: [] as Array<unknown> };
    }

    const threadIds = threads.map((t) => t.id);
    const messages = await db
      .select({
        id: boardCommentMessages.id,
        threadId: boardCommentMessages.threadId,
        authorId: boardCommentMessages.authorId,
        text: boardCommentMessages.text,
        createdAt: boardCommentMessages.createdAt,
        updatedAt: boardCommentMessages.updatedAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorEmail: users.email,
        authorAvatarObjectKey: users.avatarObjectKey,
      })
      .from(boardCommentMessages)
      .innerJoin(users, eq(users.id, boardCommentMessages.authorId))
      .where(inArray(boardCommentMessages.threadId, threadIds))
      .orderBy(asc(boardCommentMessages.createdAt));

    const byThread = new Map<string, typeof messages>();
    for (const m of messages) {
      if (!threadIds.includes(m.threadId)) {
        continue;
      }
      const existing = byThread.get(m.threadId) ?? [];
      existing.push(m);
      byThread.set(m.threadId, existing);
    }

    return {
      myRole: access.role,
      threads: threads.map((t) => ({
        ...t,
        messages: (byThread.get(t.id) ?? []).sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        ),
      })),
    };
  }

  async createThread(
    userId: string,
    boardId: string,
    shareToken: string | null | undefined,
    input: { anchorX: number; anchorY: number; text: unknown },
  ) {
    const access = await boardService.resolveBoardAccess(userId, boardId, shareToken);
    if (!access) {
      return null;
    }
    const text = normalizeCommentText(input.text);
    if (!text) {
      throw new Error("Comment text is required");
    }

    return db.transaction(async (tx) => {
      const threadRows = await tx
        .insert(boardCommentThreads)
        .values({
          boardId,
          anchorX: input.anchorX,
          anchorY: input.anchorY,
          createdBy: userId,
        })
        .returning();
      const thread = threadRows[0];
      if (!thread) {
        throw new Error("Failed to create thread");
      }

      await tx.insert(boardCommentMessages).values({
        threadId: thread.id,
        authorId: userId,
        text,
      });

      return { threadId: thread.id, myRole: access.role };
    });
  }

  async addMessage(
    userId: string,
    boardId: string,
    threadId: string,
    shareToken: string | null | undefined,
    textInput: unknown,
  ) {
    const access = await boardService.resolveBoardAccess(userId, boardId, shareToken);
    if (!access) {
      return null;
    }
    const text = normalizeCommentText(textInput);
    if (!text) {
      throw new Error("Comment text is required");
    }

    const threadRows = await db
      .select({ id: boardCommentThreads.id })
      .from(boardCommentThreads)
      .where(and(eq(boardCommentThreads.id, threadId), eq(boardCommentThreads.boardId, boardId)))
      .limit(1);
    if (!threadRows[0]) {
      return { error: "thread_not_found" as const };
    }

    await db.insert(boardCommentMessages).values({
      threadId,
      authorId: userId,
      text,
    });
    await db
      .update(boardCommentThreads)
      .set({ updatedAt: new Date() })
      .where(eq(boardCommentThreads.id, threadId));
    return { ok: true as const };
  }

  async updateThreadStatus(
    userId: string,
    boardId: string,
    threadId: string,
    shareToken: string | null | undefined,
    status: ThreadStatus,
  ) {
    const access = await boardService.resolveBoardAccess(userId, boardId, shareToken);
    if (!access) {
      return null;
    }
    if (!canResolve(access.role)) {
      return { error: "forbidden" as const };
    }

    const updated = await db
      .update(boardCommentThreads)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(boardCommentThreads.id, threadId), eq(boardCommentThreads.boardId, boardId)))
      .returning({ id: boardCommentThreads.id });

    return updated[0] ?? { error: "thread_not_found" as const };
  }

  async deleteThread(
    userId: string,
    boardId: string,
    threadId: string,
    shareToken: string | null | undefined,
  ) {
    const access = await boardService.resolveBoardAccess(userId, boardId, shareToken);
    if (!access) {
      return null;
    }

    const rows = await db
      .select({
        id: boardCommentThreads.id,
        createdBy: boardCommentThreads.createdBy,
      })
      .from(boardCommentThreads)
      .where(and(eq(boardCommentThreads.id, threadId), eq(boardCommentThreads.boardId, boardId)))
      .limit(1);
    const thread = rows[0];
    if (!thread) {
      return { error: "thread_not_found" as const };
    }

    const canDelete = access.role === "owner" || thread.createdBy === userId;
    if (!canDelete) {
      return { error: "forbidden" as const };
    }

    const deleted = await db
      .delete(boardCommentThreads)
      .where(eq(boardCommentThreads.id, threadId))
      .returning({ id: boardCommentThreads.id });
    return deleted[0] ?? { error: "thread_not_found" as const };
  }
}

export default new BoardCommentsService();
