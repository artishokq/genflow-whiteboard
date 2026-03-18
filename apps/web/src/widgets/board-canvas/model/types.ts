import type { BoardTool, FramePreset } from "../../../entities/board";
import type { CommentThread } from "../../../entities/comment";
import type { BoardHistoryEntry } from "../../../features/board-history";
import type { AiGenerationDraft } from "../../../features/board-ai-generation";

export type BoardCanvasHandle = {
  setTool: (t: BoardTool) => void;
  focusOnPoint: (x: number, y: number) => void;
  addRectangle: () => void;
  pickImageFile: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getHistoryEntries: () => BoardHistoryEntry[];
  exportPngViewport: (pixelRatio?: number) => Promise<void>;
  exportPngFullBoard: (pixelRatio?: number) => Promise<void>;
  exportJsonBackup: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

export type BoardCanvasProps = {
  boardId: string;
  /** Access token from invite link (?share=…); forwarded to API for snapshots and images. */
  shareToken?: string | null;
  /** View-only: no edits, no snapshot PUT, no uploads. */
  readOnly?: boolean;
  tool: BoardTool;
  selectedFramePreset?: FramePreset;
  selectedShapeKind?:
    | "square"
    | "triangle"
    | "circle"
    | "star"
    | "line"
    | "arrow"
    | "elbowArrow";
  onToolChange?: (t: BoardTool) => void;
  onScaleChange?: (scale: number) => void;
  onHistoryChange?: (next: {
    canUndo: boolean;
    canRedo: boolean;
    entries: BoardHistoryEntry[];
  }) => void;
  showGrid?: boolean;
  boardColor?: string;
  brushSettings?: {
    kind: "pencil" | "highlighter" | "eraser";
    color: string;
    width: number;
  };
  commentThreads?: CommentThread[];
  activeCommentThreadId?: string | null;
  onCommentThreadPick?: (threadId: string) => void;
  onCreateCommentAt?: (x: number, y: number) => void;
  pendingCommentAnchor?: { x: number; y: number } | null;
  activeCommentThread?: CommentThread | null;
  commentBusy?: boolean;
  commentError?: string | null;
  onCreateCommentThread?: (x: number, y: number, text: string) => Promise<void>;
  onCancelCommentCreate?: () => void;
  onCloseCommentThread?: () => void;
  onReplyCommentThread?: (threadId: string, text: string) => Promise<void>;
  onToggleCommentThreadResolved?: (
    threadId: string,
    status: "open" | "resolved",
  ) => Promise<void>;
  canDeleteActiveCommentThread?: boolean;
  onDeleteCommentThread?: (threadId: string) => Promise<void>;
  aiMode?: "text" | "image" | "video" | null;
  onCreateGenerationAt?: (x: number, y: number) => void;
  pendingGenerationAnchor?: { x: number; y: number } | null;
  pendingGenerationMode?: "text" | "image" | "video" | null;
  generationDraft?: AiGenerationDraft | null;
  generationBusy?: boolean;
  generationError?: string | null;
  onSubmitGenerationPrompt?: (
    mode: "text" | "image" | "video",
    x: number,
    y: number,
    prompt: string,
  ) => Promise<void>;
  onCancelGenerationPrompt?: () => void;
  onStopGeneration?: () => void;
  onAcceptGeneration?: () => void;
  onRejectGeneration?: () => void;
};

export type PeerCursor = {
  id: string;
  name: string;
  color: string;
  x: number | null;
  y: number | null;
};

export type MarqueeBox = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type ContextMenuState = {
  x: number;
  y: number;
  kind: "board" | "shape";
  targetIds: string[];
  downloadImageFile?: string;
};

export type CanvasBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type MidpointDragState = {
  lineId: string;
  insertedPointIndex: number;
};

export type LineEditDraftState = {
  lineId: string;
  points: number[];
};
