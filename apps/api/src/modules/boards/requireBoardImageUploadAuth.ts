import type { NextFunction, Request, Response } from "express";

import ApiError from "../../exceptions/ApiError";
import { parseBoardShareToken } from "./parseBoardShareToken";
import boardService from "./board.service";

function routeBoardId(req: Request): string | undefined {
  const raw = req.params.id;
  if (typeof raw === "string" && raw) {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0]) {
    return raw[0];
  }
  return undefined;
}

/** Runs before multer so uploads are rejected without writing to disk. */
export async function requireBoardImageUploadAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(ApiError.UnauthorizedError());
    }
    const boardId = routeBoardId(req);
    if (!boardId) {
      return next(ApiError.BadRequest("id is required"));
    }
    const share = parseBoardShareToken(req);
    const access = await boardService.resolveBoardAccess(userId, boardId, share);
    if (!access) {
      return next(ApiError.NotFound("Board not found"));
    }
    if (access.role === "viewer") {
      return next(ApiError.Forbidden("View-only access"));
    }
    return next();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload rejected";
    return next(ApiError.BadRequest(message));
  }
}
