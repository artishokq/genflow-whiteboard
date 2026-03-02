import type { Server } from "node:http";
import type { Duplex } from "node:stream";
import * as Y from "yjs";
import type { RawData } from "ws";
import { WebSocket, WebSocketServer } from "ws";

import tokenService from "../modules/auth/token/token.service";
import boardService from "../modules/boards/board.service";
import type { BoardAccessRole } from "../modules/boards/board.service";

const SAVE_DEBOUNCE_MS = 2000;

/** First byte: Yjs document update (CRDT). */
const OP_YJS = 0x00;
/** First byte: UTF-8 JSON awareness payload (cursors, not persisted). */
const OP_AWARENESS = 0x01;

type BoardRoom = {
  boardId: string;
  ownerId: string;
  doc: Y.Doc;
  sockets: Set<WebSocket>;
  saveTimer: ReturnType<typeof setTimeout> | null;
};

const rooms = new Map<string, BoardRoom>();
const socketRoles = new WeakMap<WebSocket, BoardAccessRole>();

function toBuffer(raw: RawData): Buffer {
  if (Buffer.isBuffer(raw)) {
    return raw;
  }
  if (raw instanceof ArrayBuffer) {
    return Buffer.from(raw);
  }
  const parts = raw as Buffer[];
  return Buffer.concat(parts);
}

async function persistRoom(room: BoardRoom) {
  const buf = Buffer.from(Y.encodeStateAsUpdate(room.doc));
  await boardService.persistBoardSnapshot(room.boardId, buf);
}

function scheduleSave(room: BoardRoom) {
  if (room.saveTimer) {
    clearTimeout(room.saveTimer);
  }
  room.saveTimer = setTimeout(() => {
    room.saveTimer = null;
    void persistRoom(room).catch(() => {});
  }, SAVE_DEBOUNCE_MS);
}

function detachClient(ws: WebSocket, room: BoardRoom) {
  if (!room.sockets.has(ws)) {
    return;
  }
  room.sockets.delete(ws);
  socketRoles.delete(ws);
  if (room.sockets.size > 0) {
    return;
  }
  if (room.saveTimer) {
    clearTimeout(room.saveTimer);
    room.saveTimer = null;
  }
  void persistRoom(room)
    .catch(() => {})
    .finally(() => {
      rooms.delete(room.boardId);
    });
}

async function getOrCreateRoom(
  boardId: string,
  userId: string,
  shareToken: string | undefined,
): Promise<BoardRoom | null> {
  const access = await boardService.resolveBoardAccess(userId, boardId, shareToken);
  if (!access) {
    return null;
  }

  const existing = rooms.get(boardId);
  if (existing) {
    return existing;
  }

  const stateBuf = await boardService.loadSnapshotStateForBoard(boardId);
  if (stateBuf === null) {
    return null;
  }

  const doc = new Y.Doc();
  if (stateBuf.byteLength > 0) {
    Y.applyUpdate(doc, new Uint8Array(stateBuf));
  }

  const room: BoardRoom = {
    boardId,
    ownerId: access.board.ownerId,
    doc,
    sockets: new Set(),
    saveTimer: null,
  };
  rooms.set(boardId, room);
  return room;
}

async function attachBoardClient(
  ws: WebSocket,
  boardId: string,
  userId: string,
  shareToken: string | undefined,
) {
  const access = await boardService.resolveBoardAccess(userId, boardId, shareToken);
  if (!access) {
    ws.close(4403, "Forbidden");
    return;
  }

  const room = await getOrCreateRoom(boardId, userId, shareToken);
  if (!room) {
    ws.close(4403, "Forbidden");
    return;
  }

  socketRoles.set(ws, access.role);

  const sync = Y.encodeStateAsUpdate(room.doc);
  const hello = Buffer.allocUnsafe(1 + sync.byteLength);
  hello[0] = OP_YJS;
  hello.set(sync, 1);
  ws.send(hello);

  room.sockets.add(ws);

  ws.on("message", (raw: RawData) => {
    try {
      const buf = toBuffer(raw);
      if (buf.length < 2) {
        return;
      }
      const op = buf[0];
      const role = socketRoles.get(ws) ?? "viewer";

      if (op === OP_AWARENESS) {
        for (const peer of room.sockets) {
          if (peer !== ws && peer.readyState === WebSocket.OPEN) {
            peer.send(buf);
          }
        }
        return;
      }
      if (op !== OP_YJS) {
        return;
      }
      if (role === "viewer") {
        return;
      }

      const payload = new Uint8Array(buf.subarray(1));
      Y.applyUpdate(room.doc, payload);
      for (const peer of room.sockets) {
        if (peer !== ws && peer.readyState === WebSocket.OPEN) {
          peer.send(buf);
        }
      }
      scheduleSave(room);
    } catch {
      /* ignore malformed */
    }
  });

  ws.on("close", () => {
    detachClient(ws, room);
  });
  ws.on("error", () => {
    detachClient(ws, room);
  });
}

export function registerBoardWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on(
    "upgrade",
    (request: import("http").IncomingMessage, socket: Duplex, head: Buffer) => {
      const host = request.headers.host ?? "127.0.0.1";
      const url = new URL(request.url ?? "/", `http://${host}`);
      const pathMatch = /^\/ws\/board\/([^/?#]+)$/.exec(url.pathname);
      if (!pathMatch) {
        return;
      }

      const boardId = decodeURIComponent(pathMatch[1]);
      const token = url.searchParams.get("token");
      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const payload = tokenService.validateAccessToken(token);
      if (
        payload === null ||
        typeof payload === "string" ||
        typeof payload.id !== "string"
      ) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const userId = payload.id;
      const shareRaw = url.searchParams.get("share");
      const share =
        typeof shareRaw === "string" && shareRaw.trim() ? shareRaw.trim() : undefined;

      wss.handleUpgrade(request, socket, head, (ws) => {
        void attachBoardClient(ws, boardId, userId, share);
      });
    },
  );

  return wss;
}
