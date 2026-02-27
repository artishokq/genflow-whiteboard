import type { NextFunction, Request, Response } from "express";

import ApiError from "../../exceptions/ApiError";
import tokenService from "../auth/token/token.service";
import genApiService from "../ai/genApi.service";
import boardCommentsService from "./boardComments.service";
import { parseBoardShareToken } from "./parseBoardShareToken";
import r2StorageService, { buildBoardImageKey } from "./r2StorageService";
import boardService, {
  isBoardTemplateId,
  type BoardAccessRole,
  type BoardCollaboratorRole,
} from "./board.service";

function routeParamId(req: Request): string | undefined {
  const raw = req.params.id;
  if (typeof raw === "string" && raw) {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0]) {
    return raw[0];
  }
  return undefined;
}

function routeParamLinkId(req: Request): string | undefined {
  const raw = req.params.linkId;
  if (typeof raw === "string" && raw) {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0]) {
    return raw[0];
  }
  return undefined;
}

function routeParamUserId(req: Request): string | undefined {
  const raw = req.params.userId;
  if (typeof raw === "string" && raw) {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0]) {
    return raw[0];
  }
  return undefined;
}

function routeParamFilename(req: Request): string | undefined {
  const raw = req.params.filename;
  if (typeof raw === "string" && raw) {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0]) {
    return raw[0];
  }
  return undefined;
}

function routeParamThreadId(req: Request): string | undefined {
  const raw = req.params.threadId;
  if (typeof raw === "string" && raw) {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0]) {
    return raw[0];
  }
  return undefined;
}

function routeParamSectionId(req: Request): string | undefined {
  const raw = req.params.sectionId;
  if (typeof raw === "string" && raw) {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0]) {
    return raw[0];
  }
  return undefined;
}

function routeParamBoardId(req: Request): string | undefined {
  const raw = req.params.boardId;
  if (typeof raw === "string" && raw) {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0]) {
    return raw[0];
  }
  return undefined;
}

function parseStarredQuery(req: Request): boolean | undefined {
  const raw = req.query.starred;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseRecentQuery(req: Request): boolean | undefined {
  const raw = req.query.recent;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseBoardIdQuery(req: Request): string | undefined {
  const raw = req.query.boardId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseIdArray(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const list = raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  if (list.length !== raw.length) {
    return null;
  }
  return list;
}

function parseCollaboratorRole(raw: unknown): BoardCollaboratorRole | null {
  if (raw === "viewer" || raw === "editor") {
    return raw;
  }
  return null;
}

function parseClaimShareToken(req: Request): string | undefined {
  const fromReq = parseBoardShareToken(req);
  if (fromReq) {
    return fromReq;
  }
  const raw = (req.body ?? {}).shareToken;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function boardJson(board: {
  id: string;
  title: string;
  isStarred: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: board.id,
    title: board.title,
    isStarred: board.isStarred,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

const persistedAiAssetByRequestId = new Map<string, string[]>();

function isAiResultDone(status: string): boolean {
  const s = status.toLowerCase();
  return s === "success" || s === "completed" || s === "done" || s === "ready";
}

function looksLikeBoardAssetKey(boardId: string, value: string): boolean {
  return value.startsWith(`boards/${boardId}/`);
}

function pickAssetMimeType(contentType: string | null): string {
  const value = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (
    value === "image/jpeg" ||
    value === "image/png" ||
    value === "image/webp" ||
    value === "image/gif" ||
    value === "video/mp4" ||
    value === "video/webm" ||
    value === "video/quicktime"
  ) {
    return value;
  }
  return "image/png";
}

async function persistAiAssetResultsToR2(
  boardId: string,
  requestId: string,
  result: string[],
): Promise<string[]> {
  const cached = persistedAiAssetByRequestId.get(requestId);
  if (cached) {
    return cached;
  }
  const converted: string[] = [];
  for (const value of result) {
    const raw = value.trim();
    if (!raw) {
      continue;
    }
    if (looksLikeBoardAssetKey(boardId, raw)) {
      converted.push(raw);
      continue;
    }
    if (!/^https?:\/\//i.test(raw)) {
      converted.push(raw);
      continue;
    }
    try {
      const response = await fetch(raw);
      if (!response.ok) {
        converted.push(raw);
        continue;
      }
      const mimeType = pickAssetMimeType(response.headers.get("content-type"));
      if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
        converted.push(raw);
        continue;
      }
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength === 0) {
        converted.push(raw);
        continue;
      }
      const key = buildBoardImageKey(boardId, mimeType);
      await r2StorageService.uploadBufferToR2({
        key,
        contentType: mimeType,
        body: Buffer.from(bytes),
      });
      converted.push(key);
    } catch {
      converted.push(raw);
    }
  }
  const normalized = converted.length > 0 ? converted : result;
  persistedAiAssetByRequestId.set(requestId, normalized);
  return normalized;
}

class BoardController {
  async listSections(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const boardId = parseBoardIdQuery(req);
      const sections = await boardService.listSections(userId, { boardId });
      return res.status(200).json({ sections });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to list sections";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async createSection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const created = await boardService.createSection(userId, (req.body ?? {}).name);
      if ("error" in created && created.error === "invalid_name") {
        return next(ApiError.BadRequest("name is required"));
      }
      return res.status(201).json({ message: "Section created", section: created });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to create section";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async deleteSection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const sectionId = routeParamSectionId(req);
      if (!sectionId) {
        return next(ApiError.BadRequest("sectionId is required"));
      }
      const deleted = await boardService.deleteSection(userId, sectionId);
      if (!deleted) {
        return next(ApiError.NotFound("Section not found"));
      }
      return res.status(200).json({ message: "Section deleted" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to delete section";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async renameSection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const sectionId = routeParamSectionId(req);
      if (!sectionId) {
        return next(ApiError.BadRequest("sectionId is required"));
      }
      const updated = await boardService.renameSection(userId, sectionId, (req.body ?? {}).name);
      if (!updated) {
        return next(ApiError.NotFound("Section not found"));
      }
      if ("error" in updated && updated.error === "invalid_name") {
        return next(ApiError.BadRequest("name is required"));
      }
      return res.status(200).json({ message: "Section updated", section: updated });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to rename section";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async reorderSections(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const sectionIds = parseIdArray((req.body ?? {}).sectionIds);
      if (!sectionIds) {
        return next(ApiError.BadRequest("sectionIds must be a non-empty string array"));
      }
      const result = await boardService.reorderSections(userId, sectionIds);
      if ("error" in result && result.error === "invalid_order") {
        return next(ApiError.BadRequest("Invalid section order"));
      }
      return res.status(200).json({ message: "Sections reordered" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to reorder sections";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async listSectionBoards(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const sectionId = routeParamSectionId(req);
      if (!sectionId) {
        return next(ApiError.BadRequest("sectionId is required"));
      }
      const result = await boardService.listBoardsInSection(userId, sectionId);
      if (!result) {
        return next(ApiError.NotFound("Section not found"));
      }
      return res.status(200).json(result);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to list section boards";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async addBoardToSection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const sectionId = routeParamSectionId(req);
      if (!sectionId) {
        return next(ApiError.BadRequest("sectionId is required"));
      }
      const boardId = typeof (req.body ?? {}).boardId === "string" ? (req.body as { boardId: string }).boardId.trim() : "";
      if (!boardId) {
        return next(ApiError.BadRequest("boardId is required"));
      }
      const result = await boardService.addBoardToSection(userId, sectionId, boardId);
      if ("error" in result && result.error === "section_not_found") {
        return next(ApiError.NotFound("Section not found"));
      }
      if ("error" in result && result.error === "board_not_found") {
        return next(ApiError.NotFound("Board not found"));
      }
      return res.status(200).json({ message: "Board added to section" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to add board to section";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async removeBoardFromSection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const sectionId = routeParamSectionId(req);
      const boardId = routeParamBoardId(req);
      if (!sectionId || !boardId) {
        return next(ApiError.BadRequest("sectionId and boardId are required"));
      }
      const result = await boardService.removeBoardFromSection(userId, sectionId, boardId);
      if ("error" in result && result.error === "section_not_found") {
        return next(ApiError.NotFound("Section not found"));
      }
      return res.status(200).json({ message: "Board removed from section" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to remove board from section";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async reorderBoardsInSection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const sectionId = routeParamSectionId(req);
      if (!sectionId) {
        return next(ApiError.BadRequest("sectionId is required"));
      }
      const boardIds = parseIdArray((req.body ?? {}).boardIds);
      if (!boardIds) {
        return next(ApiError.BadRequest("boardIds must be a non-empty string array"));
      }
      const result = await boardService.reorderBoardsInSection(userId, sectionId, boardIds);
      if ("error" in result && result.error === "section_not_found") {
        return next(ApiError.NotFound("Section not found"));
      }
      if ("error" in result && result.error === "invalid_order") {
        return next(ApiError.BadRequest("Invalid boards order"));
      }
      return res.status(200).json({ message: "Boards reordered" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to reorder boards in section";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async createAiGeneration(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }
      const share = parseBoardShareToken(req);
      const access = await boardService.resolveBoardAccess(userId, boardId, share);
      if (!access) {
        return next(ApiError.NotFound("Board not found"));
      }
      if (access.role === "viewer") {
        return next(ApiError.Forbidden("Not enough permissions"));
      }

      const mode = (req.body ?? {}).mode;
      const promptRaw = (req.body ?? {}).prompt;
      const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "";
      if (mode !== "text" && mode !== "image" && mode !== "video") {
        return next(ApiError.BadRequest("mode must be text, image or video"));
      }
      if (!prompt) {
        return next(ApiError.BadRequest("prompt is required"));
      }

      const created = await genApiService.createGeneration(mode, prompt.slice(0, 4000));
      return res.status(201).json({
        message: "Generation started",
        ...created,
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to start generation";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async getAiGeneration(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }
      const requestIdRaw = req.params.requestId;
      const requestId =
        typeof requestIdRaw === "string"
          ? requestIdRaw.trim()
          : Array.isArray(requestIdRaw) && typeof requestIdRaw[0] === "string"
            ? requestIdRaw[0].trim()
            : "";
      if (!requestId) {
        return next(ApiError.BadRequest("requestId is required"));
      }
      const share = parseBoardShareToken(req);
      const access = await boardService.resolveBoardAccess(userId, boardId, share);
      if (!access) {
        return next(ApiError.NotFound("Board not found"));
      }
      const result = await genApiService.getGenerationResult(requestId);
      if (isAiResultDone(result.status) && Array.isArray(result.result) && result.result.length > 0) {
        result.result = await persistAiAssetResultsToR2(boardId, requestId, result.result);
      }
      return res.status(200).json(result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to get generation status";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const { title, templateId } = req.body ?? {};
      if (templateId !== undefined && !isBoardTemplateId(templateId)) {
        return next(ApiError.BadRequest("templateId is invalid"));
      }
      const board = await boardService.createBoard(
        userId,
        title,
        templateId ?? "blank",
      );

      return res.status(201).json({
        message: "Board created",
        board: boardJson(board),
        myRole: "owner" satisfies BoardAccessRole,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to create board";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const starred = parseStarredQuery(req);
      const recent = parseRecentQuery(req);
      const list = await boardService.listBoards(userId, { starred, recent });
      return res.status(200).json({ boards: list });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to list boards";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const share = parseBoardShareToken(req);
      const access = await boardService.resolveBoardAccess(userId, boardId, share);
      if (!access) {
        return next(ApiError.NotFound("Board not found"));
      }
      await boardService.markBoardViewed(userId, boardId);

      return res.status(200).json({
        board: boardJson(access.board),
        myRole: access.role,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to get board";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async claimByShare(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }
      const shareToken = parseClaimShareToken(req);
      if (!shareToken) {
        return next(ApiError.BadRequest("shareToken is required"));
      }

      const claimed = await boardService.claimAccessFromShareToken(
        userId,
        boardId,
        shareToken,
      );
      if (!claimed) {
        return next(ApiError.NotFound("Board not found"));
      }

      return res.status(200).json({
        message: claimed.claimed
          ? "Board access linked to your account"
          : "Board access already linked",
        board: boardJson(claimed.board),
        myRole: claimed.role,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to claim board access";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async getSnapshot(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const share = parseBoardShareToken(req);
      const result = await boardService.getSnapshotForAccess(userId, boardId, share);
      if (!result) {
        return next(ApiError.NotFound("Board not found"));
      }

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(result.state);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to load snapshot";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async putSnapshot(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const body = req.body;
      const buffer = Buffer.isBuffer(body) ? body : Buffer.alloc(0);

      const share = parseBoardShareToken(req);
      const saved = await boardService.saveSnapshotForAccess(
        userId,
        boardId,
        share,
        buffer,
      );
      if (!saved) {
        const access = await boardService.resolveBoardAccess(userId, boardId, share);
        if (access?.role === "viewer") {
          return next(ApiError.Forbidden("View-only access"));
        }
        return next(ApiError.NotFound("Board not found"));
      }

      return res.status(200).json({ message: "Snapshot saved" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to save snapshot";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async patch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const { title } = req.body ?? {};
      if (typeof title !== "string") {
        return next(ApiError.BadRequest("title is required"));
      }

      const board = await boardService.updateBoardTitle(userId, boardId, title);
      if (!board) {
        return next(ApiError.NotFound("Board not found"));
      }

      return res.status(200).json({
        message: "Board updated",
        board: boardJson(board),
        myRole: "owner" satisfies BoardAccessRole,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to update board";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const deleted = await boardService.deleteBoard(userId, boardId);
      if (deleted) {
        return res.status(200).json({ message: "Board deleted" });
      }

      const left = await boardService.leaveBoard(userId, boardId);
      if (!left) {
        return next(ApiError.NotFound("Board not found"));
      }
      if ("error" in left && left.error === "owner_cannot_leave") {
        return next(ApiError.BadRequest("Board owner cannot leave own board"));
      }

      return res.status(200).json({ message: "Board removed from your list" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to delete board";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async setStarred(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const { isStarred } = req.body ?? {};
      if (typeof isStarred !== "boolean") {
        return next(ApiError.BadRequest("isStarred is required"));
      }

      const result = await boardService.setBoardStarred(userId, boardId, isStarred);
      if (!result) {
        return next(ApiError.NotFound("Board not found"));
      }

      return res.status(200).json({
        message: "Board starred state updated",
        board: boardJson(result.board),
        myRole: result.role,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to update board starred state";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const file = req.file;
      if (!file) {
        return next(ApiError.BadRequest("file is required"));
      }
      if (!file.buffer || file.buffer.length === 0) {
        return next(ApiError.BadRequest("file is empty"));
      }

      const key = buildBoardImageKey(boardId, file.mimetype);
      await r2StorageService.uploadBufferToR2({
        key,
        contentType: file.mimetype,
        body: file.buffer,
      });

      return res.status(201).json({
        message: "Asset uploaded",
        filename: key,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to upload image";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async serveImage(req: Request, res: Response, next: NextFunction) {
    try {
      let userId: string | undefined = req.user?.id;
      if (!userId) {
        const header = req.headers.authorization;
        if (header?.startsWith("Bearer ")) {
          const raw = header.slice("Bearer ".length).trim();
          const p = tokenService.validateAccessToken(raw);
          if (
            p &&
            typeof p !== "string" &&
            typeof (p as { id?: string }).id === "string"
          ) {
            userId = (p as { id: string }).id;
          }
        }
      }
      if (!userId) {
        const q = req.query.token;
        const qt = typeof q === "string" ? q : undefined;
        if (qt) {
          const p = tokenService.validateAccessToken(qt);
          if (
            p &&
            typeof p !== "string" &&
            typeof (p as { id?: string }).id === "string"
          ) {
            userId = (p as { id: string }).id;
          }
        }
      }
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      const filename = routeParamFilename(req);
      if (!boardId || !filename) {
        return next(ApiError.BadRequest("id and filename are required"));
      }

      const shareRaw = req.query.share;
      const share = typeof shareRaw === "string" ? shareRaw.trim() : undefined;

      const board = await boardService.getBoardForImageAccess(
        userId,
        boardId,
        share,
      );
      if (!board) {
        return next(ApiError.NotFound("Board not found"));
      }

      if (!filename.startsWith(`boards/${boardId}/`)) {
        return next(ApiError.BadRequest("Invalid filename"));
      }

      const object = await r2StorageService.getObjectFromR2(filename);
      const body = object.Body;
      if (!body) {
        return next(ApiError.NotFound("File not found"));
      }

      const bytes = await body.transformToByteArray();
      if (object.ContentType) {
        res.setHeader("Content-Type", object.ContentType);
      }
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      return res.status(200).send(Buffer.from(bytes));
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to serve image";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async createShareLink(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const role = parseCollaboratorRole((req.body ?? {}).role);
      if (!role) {
        return next(ApiError.BadRequest("role must be viewer or editor"));
      }

      const created = await boardService.createShareLink(userId, boardId, role);
      if (!created) {
        return next(ApiError.NotFound("Board not found"));
      }

      return res.status(201).json({
        message: "Share link created",
        link: {
          id: created.id,
          role: created.role,
          createdAt: created.createdAt,
          token: created.token,
        },
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to create share link";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async listShareLinks(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const rows = await boardService.listShareLinks(userId, boardId);
      if (rows === null) {
        return next(ApiError.NotFound("Board not found"));
      }

      return res.status(200).json({ links: rows });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to list share links";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async revokeShareLink(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      const linkId = routeParamLinkId(req);
      if (!boardId || !linkId) {
        return next(ApiError.BadRequest("id and linkId are required"));
      }

      const revoked = await boardService.revokeShareLink(userId, boardId, linkId);
      if (!revoked) {
        return next(ApiError.NotFound("Share link not found"));
      }

      return res.status(200).json({ message: "Share link revoked" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to revoke share link";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const rows = await boardService.listMembers(userId, boardId);
      if (rows === null) {
        return next(ApiError.NotFound("Board not found"));
      }

      return res.status(200).json({ members: rows });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to list members";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }

      const body = req.body ?? {};
      const memberUserId = typeof body.userId === "string" ? body.userId.trim() : "";
      const role = parseCollaboratorRole(body.role);
      if (!memberUserId) {
        return next(ApiError.BadRequest("userId is required"));
      }
      if (!role) {
        return next(ApiError.BadRequest("role must be viewer or editor"));
      }

      const result = await boardService.upsertMember(
        userId,
        boardId,
        memberUserId,
        role,
      );
      if (result === null) {
        return next(ApiError.NotFound("Board not found"));
      }
      if (result.error === "cannot_add_owner") {
        return next(ApiError.BadRequest("Cannot add board owner as a member"));
      }
      if (result.error === "user_not_found") {
        return next(ApiError.BadRequest("User not found"));
      }

      return res.status(200).json({ message: "Member saved" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to add member";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const boardId = routeParamId(req);
      const memberUserId = routeParamUserId(req);
      if (!boardId || !memberUserId) {
        return next(ApiError.BadRequest("id and userId are required"));
      }

      const removed = await boardService.removeMember(userId, boardId, memberUserId);
      if (!removed) {
        return next(ApiError.NotFound("Member not found"));
      }

      return res.status(200).json({ message: "Member removed" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to remove member";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async listComments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }
      const share = parseBoardShareToken(req);
      const result = await boardCommentsService.listForBoard(userId, boardId, share);
      if (!result) {
        return next(ApiError.NotFound("Board not found"));
      }
      return res.status(200).json(result);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to load comments";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async createCommentThread(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const boardId = routeParamId(req);
      if (!boardId) {
        return next(ApiError.BadRequest("id is required"));
      }
      const { anchorX, anchorY, text } = req.body ?? {};
      if (!Number.isFinite(anchorX) || !Number.isFinite(anchorY)) {
        return next(ApiError.BadRequest("anchorX and anchorY are required"));
      }
      const share = parseBoardShareToken(req);
      const created = await boardCommentsService.createThread(
        userId,
        boardId,
        share,
        { anchorX, anchorY, text },
      );
      if (!created) {
        return next(ApiError.NotFound("Board not found"));
      }
      return res.status(201).json({ message: "Thread created", ...created });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to create thread";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async addCommentMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const boardId = routeParamId(req);
      const threadId = routeParamThreadId(req);
      if (!boardId || !threadId) {
        return next(ApiError.BadRequest("id and threadId are required"));
      }
      const share = parseBoardShareToken(req);
      const result = await boardCommentsService.addMessage(
        userId,
        boardId,
        threadId,
        share,
        (req.body ?? {}).text,
      );
      if (!result) {
        return next(ApiError.NotFound("Board not found"));
      }
      if ("error" in result && result.error === "thread_not_found") {
        return next(ApiError.NotFound("Thread not found"));
      }
      return res.status(200).json({ message: "Comment added" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to add comment";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async updateCommentThread(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const boardId = routeParamId(req);
      const threadId = routeParamThreadId(req);
      if (!boardId || !threadId) {
        return next(ApiError.BadRequest("id and threadId are required"));
      }
      const status = (req.body ?? {}).status;
      if (status !== "open" && status !== "resolved") {
        return next(ApiError.BadRequest("status must be open or resolved"));
      }
      const share = parseBoardShareToken(req);
      const result = await boardCommentsService.updateThreadStatus(
        userId,
        boardId,
        threadId,
        share,
        status,
      );
      if (!result) {
        return next(ApiError.NotFound("Board not found"));
      }
      if ("error" in result) {
        if (result.error === "forbidden") {
          return next(ApiError.Forbidden("Not enough permissions"));
        }
        if (result.error === "thread_not_found") {
          return next(ApiError.NotFound("Thread not found"));
        }
      }
      return res.status(200).json({ message: "Thread updated" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to update thread";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async deleteCommentThread(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const boardId = routeParamId(req);
      const threadId = routeParamThreadId(req);
      if (!boardId || !threadId) {
        return next(ApiError.BadRequest("id and threadId are required"));
      }
      const share = parseBoardShareToken(req);
      const result = await boardCommentsService.deleteThread(
        userId,
        boardId,
        threadId,
        share,
      );
      if (!result) {
        return next(ApiError.NotFound("Board not found"));
      }
      if ("error" in result) {
        if (result.error === "forbidden") {
          return next(ApiError.Forbidden("Not enough permissions"));
        }
        if (result.error === "thread_not_found") {
          return next(ApiError.NotFound("Thread not found"));
        }
      }
      return res.status(200).json({ message: "Thread deleted" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to delete thread";
      return next(ApiError.BadRequest(errorMessage));
    }
  }
}

export default new BoardController();
