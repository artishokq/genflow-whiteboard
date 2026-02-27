import { createHash, randomBytes } from "node:crypto";

import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import * as Y from "yjs";

import { db } from "../../db/client";
import {
  boardSectionItems,
  boardSections,
  boardMembers,
  boardShareLinks,
  boardSnapshots,
  boardUserPrefs,
  boards,
  users,
} from "../../db/schema";

const MAX_TITLE_LENGTH = 200;
const MAX_SECTION_NAME_LENGTH = 64;
const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;

export type BoardAccessRole = "owner" | "editor" | "viewer";
export type BoardCollaboratorRole = "editor" | "viewer";
export type BoardTemplateId = "blank" | "flowchart" | "mindmap" | "retrospective";

export type BoardRow = {
  id: string;
  title: string;
  isStarred: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeTitle(raw: unknown): string {
  if (raw == null || typeof raw !== "string") {
    return "Untitled";
  }
  const t = raw.trim();
  if (!t) return "Untitled";
  return t.length > MAX_TITLE_LENGTH ? t.slice(0, MAX_TITLE_LENGTH) : t;
}

function normalizeSectionName(raw: unknown): string {
  if (typeof raw !== "string") {
    return "";
  }
  const t = raw.trim();
  if (!t) {
    return "";
  }
  return t.length > MAX_SECTION_NAME_LENGTH ? t.slice(0, MAX_SECTION_NAME_LENGTH) : t;
}

function hashShareToken(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

function newShareTokenPlaintext(): string {
  return randomBytes(24).toString("base64url");
}

function canReadSnapshot(role: BoardAccessRole): boolean {
  return role === "owner" || role === "editor" || role === "viewer";
}

function canWriteBoard(role: BoardAccessRole): boolean {
  return role === "owner" || role === "editor";
}

function roleRank(role: BoardCollaboratorRole): number {
  return role === "editor" ? 2 : 1;
}

export function isBoardTemplateId(raw: unknown): raw is BoardTemplateId {
  return (
    raw === "blank" ||
    raw === "flowchart" ||
    raw === "mindmap" ||
    raw === "retrospective"
  );
}

function buildTemplateState(templateId: BoardTemplateId): Buffer {
  if (templateId === "blank") {
    return Buffer.alloc(0);
  }

  const doc = new Y.Doc();
  const elements = doc.getArray<Y.Map<unknown>>("elements");

  const addElement = (payload: Record<string, unknown>) => {
    const map = new Y.Map<unknown>();
    for (const [k, v] of Object.entries(payload)) {
      map.set(k, v);
    }
    elements.push([map]);
  };

  if (templateId === "flowchart") {
    const nodes = [
      { kind: "circle", x: -110, y: -230, w: 220, h: 90, label: "Start" },
      { kind: "square", x: -140, y: -90, w: 280, h: 95, label: "Collect user input" },
      { kind: "square", x: -140, y: 70, w: 280, h: 95, label: "Validate and process" },
      { kind: "circle", x: -110, y: 230, w: 220, h: 90, label: "Done" },
      { kind: "square", x: 300, y: 70, w: 250, h: 95, label: "Show error state" },
    ];
    for (const node of nodes) {
      addElement({
        id: crypto.randomUUID(),
        type: "rect",
        shapeKind: node.kind === "circle" ? "circle" : "square",
        x: node.x,
        y: node.y,
        width: node.w,
        height: node.h,
        fill: node.kind === "circle" ? "#d8f7dd" : "#c8d4ff",
        fillOpacity: 0.7,
        stroke: "#4a5fc1",
        strokeOpacity: 1,
        strokeWidth: 2.4,
        opacity: 1,
      });
      const textOffsetX = node.kind === "circle" ? 38 : 22;
      addElement({
        id: crypto.randomUUID(),
        type: "text",
        textKind: "plain",
        x: node.x + textOffsetX,
        y: node.y + 27,
        text: node.label,
        fontSize: 26,
        fontFamily: "Noto Sans",
        align: "left",
        fill: "#1a1d33",
        background: "transparent",
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        width: node.w - 40,
      });
    }
    const links: Array<[number, number, number, number]> = [
      [0, -140, 0, -90],
      [0, 5, 0, 70],
      [0, 165, 0, 230],
      [140, 118, 300, 118],
    ];
    for (const [x1, y1, x2, y2] of links) {
      addElement({
        id: crypto.randomUUID(),
        type: "line",
        lineKind: "arrow",
        brushStroke: false,
        x: 0,
        y: 0,
        points: JSON.stringify([x1, y1, x2, y2]),
        stroke: "#4a5fc1",
        strokeWidth: 3,
        opacity: 1,
        startCap: "none",
        endCap: "arrow",
        rounded: true,
        composite: "source-over",
      });
    }
  } else if (templateId === "mindmap") {
    const nodes = [
      { x: -430, y: -260, text: "Problem" },
      { x: 290, y: -260, text: "Users" },
      { x: -470, y: 20, text: "Features" },
      { x: 340, y: 20, text: "Risks" },
      { x: -120, y: 250, text: "Metrics" },
      { x: 120, y: 250, text: "Launch plan" },
    ];
    for (const node of nodes) {
      addElement({
        id: crypto.randomUUID(),
        type: "line",
        lineKind: "line",
        brushStroke: false,
        x: 0,
        y: 0,
        points: JSON.stringify([0, 0, node.x + 70, node.y + 50]),
        stroke: "#4a5fc1",
        strokeWidth: 3,
        opacity: 1,
        startCap: "none",
        endCap: "none",
        rounded: true,
        composite: "source-over",
      });
      addElement({
        id: crypto.randomUUID(),
        type: "rect",
        shapeKind: "square",
        x: node.x,
        y: node.y,
        width: 180,
        height: 110,
        fill: "#d8f7dd",
        fillOpacity: 0.72,
        stroke: "#4a5fc1",
        strokeOpacity: 1,
        strokeWidth: 2,
        opacity: 1,
      });
      addElement({
        id: crypto.randomUUID(),
        type: "text",
        textKind: "plain",
        x: node.x + 24,
        y: node.y + 38,
        text: node.text,
        fontSize: 24,
        fontFamily: "Noto Sans",
        align: "left",
        fill: "#1a1d33",
        background: "transparent",
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        width: 140,
      });
    }
    addElement({
      id: crypto.randomUUID(),
      type: "rect",
      shapeKind: "circle",
      x: -100,
      y: -60,
      width: 200,
      height: 120,
      fill: "#c8d4ff",
      fillOpacity: 0.62,
      stroke: "#4a5fc1",
      strokeOpacity: 1,
      strokeWidth: 2,
      opacity: 1,
    });
    addElement({
      id: crypto.randomUUID(),
      type: "text",
      textKind: "plain",
      x: -54,
      y: -18,
      text: "Core idea",
      fontSize: 30,
      fontFamily: "Noto Sans",
      align: "left",
      fill: "#1a1d33",
      background: "transparent",
      bold: true,
      italic: false,
      underline: false,
      strike: false,
      width: 130,
    });
  } else {
    const cols = [
      { title: "Went well", x: -500, color: "#d8f7dd" },
      { title: "To improve", x: -120, color: "#fff8a6" },
      { title: "Action items", x: 260, color: "#ffd7cf" },
    ];
    for (const col of cols) {
      const frameId = crypto.randomUUID();
      addElement({
        id: frameId,
        type: "frame",
        x: col.x,
        y: -220,
        width: 300,
        height: 520,
        fill: "#faf6ee",
        name: col.title,
        rotation: 0,
      });
      addElement({
        id: crypto.randomUUID(),
        type: "text",
        textKind: "sticker",
        x: col.x + 58,
        y: -120,
        text: "",
        fontSize: 30,
        fontFamily: "Noto Sans",
        align: "left",
        fill: "#2f2744",
        background: col.color,
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        width: 180,
        frameId,
      });
    }
    addElement({
      id: crypto.randomUUID(),
      type: "text",
      textKind: "plain",
      x: -520,
      y: -300,
      text: "Sprint retrospective",
      fontSize: 46,
      fontFamily: "Noto Sans",
      align: "left",
      fill: "#1a1d33",
      background: "transparent",
      bold: true,
      italic: false,
      underline: false,
      strike: false,
      width: 500,
    });
  }

  return Buffer.from(Y.encodeStateAsUpdate(doc));
}

/** Missing relation — migration `0007_board_sharing` not applied. */
function isUndefinedTableError(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 4 && cur && typeof cur === "object"; i += 1) {
    const code = (cur as { code?: string }).code;
    if (code === "42P01") {
      return true;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

async function selectMemberAccessRole(
  boardId: string,
  userId: string,
): Promise<BoardCollaboratorRole | null> {
  try {
    const memberRows = await db
      .select({ role: boardMembers.role })
      .from(boardMembers)
      .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)))
      .limit(1);
    return memberRows[0]?.role ?? null;
  } catch (e) {
    if (isUndefinedTableError(e)) {
      return null;
    }
    throw e;
  }
}

async function selectShareLinkRole(
  boardId: string,
  tokenHash: string,
): Promise<BoardCollaboratorRole | null> {
  try {
    const linkRows = await db
      .select({ role: boardShareLinks.role })
      .from(boardShareLinks)
      .where(
        and(
          eq(boardShareLinks.boardId, boardId),
          eq(boardShareLinks.tokenHash, tokenHash),
          isNull(boardShareLinks.revokedAt),
        ),
      )
      .limit(1);
    return linkRows[0]?.role ?? null;
  } catch (e) {
    if (isUndefinedTableError(e)) {
      return null;
    }
    throw e;
  }
}

async function selectStarredValue(boardId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({
      isStarred: sql<boolean>`coalesce(${boardUserPrefs.isStarred}, false)`,
    })
    .from(boards)
    .leftJoin(
      boardUserPrefs,
      and(
        eq(boardUserPrefs.boardId, boards.id),
        eq(boardUserPrefs.userId, userId),
      ),
    )
    .where(eq(boards.id, boardId))
    .limit(1);
  return rows[0]?.isStarred ?? false;
}

class BoardService {
  async createBoard(ownerId: string, title?: unknown, templateId: BoardTemplateId = "blank") {
    const normalizedTitle = normalizeTitle(title);

    return db.transaction(async (tx) => {
      const inserted = await tx
        .insert(boards)
        .values({ ownerId, title: normalizedTitle })
        .returning();

      const board = inserted[0];
      if (!board) {
        throw new Error("Failed to create board");
      }

      await tx.insert(boardSnapshots).values({
        boardId: board.id,
        state: buildTemplateState(templateId),
      });

      return { ...board, isStarred: false };
    });
  }

  async listBoards(ownerId: string, options?: { starred?: boolean; recent?: boolean }) {
    const starred = options?.starred;
    const recent = options?.recent;
    const starredExpr = sql<boolean>`coalesce(${boardUserPrefs.isStarred}, false)`;
    const lastViewedExpr = boardUserPrefs.lastViewedAt;
    const ownedWhere =
      typeof starred === "boolean" && recent
        ? and(
            eq(boards.ownerId, ownerId),
            eq(starredExpr, starred),
            isNotNull(lastViewedExpr),
          )
        : typeof starred === "boolean"
          ? and(eq(boards.ownerId, ownerId), eq(starredExpr, starred))
          : recent
            ? and(eq(boards.ownerId, ownerId), isNotNull(lastViewedExpr))
            : eq(boards.ownerId, ownerId);

    const owned = await db
      .select({
        id: boards.id,
        title: boards.title,
        isStarred: starredExpr,
        lastViewedAt: lastViewedExpr,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
      })
      .from(boards)
      .leftJoin(
        boardUserPrefs,
        and(
          eq(boardUserPrefs.boardId, boards.id),
          eq(boardUserPrefs.userId, ownerId),
        ),
      )
      .where(ownedWhere)
      .orderBy(recent ? desc(lastViewedExpr) : desc(boards.updatedAt));

    const memberWhere =
      typeof starred === "boolean" && recent
        ? and(
            eq(boardMembers.userId, ownerId),
            eq(starredExpr, starred),
            isNotNull(lastViewedExpr),
          )
        : typeof starred === "boolean"
          ? and(eq(boardMembers.userId, ownerId), eq(starredExpr, starred))
          : recent
            ? and(eq(boardMembers.userId, ownerId), isNotNull(lastViewedExpr))
            : eq(boardMembers.userId, ownerId);

    let memberRows: Array<{
      id: string;
      title: string;
      isStarred: boolean;
      myRole: BoardCollaboratorRole;
      lastViewedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    try {
      memberRows = await db
        .select({
          id: boards.id,
          title: boards.title,
          isStarred: starredExpr,
          myRole: boardMembers.role,
          lastViewedAt: lastViewedExpr,
          createdAt: boards.createdAt,
          updatedAt: boards.updatedAt,
        })
        .from(boards)
        .innerJoin(boardMembers, eq(boardMembers.boardId, boards.id))
        .leftJoin(
          boardUserPrefs,
          and(
            eq(boardUserPrefs.boardId, boards.id),
            eq(boardUserPrefs.userId, ownerId),
          ),
        )
        .where(memberWhere)
        .orderBy(recent ? desc(lastViewedExpr) : desc(boards.updatedAt));
    } catch (e) {
      if (isUndefinedTableError(e)) {
        console.warn(
          "[boards] board_members missing — run API migrations (e.g. pnpm --filter api db:migrate). Shared boards list skipped.",
        );
      } else {
        throw e;
      }
    }

    const byId = new Map<
      string,
      {
        id: string;
        title: string;
        isStarred: boolean;
        myRole: BoardAccessRole;
        lastViewedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }
    >();
    for (const r of owned) {
      byId.set(r.id, { ...r, myRole: "owner" });
    }
    for (const r of memberRows) {
      if (!byId.has(r.id)) {
        byId.set(r.id, r);
      }
    }

    return Array.from(byId.values())
      .sort(
        recent
          ? (a, b) => {
              const left = a.lastViewedAt?.getTime() ?? 0;
              const right = b.lastViewedAt?.getTime() ?? 0;
              return right - left;
            }
          : (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      )
      .map(({ lastViewedAt: _lastViewedAt, ...board }) => board);
  }

  async markBoardViewed(userId: string, boardId: string) {
    const now = new Date();
    await db
      .insert(boardUserPrefs)
      .values({
        boardId,
        userId,
        lastViewedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [boardUserPrefs.boardId, boardUserPrefs.userId],
        set: { lastViewedAt: now, updatedAt: now },
      });
  }

  async getBoardForOwner(ownerId: string, boardId: string) {
    const rows = await db
      .select({
        id: boards.id,
        title: boards.title,
        isStarred: sql<boolean>`coalesce(${boardUserPrefs.isStarred}, false)`,
        ownerId: boards.ownerId,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
      })
      .from(boards)
      .leftJoin(
        boardUserPrefs,
        and(
          eq(boardUserPrefs.boardId, boards.id),
          eq(boardUserPrefs.userId, ownerId),
        ),
      )
      .where(and(eq(boards.id, boardId), eq(boards.ownerId, ownerId)))
      .limit(1);

    return rows[0] ?? null;
  }

  async resolveBoardAccess(
    userId: string,
    boardId: string,
    shareToken?: string | null,
  ): Promise<{ board: BoardRow; role: BoardAccessRole } | null> {
    const boardRows = await db
      .select({
        id: boards.id,
        title: boards.title,
        isStarred: sql<boolean>`coalesce(${boardUserPrefs.isStarred}, false)`,
        ownerId: boards.ownerId,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
      })
      .from(boards)
      .leftJoin(
        boardUserPrefs,
        and(
          eq(boardUserPrefs.boardId, boards.id),
          eq(boardUserPrefs.userId, userId),
        ),
      )
      .where(eq(boards.id, boardId))
      .limit(1);

    const board = boardRows[0];
    if (!board) {
      return null;
    }

    if (board.ownerId === userId) {
      return { board, role: "owner" };
    }

    const memberRole = await selectMemberAccessRole(boardId, userId);
    if (memberRole) {
      return { board, role: memberRole };
    }

    const token = typeof shareToken === "string" ? shareToken.trim() : "";
    if (token.length > 0) {
      const th = hashShareToken(token);
      const linkRole = await selectShareLinkRole(boardId, th);
      if (linkRole) {
        return { board, role: linkRole };
      }
    }

    return null;
  }

  async claimAccessFromShareToken(
    userId: string,
    boardId: string,
    shareToken: string,
  ): Promise<{ board: BoardRow; role: BoardAccessRole; claimed: boolean } | null> {
    const token = shareToken.trim();
    if (!token) {
      throw new Error("shareToken is required");
    }

    const boardRows = await db
      .select({
        id: boards.id,
        title: boards.title,
        isStarred: sql<boolean>`coalesce(${boardUserPrefs.isStarred}, false)`,
        ownerId: boards.ownerId,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
      })
      .from(boards)
      .leftJoin(
        boardUserPrefs,
        and(
          eq(boardUserPrefs.boardId, boards.id),
          eq(boardUserPrefs.userId, userId),
        ),
      )
      .where(eq(boards.id, boardId))
      .limit(1);
    const board = boardRows[0];
    if (!board) {
      return null;
    }

    if (board.ownerId === userId) {
      return { board, role: "owner", claimed: false };
    }

    const linkRole = await selectShareLinkRole(boardId, hashShareToken(token));
    if (!linkRole) {
      return null;
    }

    const existingRole = await selectMemberAccessRole(boardId, userId);
    if (!existingRole) {
      await db.insert(boardMembers).values({ boardId, userId, role: linkRole });
      return { board, role: linkRole, claimed: true };
    }

    if (roleRank(linkRole) > roleRank(existingRole)) {
      await db
        .update(boardMembers)
        .set({ role: linkRole })
        .where(
          and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)),
        );
      return { board, role: linkRole, claimed: true };
    }

    return { board, role: existingRole, claimed: false };
  }

  async getSnapshotForAccess(
    userId: string,
    boardId: string,
    shareToken?: string | null,
  ) {
    const access = await this.resolveBoardAccess(userId, boardId, shareToken);
    if (!access || !canReadSnapshot(access.role)) {
      return null;
    }

    const rows = await db
      .select({ state: boardSnapshots.state })
      .from(boardSnapshots)
      .where(eq(boardSnapshots.boardId, boardId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return { board: access.board, state: Buffer.alloc(0) };
    }

    return { board: access.board, state: row.state };
  }

  /** Used by collaboration server after access was verified. */
  async loadSnapshotStateForBoard(boardId: string): Promise<Buffer | null> {
    const boardRows = await db
      .select({ id: boards.id })
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);
    if (!boardRows[0]) {
      return null;
    }

    const rows = await db
      .select({ state: boardSnapshots.state })
      .from(boardSnapshots)
      .where(eq(boardSnapshots.boardId, boardId))
      .limit(1);
    return rows[0]?.state ?? Buffer.alloc(0);
  }

  async saveSnapshotForAccess(
    userId: string,
    boardId: string,
    shareToken: string | null | undefined,
    state: Buffer,
  ) {
    if (state.length > MAX_SNAPSHOT_BYTES) {
      throw new Error("Snapshot is too large");
    }

    const access = await this.resolveBoardAccess(userId, boardId, shareToken);
    if (!access || !canWriteBoard(access.role)) {
      return null;
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .insert(boardSnapshots)
        .values({ boardId, state })
        .onConflictDoUpdate({
          target: boardSnapshots.boardId,
          set: { state, updatedAt: now },
        });

      await tx
        .update(boards)
        .set({ updatedAt: now })
        .where(eq(boards.id, boardId));
    });

    return { ok: true as const };
  }

  /** Persist without per-user checks (caller must enforce access). */
  async persistBoardSnapshot(boardId: string, state: Buffer) {
    if (state.length > MAX_SNAPSHOT_BYTES) {
      throw new Error("Snapshot is too large");
    }

    const boardRows = await db
      .select({ id: boards.id })
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);
    if (!boardRows[0]) {
      return null;
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .insert(boardSnapshots)
        .values({ boardId, state })
        .onConflictDoUpdate({
          target: boardSnapshots.boardId,
          set: { state, updatedAt: now },
        });

      await tx
        .update(boards)
        .set({ updatedAt: now })
        .where(eq(boards.id, boardId));
    });

    return { ok: true as const };
  }

  async getBoardForImageAccess(
    userId: string,
    boardId: string,
    shareToken?: string | null,
  ) {
    const access = await this.resolveBoardAccess(userId, boardId, shareToken);
    if (!access || !canReadSnapshot(access.role)) {
      return null;
    }
    return access.board;
  }

  async updateBoardTitle(ownerId: string, boardId: string, title: unknown) {
    const board = await this.getBoardForOwner(ownerId, boardId);
    if (!board) {
      return null;
    }

    const normalizedTitle = normalizeTitle(title);
    const now = new Date();

    const updated = await db
      .update(boards)
      .set({ title: normalizedTitle, updatedAt: now })
      .where(and(eq(boards.id, boardId), eq(boards.ownerId, ownerId)))
      .returning({
        id: boards.id,
        title: boards.title,
        ownerId: boards.ownerId,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
      });

    const row = updated[0];
    if (!row) {
      return null;
    }
    const isStarred = await selectStarredValue(boardId, ownerId);
    return { ...row, isStarred };
  }

  async deleteBoard(ownerId: string, boardId: string) {
    const deleted = await db
      .delete(boards)
      .where(and(eq(boards.id, boardId), eq(boards.ownerId, ownerId)))
      .returning({ id: boards.id });

    return deleted[0] ?? null;
  }

  async leaveBoard(userId: string, boardId: string) {
    const access = await this.resolveBoardAccess(userId, boardId);
    if (!access) {
      return null;
    }
    if (access.role === "owner") {
      return { error: "owner_cannot_leave" as const };
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(boardMembers)
        .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)));

      await tx
        .delete(boardUserPrefs)
        .where(and(eq(boardUserPrefs.boardId, boardId), eq(boardUserPrefs.userId, userId)));
    });

    return { ok: true as const };
  }

  async listSections(userId: string, options?: { boardId?: string }) {
    const boardId = options?.boardId?.trim();
    const withBoardFlag = Boolean(boardId);
    return db
      .select({
        id: boardSections.id,
        name: boardSections.name,
        position: boardSections.position,
        boardsCount: sql<number>`count(${boardSectionItems.boardId})::int`,
        containsBoard: withBoardFlag
          ? sql<boolean>`coalesce(bool_or(${boardSectionItems.boardId} = ${boardId!}), false)`
          : sql<boolean>`false`,
      })
      .from(boardSections)
      .leftJoin(boardSectionItems, eq(boardSectionItems.sectionId, boardSections.id))
      .where(eq(boardSections.userId, userId))
      .groupBy(boardSections.id)
      .orderBy(boardSections.position, boardSections.createdAt);
  }

  async createSection(userId: string, rawName: unknown) {
    const name = normalizeSectionName(rawName);
    if (!name) {
      return { error: "invalid_name" as const };
    }

    const posRows = await db
      .select({ max: sql<number>`coalesce(max(${boardSections.position}), 0)::int` })
      .from(boardSections)
      .where(eq(boardSections.userId, userId))
      .limit(1);
    const nextPos = (posRows[0]?.max ?? 0) + 1;

    const created = await db
      .insert(boardSections)
      .values({ userId, name, position: nextPos })
      .returning({
        id: boardSections.id,
        name: boardSections.name,
        position: boardSections.position,
        createdAt: boardSections.createdAt,
      });
    const row = created[0];
    if (!row) {
      throw new Error("Failed to create board section");
    }
    return { ...row, boardsCount: 0, containsBoard: false };
  }

  async deleteSection(userId: string, sectionId: string) {
    const deleted = await db
      .delete(boardSections)
      .where(and(eq(boardSections.id, sectionId), eq(boardSections.userId, userId)))
      .returning({ id: boardSections.id });
    return deleted[0] ?? null;
  }

  async renameSection(userId: string, sectionId: string, rawName: unknown) {
    const name = normalizeSectionName(rawName);
    if (!name) {
      return { error: "invalid_name" as const };
    }
    const updated = await db
      .update(boardSections)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(boardSections.id, sectionId), eq(boardSections.userId, userId)))
      .returning({
        id: boardSections.id,
        name: boardSections.name,
        position: boardSections.position,
      });
    return updated[0] ?? null;
  }

  async reorderSections(userId: string, sectionIds: string[]) {
    const rows = await db
      .select({ id: boardSections.id })
      .from(boardSections)
      .where(eq(boardSections.userId, userId));
    const existingIds = new Set(rows.map((r) => r.id));
    if (existingIds.size !== sectionIds.length) {
      return { error: "invalid_order" as const };
    }
    for (const id of sectionIds) {
      if (!existingIds.has(id)) {
        return { error: "invalid_order" as const };
      }
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < sectionIds.length; i += 1) {
        await tx
          .update(boardSections)
          .set({ position: i + 1, updatedAt: new Date() })
          .where(and(eq(boardSections.id, sectionIds[i]!), eq(boardSections.userId, userId)));
      }
    });
    return { ok: true as const };
  }

  async listBoardsInSection(userId: string, sectionId: string) {
    const section = await db
      .select({ id: boardSections.id, name: boardSections.name })
      .from(boardSections)
      .where(and(eq(boardSections.id, sectionId), eq(boardSections.userId, userId)))
      .limit(1);
    const target = section[0];
    if (!target) {
      return null;
    }

    const starredExpr = sql<boolean>`coalesce(${boardUserPrefs.isStarred}, false)`;
    const items = await db
      .select({
        id: boards.id,
        title: boards.title,
        isStarred: starredExpr,
        myRole:
          sql<BoardAccessRole>`case when ${boards.ownerId} = ${userId} then 'owner'::text when ${boardMembers.userId} is not null then ${boardMembers.role}::text else null end`,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
      })
      .from(boardSectionItems)
      .innerJoin(boards, eq(boards.id, boardSectionItems.boardId))
      .leftJoin(
        boardUserPrefs,
        and(eq(boardUserPrefs.boardId, boards.id), eq(boardUserPrefs.userId, userId)),
      )
      .leftJoin(
        boardMembers,
        and(eq(boardMembers.boardId, boards.id), eq(boardMembers.userId, userId)),
      )
      .where(
        and(
          eq(boardSectionItems.sectionId, sectionId),
          sql<boolean>`(${boards.ownerId} = ${userId} or ${boardMembers.userId} is not null)`,
        ),
      )
      .orderBy(boardSectionItems.position, desc(boards.updatedAt));

    return {
      section: target,
      boards: items.filter((item) => item.myRole === "owner" || item.myRole === "editor" || item.myRole === "viewer"),
    };
  }

  async addBoardToSection(userId: string, sectionId: string, boardId: string) {
    const section = await db
      .select({ id: boardSections.id })
      .from(boardSections)
      .where(and(eq(boardSections.id, sectionId), eq(boardSections.userId, userId)))
      .limit(1);
    if (!section[0]) {
      return { error: "section_not_found" as const };
    }

    const access = await this.resolveBoardAccess(userId, boardId);
    if (!access) {
      return { error: "board_not_found" as const };
    }

    const posRows = await db
      .select({
        max: sql<number>`coalesce(max(${boardSectionItems.position}), 0)::int`,
      })
      .from(boardSectionItems)
      .where(eq(boardSectionItems.sectionId, sectionId))
      .limit(1);
    const nextPos = (posRows[0]?.max ?? 0) + 1;

    await db
      .insert(boardSectionItems)
      .values({ sectionId, boardId, position: nextPos })
      .onConflictDoNothing();

    return { ok: true as const };
  }

  async removeBoardFromSection(userId: string, sectionId: string, boardId: string) {
    const section = await db
      .select({ id: boardSections.id })
      .from(boardSections)
      .where(and(eq(boardSections.id, sectionId), eq(boardSections.userId, userId)))
      .limit(1);
    if (!section[0]) {
      return { error: "section_not_found" as const };
    }

    await db
      .delete(boardSectionItems)
      .where(
        and(eq(boardSectionItems.sectionId, sectionId), eq(boardSectionItems.boardId, boardId)),
      );
    return { ok: true as const };
  }

  async reorderBoardsInSection(userId: string, sectionId: string, boardIds: string[]) {
    const section = await db
      .select({ id: boardSections.id })
      .from(boardSections)
      .where(and(eq(boardSections.id, sectionId), eq(boardSections.userId, userId)))
      .limit(1);
    if (!section[0]) {
      return { error: "section_not_found" as const };
    }

    const rows = await db
      .select({ boardId: boardSectionItems.boardId })
      .from(boardSectionItems)
      .where(eq(boardSectionItems.sectionId, sectionId));
    const existingIds = new Set(rows.map((r) => r.boardId));
    if (existingIds.size !== boardIds.length) {
      return { error: "invalid_order" as const };
    }
    for (const id of boardIds) {
      if (!existingIds.has(id)) {
        return { error: "invalid_order" as const };
      }
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < boardIds.length; i += 1) {
        await tx
          .update(boardSectionItems)
          .set({ position: i + 1 })
          .where(
            and(
              eq(boardSectionItems.sectionId, sectionId),
              eq(boardSectionItems.boardId, boardIds[i]!),
            ),
          );
      }
    });
    return { ok: true as const };
  }

  async setBoardStarred(
    userId: string,
    boardId: string,
    isStarred: boolean,
  ): Promise<{ board: BoardRow; role: BoardAccessRole } | null> {
    const access = await this.resolveBoardAccess(userId, boardId);
    if (!access) {
      return null;
    }

    await db
      .insert(boardUserPrefs)
      .values({
        boardId,
        userId,
        isStarred,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [boardUserPrefs.boardId, boardUserPrefs.userId],
        set: { isStarred, updatedAt: new Date() },
      });

    return {
      board: { ...access.board, isStarred },
      role: access.role,
    };
  }

  async createShareLink(
    ownerId: string,
    boardId: string,
    role: BoardCollaboratorRole,
  ) {
    const board = await this.getBoardForOwner(ownerId, boardId);
    if (!board) {
      return null;
    }

    const plaintext = newShareTokenPlaintext();
    const tokenHash = hashShareToken(plaintext);

    const inserted = await db
      .insert(boardShareLinks)
      .values({
        boardId,
        tokenHash,
        role,
      })
      .returning({
        id: boardShareLinks.id,
        role: boardShareLinks.role,
        createdAt: boardShareLinks.createdAt,
      });

    const row = inserted[0];
    if (!row) {
      throw new Error("Failed to create share link");
    }

    return { ...row, token: plaintext };
  }

  async listShareLinks(ownerId: string, boardId: string) {
    const board = await this.getBoardForOwner(ownerId, boardId);
    if (!board) {
      return null;
    }

    return db
      .select({
        id: boardShareLinks.id,
        role: boardShareLinks.role,
        createdAt: boardShareLinks.createdAt,
        revokedAt: boardShareLinks.revokedAt,
      })
      .from(boardShareLinks)
      .where(eq(boardShareLinks.boardId, boardId))
      .orderBy(desc(boardShareLinks.createdAt));
  }

  async revokeShareLink(ownerId: string, boardId: string, linkId: string) {
    const board = await this.getBoardForOwner(ownerId, boardId);
    if (!board) {
      return null;
    }

    const now = new Date();
    const updated = await db
      .update(boardShareLinks)
      .set({ revokedAt: now })
      .where(
        and(
          eq(boardShareLinks.id, linkId),
          eq(boardShareLinks.boardId, boardId),
          isNull(boardShareLinks.revokedAt),
        ),
      )
      .returning({ id: boardShareLinks.id });

    return updated[0] ?? null;
  }

  async listMembers(ownerId: string, boardId: string) {
    const board = await this.getBoardForOwner(ownerId, boardId);
    if (!board) {
      return null;
    }

    return db
      .select({
        userId: boardMembers.userId,
        role: boardMembers.role,
        createdAt: boardMembers.createdAt,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarObjectKey: users.avatarObjectKey,
      })
      .from(boardMembers)
      .innerJoin(users, eq(users.id, boardMembers.userId))
      .where(eq(boardMembers.boardId, boardId))
      .orderBy(users.email);
  }

  async upsertMember(
    ownerId: string,
    boardId: string,
    memberUserId: string,
    role: BoardCollaboratorRole,
  ) {
    const board = await this.getBoardForOwner(ownerId, boardId);
    if (!board) {
      return null;
    }
    if (memberUserId === board.ownerId) {
      return { error: "cannot_add_owner" as const };
    }

    const target = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, memberUserId))
      .limit(1);
    if (!target[0]) {
      return { error: "user_not_found" as const };
    }

    await db
      .insert(boardMembers)
      .values({ boardId, userId: memberUserId, role })
      .onConflictDoUpdate({
        target: [boardMembers.boardId, boardMembers.userId],
        set: { role },
      });

    return { ok: true as const };
  }

  async removeMember(ownerId: string, boardId: string, memberUserId: string) {
    const board = await this.getBoardForOwner(ownerId, boardId);
    if (!board) {
      return null;
    }

    const deleted = await db
      .delete(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, boardId),
          eq(boardMembers.userId, memberUserId),
        ),
      )
      .returning({ userId: boardMembers.userId });

    return deleted[0] ?? null;
  }
}

export default new BoardService();
