import type { Request } from "express";

export function parseBoardShareToken(req: Request): string | undefined {
  const q = req.query.share;
  const fromQuery = typeof q === "string" ? q.trim() : "";
  if (fromQuery) {
    return fromQuery;
  }
  const h = req.headers["x-board-share-token"];
  if (typeof h === "string" && h.trim()) {
    return h.trim();
  }
  if (Array.isArray(h) && typeof h[0] === "string" && h[0].trim()) {
    return h[0].trim();
  }
  return undefined;
}
