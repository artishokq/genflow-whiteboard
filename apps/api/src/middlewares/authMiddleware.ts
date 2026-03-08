import type { NextFunction, Request, Response } from "express";

import ApiError from "../exceptions/ApiError";
import tokenService from "../modules/auth/token/token.service";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(ApiError.UnauthorizedError());
  }

  const rawToken = header.slice("Bearer ".length).trim();
  if (!rawToken) {
    return next(ApiError.UnauthorizedError());
  }

  const payload = tokenService.validateAccessToken(rawToken);
  if (!payload || typeof payload === "string") {
    return next(ApiError.UnauthorizedError());
  }

  req.user = payload;
  next();
}

export { requireAuth };
