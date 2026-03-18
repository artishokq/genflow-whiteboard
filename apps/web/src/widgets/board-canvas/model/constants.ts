/** Transparent hit-surface under elements so placement tools receive mousedown. */
export const BOARD_PLACEMENT_HIT_ID = "__board_placement_hit";

export const GRID_STEP = 20;
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 5;
export const INITIAL_BOUNDS = { minX: 0, minY: 0, maxX: 4000, maxY: 3000 };
export const BOUNDS_PAD = 240;
export const BOUNDS_EXPAND_STEP = 2000;
export const BOUNDS_EXPAND_TRIGGER = 420;
export const WS_REMOTE_ORIGIN = "genflow-ws";
export const OP_YJS = 0x00;
export const OP_AWARENESS = 0x01;
export const TEXT_LINE_HEIGHT = 1.35;
/** Pixels past the visual top-left corner along center→corner (frameLabelLocalPosition). */
export const FRAME_LABEL_OUTSIDE_PAD = 6;
export const TEXT_BLOCK_PADDING = 10;
export const ALIGN_LEFT_ICON = "/assets/text/align_left_icon.svg";
export const ALIGN_CENTER_ICON = "/assets/text/align_center_icon.svg";
export const ALIGN_RIGHT_ICON = "/assets/text/align_right_icon.svg";
export const BOLD_ICON = "/assets/text/bold_icon.svg";
export const ITALIC_ICON = "/assets/text/italic_icon.svg";
export const UNDERLINE_ICON = "/assets/text/underline_icon.svg";
export const STRIKETHROUGH_ICON = "/assets/text/strikethrough_icon.svg";
export const TEXT_COLOR_ICON = "/assets/text/text_color.svg";
export const TEXT_BG_ICON = "/assets/text/text_background_icon.svg";
export const SQUARE_FILL_ICON = "/assets/shapes/square_fill_icon.svg";
export const SQUARE_BORDER_ICON = "/assets/shapes/square_border_icon.svg";
export const ELLIPSE_ICON = "/assets/shapes/ellipse_icon.svg";
export const SQUARE_ICON = "/assets/shapes/square_icon.svg";
export const ARROW_ICON = "/assets/shapes/arrow_icon.svg";
export const ROTATION_ICON = "/assets/actions/rotation_icon.svg";
export const TEXT_TOOLBAR_ICON_SIZE = 18;
export const STICKER_BASE_COLORS = ["#FFE97A", "#FF8A80", "#FFF2D9"] as const;
export const STICKER_PADDING = 14;
export const FONT_OPTIONS = [
  "Noto Sans",
  "Inter",
  "Roboto",
  "Montserrat",
  "Open Sans",
  "Lato",
  "Poppins",
  "Nunito",
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
] as const;
