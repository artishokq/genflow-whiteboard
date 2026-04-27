import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";

import {
  getBoardSnapshotRequest,
  putBoardSnapshotRequest,
} from "../../shared/api/boardsApi";
import { generateId } from "../../shared/lib/generateId";
import { boardWebSocketUrl } from "../../shared/lib/boardWsUrl";
import { useAuthStore } from "../../shared/store/authStore";
import type { PeerCursor } from "../../widgets/board-canvas/model/types";

type AwarenessPayload = {
  id: string;
  name: string;
  color: string;
  x: number | null;
  y: number | null;
};

const SAVE_DEBOUNCE_MS = 900;
const AWARENESS_SEND_INTERVAL_MS = 50;
const OP_YJS = 0x00;
const OP_AWARENESS = 0x01;
const WS_REMOTE_ORIGIN = "ws-remote";

export function useBoardRealtimeSync({
  boardId,
  ydoc,
  shareToken,
  canWrite,
}: {
  boardId: string;
  ydoc: Y.Doc;
  shareToken?: string | null;
  canWrite: boolean;
}) {
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [remotePeers, setRemotePeers] = useState<Record<string, PeerCursor>>({});
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const awarenessIdRef = useRef(generateId());
  const isApplyingSnapshotRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const awarenessTimerRef = useRef<number | null>(null);
  const pendingAwarenessPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastAwarenessSentAtRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const destroyedRef = useRef(false);

  useEffect(() => {
    destroyedRef.current = false;
    return () => {
      destroyedRef.current = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSnapshotLoaded(false);
    setLoadError(false);

    (async () => {
      try {
        const snapshot = await getBoardSnapshotRequest(boardId, {
          shareToken: shareToken ?? undefined,
        });
        if (cancelled) {
          return;
        }
        if (snapshot.length > 0) {
          isApplyingSnapshotRef.current = true;
          try {
            Y.applyUpdate(ydoc, snapshot, "snapshot-load");
          } finally {
            isApplyingSnapshotRef.current = false;
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setSnapshotLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (awarenessTimerRef.current != null) {
        window.clearTimeout(awarenessTimerRef.current);
        awarenessTimerRef.current = null;
      }
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [boardId, shareToken, ydoc]);

  useEffect(() => {
    if (!snapshotLoaded || !canWrite) {
      return;
    }

    const scheduleSave = () => {
      if (isApplyingSnapshotRef.current) {
        return;
      }
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(async () => {
        saveTimerRef.current = null;
        if (destroyedRef.current) {
          return;
        }
        try {
          const snapshot = Y.encodeStateAsUpdate(ydoc);
          await putBoardSnapshotRequest(boardId, snapshot, {
            shareToken: shareToken ?? undefined,
          });
        } catch {
          // keep UI responsive; next update retries save
        }
      }, SAVE_DEBOUNCE_MS);
    };

    const onUpdate = (_: Uint8Array, origin: unknown) => {
      if (origin === WS_REMOTE_ORIGIN) {
        return;
      }
      scheduleSave();
    };

    ydoc.on("update", onUpdate);
    return () => {
      ydoc.off("update", onUpdate);
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [boardId, canWrite, shareToken, snapshotLoaded, ydoc]);

  useEffect(() => {
    if (!snapshotLoaded || !accessToken) {
      return;
    }
    let cancelled = false;

    const cleanupWs = () => {
      wsRef.current?.close();
      wsRef.current = null;
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(boardWebSocketUrl(boardId, accessToken, shareToken));
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttemptRef.current = 0;
        };

        ws.onmessage = (event) => {
          let buf: Uint8Array;
          if (event.data instanceof ArrayBuffer) {
            buf = new Uint8Array(event.data);
          } else if (event.data instanceof Blob) {
            void event.data.arrayBuffer().then((ab) => {
              const b = new Uint8Array(ab);
              if (b.length < 2) return;
              if (b[0] === OP_YJS) {
                isApplyingSnapshotRef.current = true;
                try {
                  Y.applyUpdate(ydoc, b.subarray(1), WS_REMOTE_ORIGIN);
                } finally {
                  isApplyingSnapshotRef.current = false;
                }
                return;
              }
              if (b[0] !== OP_AWARENESS) return;
              try {
                const payload = JSON.parse(new TextDecoder().decode(b.subarray(1))) as AwarenessPayload;
                if (!payload?.id || payload.id === awarenessIdRef.current) return;
                setRemotePeers((prev) => {
                  if (payload.x === null || payload.y === null) {
                    const next = { ...prev };
                    delete next[payload.id];
                    return next;
                  }
                  return {
                    ...prev,
                    [payload.id]: {
                      id: payload.id,
                      name: payload.name ?? "",
                      color: payload.color ?? "#7c6bcf",
                      x: payload.x,
                      y: payload.y,
                    },
                  };
                });
              } catch {
                // ignore malformed awareness
              }
            });
            return;
          } else {
            return;
          }

          if (buf.length < 2) return;
          if (buf[0] === OP_YJS) {
            isApplyingSnapshotRef.current = true;
            try {
              Y.applyUpdate(ydoc, buf.subarray(1), WS_REMOTE_ORIGIN);
            } finally {
              isApplyingSnapshotRef.current = false;
            }
            return;
          }
          if (buf[0] !== OP_AWARENESS) return;
          try {
            const payload = JSON.parse(new TextDecoder().decode(buf.subarray(1))) as AwarenessPayload;
            if (!payload?.id || payload.id === awarenessIdRef.current) return;
            setRemotePeers((prev) => {
              if (payload.x === null || payload.y === null) {
                const next = { ...prev };
                delete next[payload.id];
                return next;
              }
              return {
                ...prev,
                [payload.id]: {
                  id: payload.id,
                  name: payload.name ?? "",
                  color: payload.color ?? "#7c6bcf",
                  x: payload.x,
                  y: payload.y,
                },
              };
            });
          } catch {
            // ignore malformed awareness
          }
        };

        ws.onerror = () => {
          setLoadError(true);
        };

        ws.onclose = () => {
          if (cancelled) return;
          const attempt = Math.min(reconnectAttemptRef.current + 1, 6);
          reconnectAttemptRef.current = attempt;
          const delay = Math.min(1000 * 2 ** (attempt - 1), 12_000);
          reconnectTimerRef.current = window.setTimeout(connect, delay);
        };
      } catch {
        setLoadError(true);
      }
    };

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (!canWrite || origin === WS_REMOTE_ORIGIN) {
        return;
      }
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const msg = new Uint8Array(1 + update.length);
      msg[0] = OP_YJS;
      msg.set(update, 1);
      ws.send(msg);
    };

    ydoc.on("update", onDocUpdate);
    connect();

    return () => {
      cancelled = true;
      ydoc.off("update", onDocUpdate);
      cleanupWs();
      setRemotePeers({});
    };
  }, [accessToken, boardId, canWrite, shareToken, snapshotLoaded, ydoc]);

  const sendAwareness = useCallback(
    (payload: AwarenessPayload) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const raw = new TextEncoder().encode(JSON.stringify(payload));
      const msg = new Uint8Array(1 + raw.length);
      msg[0] = OP_AWARENESS;
      msg.set(raw, 1);
      ws.send(msg);
    },
    [],
  );

  const scheduleAwareness = useCallback(
    (pos: { x: number; y: number }) => {
      pendingAwarenessPosRef.current = pos;
      const now = Date.now();
      const elapsed = now - lastAwarenessSentAtRef.current;
      const waitMs = Math.max(0, AWARENESS_SEND_INTERVAL_MS - elapsed);

      const flushPending = () => {
        awarenessTimerRef.current = null;
        const pending = pendingAwarenessPosRef.current;
        if (!pending) {
          return;
        }
        pendingAwarenessPosRef.current = null;
        lastAwarenessSentAtRef.current = Date.now();
        sendAwareness({
          id: awarenessIdRef.current,
          name: user?.firstName ?? "User",
          color: "#7c6bcf",
          x: pending.x,
          y: pending.y,
        });
      };

      if (waitMs === 0) {
        if (awarenessTimerRef.current != null) {
          window.clearTimeout(awarenessTimerRef.current);
          awarenessTimerRef.current = null;
        }
        flushPending();
        return;
      }
      if (awarenessTimerRef.current == null) {
        awarenessTimerRef.current = window.setTimeout(flushPending, waitMs);
      }
    },
    [sendAwareness, user?.firstName],
  );

  const flushAwareness = useCallback((payload: AwarenessPayload) => {
    if (awarenessTimerRef.current != null) {
      window.clearTimeout(awarenessTimerRef.current);
      awarenessTimerRef.current = null;
    }
    pendingAwarenessPosRef.current = null;
    lastAwarenessSentAtRef.current = Date.now();
    sendAwareness(payload);
    if (payload.id === awarenessIdRef.current && (payload.x === null || payload.y === null)) {
      setRemotePeers((prev) => prev);
    }
  }, [sendAwareness]);

  return {
    snapshotLoaded,
    loadError,
    remotePeers,
    scheduleAwareness,
    flushAwareness,
    awarenessId: awarenessIdRef.current,
  };
}
