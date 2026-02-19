import type { NextFunction, Request, Response } from "express";

const ApiError = require("../exceptions/ApiError");
const tokenService = require("../modules/auth/token/token.service");

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

module.exports = { requireAuth };
