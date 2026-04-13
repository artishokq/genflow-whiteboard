import { useEffect, useState } from "react";

import {
  DEFAULT_BOARD_VIEW_SETTINGS,
  type BoardViewSettings,
} from "../../../entities/board";

const BOARD_SETTINGS_STORAGE_KEY = "genflow.board.view-settings";

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function loadBoardViewSettings(): BoardViewSettings {
  if (typeof window === "undefined") {
    return DEFAULT_BOARD_VIEW_SETTINGS;
  }
  const raw = window.localStorage.getItem(BOARD_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_BOARD_VIEW_SETTINGS;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<BoardViewSettings>;
    return {
      showGrid:
        typeof parsed.showGrid === "boolean"
          ? parsed.showGrid
          : DEFAULT_BOARD_VIEW_SETTINGS.showGrid,
      boardColor: isHexColor(parsed.boardColor)
        ? parsed.boardColor
        : DEFAULT_BOARD_VIEW_SETTINGS.boardColor,
    };
  } catch {
    return DEFAULT_BOARD_VIEW_SETTINGS;
  }
}

export function useBoardSettings() {
  const [settings, setSettings] =
    useState<BoardViewSettings>(loadBoardViewSettings);

  useEffect(() => {
    window.localStorage.setItem(BOARD_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setShowGrid = (showGrid: boolean) => {
    setSettings((prev) => ({ ...prev, showGrid }));
  };

  const setBoardColor = (boardColor: string) => {
    setSettings((prev) => ({ ...prev, boardColor }));
  };

  return {
    settings,
    setShowGrid,
    setBoardColor,
  };
}
