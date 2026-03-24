import { useCallback, useRef, useState } from "react";

import type { ContextMenuState } from "../../widgets/board-canvas/model/types";

export function useBoardContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const suppressContextMenuRef = useRef<{
    untilMs: number;
    x: number;
    y: number;
  } | null>(null);

  const shouldSuppressContextMenu = useCallback(
    (clientX: number, clientY: number) => {
      const marker = suppressContextMenuRef.current;
      if (!marker) {
        return false;
      }
      const now = Date.now();
      if (now > marker.untilMs) {
        suppressContextMenuRef.current = null;
        return false;
      }
      const dist = Math.hypot(clientX - marker.x, clientY - marker.y);
      if (dist <= 8) {
        suppressContextMenuRef.current = null;
        return true;
      }
      suppressContextMenuRef.current = null;
      return false;
    },
    [],
  );

  const markContextMenuSuppressed = useCallback((clientX: number, clientY: number) => {
    suppressContextMenuRef.current = {
      untilMs: Date.now() + 260,
      x: clientX,
      y: clientY,
    };
  }, []);

  return {
    contextMenu,
    setContextMenu,
    shouldSuppressContextMenu,
    markContextMenuSuppressed,
  };
}
