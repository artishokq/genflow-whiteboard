import type { FramePreset } from "../../../entities/board";

import type { BrushPreset } from "./types";

export const UNDO_ICON = "/assets/actions/left_curve_arrow.svg";
export const REDO_ICON = "/assets/actions/right_curve_arrow.svg";
export const MOUSE_ICON = "/assets/tools/mouse_icon.svg";
export const PENCIL_ICON = "/assets/tools/pencil_icon.svg";
export const HIGHLIGHTER_ICON = "/assets/tools/highlighter_icon.svg";
export const ERASER_ICON = "/assets/tools/eraser_icon.svg";
export const TEXT_ICON = "/assets/tools/text_icon.svg";
export const IMAGE_ICON = "/assets/tools/image_icon.svg";
export const SQUARE_ICON = "/assets/shapes/square_icon.svg";
export const TRIANGLE_ICON = "/assets/shapes/triangle_icon.svg";
export const ELLIPSE_ICON = "/assets/shapes/ellipse_icon.svg";
export const STAR_ICON = "/assets/shapes/star_icon.svg";
export const LINE_ICON = "/assets/shapes/line_icon.svg";
export const ARROW_ICON = "/assets/shapes/arrow_icon.svg";
export const ELBOW_ARROW_ICON = "/assets/shapes/elbow_arrow_icon.svg";
export const STICKER_ICON = "/assets/tools/sticker_icon.svg";
export const FRAME_ICON = "/assets/tools/frame_icon.svg";
export const AI_ICON = "/assets/tools/ai_icon.svg";
export const CLIP_ICON = "/assets/tools/clip_icon.svg";
export const COMMENT_ICON = "/assets/tools/comment_icon.svg";

export const INITIAL_PENCIL_PRESETS: BrushPreset[] = [
  { color: "#111111", width: 3 },
  { color: "#ef4444", width: 6 },
  { color: "#7c3aed", width: 10 },
];

export const INITIAL_HIGHLIGHTER_PRESETS: BrushPreset[] = [
  { color: "#facc15", width: 14 },
  { color: "#4ade80", width: 18 },
  { color: "#60a5fa", width: 22 },
];

export const FRAME_PRESET_OPTIONS: FramePreset[] = [
  "custom",
  "a4",
  "16:9",
  "4:3",
  "1:1",
  "mobile",
  "desktop",
];
