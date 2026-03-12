export function boardWebSocketUrl(
  boardId: string,
  accessToken: string,
  shareToken?: string | null,
): string {
  const raw =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3001";
  const base = new URL(raw);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = `/ws/board/${encodeURIComponent(boardId)}`;
  base.searchParams.set("token", accessToken);
  const s = typeof shareToken === "string" ? shareToken.trim() : "";
  if (s) {
    base.searchParams.set("share", s);
  }
  return base.toString();
}
