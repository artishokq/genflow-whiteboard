export type BoardTool =
  | "hand"
  | "select"
  | "pencil"
  | "text"
  | "image"
  | "shape"
  | "sticker"
  | "frame"
  | "comment";

export type FramePreset =
  | "custom"
  | "a4"
  | "16:9"
  | "4:3"
  | "1:1"
  | "mobile"
  | "desktop";

export function framePresetSize(preset: FramePreset): {
  width: number;
  height: number;
} {
  switch (preset) {
    case "custom":
      return { width: 420, height: 320 };
    case "a4":
      return { width: 260, height: 368 };
    case "16:9":
      return { width: 480, height: 270 };
    case "4:3":
      return { width: 400, height: 300 };
    case "1:1":
      return { width: 360, height: 360 };
    case "mobile":
      return { width: 360, height: 640 };
    case "desktop":
      return { width: 960, height: 540 };
    default:
      return { width: 420, height: 320 };
  }
}

export type BoardElementBase = {
  id: string;
  x: number;
  y: number;
  /** When set, this element is clipped/logically owned by the frame (moves with it). */
  frameId?: string;
};

export type BoardRectElement = BoardElementBase & {
  type: "rect";
  shapeKind?: "square" | "triangle" | "circle" | "star";
  width: number;
  height: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  opacity: number;
};

export type BoardLineElement = BoardElementBase & {
  type: "line";
  lineKind?: "line" | "arrow" | "elbowArrow";
  /** True for brush strokes (pencil/highlighter/eraser), false for shape-tool lines. */
  brushStroke?: boolean;
  /** Flat [x0,y0,x1,y1,...] in world space (line node at x,y usually 0,0). */
  points: number[];
  stroke: string;
  strokeWidth: number;
  opacity: number;
  startCap?: "none" | "arrow" | "circle" | "square";
  endCap?: "none" | "arrow" | "circle" | "square";
  rounded?: boolean;
  composite: "source-over" | "destination-out";
};

export type BoardTextElement = BoardElementBase & {
  type: "text";
  textKind?: "plain" | "sticker";
  text: string;
  fontSize: number;
  fontFamily: string;
  align: "left" | "center" | "right";
  fill: string;
  background: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  width: number;
};

export type BoardImageElement = BoardElementBase & {
  type: "image";
  width: number;
  height: number;
  /** Stored filename on API (not full URL). */
  imageFile: string;
};

export type BoardVideoElement = BoardElementBase & {
  type: "video";
  width: number;
  height: number;
  /** Stored filename on API (not full URL). */
  videoFile: string;
};

export type BoardFrameElement = BoardElementBase & {
  type: "frame";
  width: number;
  height: number;
  fill: string;
  name: string;
  /** Degrees, rotation around center. */
  rotation: number;
};

export type BoardElement =
  | BoardRectElement
  | BoardLineElement
  | BoardTextElement
  | BoardImageElement
  | BoardVideoElement
  | BoardFrameElement;

/** Pencil / highlighter / eraser strokes (not shape lines or arrows). */
export function isFreehandBrushLine(el: BoardElement): boolean {
  if (el.type !== "line") {
    return false;
  }
  return el.brushStroke === true;
}

function parseFrameId(raw: Record<string, unknown>): string | undefined {
  return typeof raw.frameId === "string" && raw.frameId.length > 0
    ? raw.frameId
    : undefined;
}

export function frameOuterBounds(el: BoardFrameElement): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rad = (el.rotation * Math.PI) / 180;
  const hw = el.width / 2;
  const hh = el.height / 2;
  const corners: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  for (const [px, py] of corners) {
    const rx = px * cos - py * sin + cx;
    const ry = px * sin + py * cos + cy;
    minX = Math.min(minX, rx);
    minY = Math.min(minY, ry);
    maxX = Math.max(maxX, rx);
    maxY = Math.max(maxY, ry);
  }
  return { minX, minY, maxX, maxY };
}

/** Which local corner (0…3) lies closest to screen top-left (min Y, then min X). */
export function frameVisualTopLeftCornerIndex(el: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}): number {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const hw = el.width / 2;
  const hh = el.height / 2;
  const corners: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  const rad = (el.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  let best = 0;
  let bestY = Infinity;
  let bestX = Infinity;
  for (let i = 0; i < 4; i++) {
    const [lx, ly] = corners[i]!;
    const wx = cx + lx * cos - ly * sin;
    const wy = cy + lx * sin + ly * cos;
    if (wy < bestY - 1e-9 || (Math.abs(wy - bestY) < 1e-9 && wx < bestX)) {
      bestY = wy;
      bestX = wx;
      best = i;
    }
  }
  return best;
}

/** Local (x,y) inside the frame Group: current screen top-left corner + `pad` along center→corner. */
export function frameLabelLocalPosition(
  el: BoardFrameElement,
  pad: number,
): { x: number; y: number } {
  const hw = el.width / 2;
  const hh = el.height / 2;
  const corners: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  const ci = frameVisualTopLeftCornerIndex(el);
  const [lx, ly] = corners[ci]!;
  const len = Math.hypot(lx, ly) || 1;
  return {
    x: lx + (lx / len) * pad,
    y: ly + (ly / len) * pad,
  };
}

/** World (x,y) for frame title (same transform as Konva child of rotated Group at cx,cy). */
export function frameLabelWorldPosition(
  el: BoardFrameElement,
  pad: number,
): { x: number; y: number } {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = frameLabelLocalPosition(el, pad);
  const rad = (el.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const vx = local.x * cos - local.y * sin;
  const vy = local.x * sin + local.y * cos;
  return { x: cx + vx, y: cy + vy };
}

export function pointInFrame(
  wx: number,
  wy: number,
  el: BoardFrameElement,
): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rad = (-el.rotation * Math.PI) / 180;
  const dx = wx - cx;
  const dy = wy - cy;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return (
    lx >= -el.width / 2 &&
    lx <= el.width / 2 &&
    ly >= -el.height / 2 &&
    ly <= el.height / 2
  );
}

export function resolveFrameIdAt(
  wx: number,
  wy: number,
  elements: BoardElement[],
): string | undefined {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === "frame" && pointInFrame(wx, wy, el)) {
      return el.id;
    }
  }
  return undefined;
}

/** Frames render behind their children; other elements keep document order. */
export function sortElementsForPaint(elements: BoardElement[]): BoardElement[] {
  const consumed = new Set<string>();
  const out: BoardElement[] = [];
  for (const el of elements) {
    if (consumed.has(el.id)) continue;
    if (el.type === "frame") {
      out.push(el);
      consumed.add(el.id);
      for (const c of elements) {
        if (
          !consumed.has(c.id) &&
          c.type !== "frame" &&
          c.frameId === el.id
        ) {
          out.push(c);
          consumed.add(c.id);
        }
      }
    }
  }
  for (const el of elements) {
    if (!consumed.has(el.id)) {
      out.push(el);
      consumed.add(el.id);
    }
  }
  return out;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parsePoints(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    const out: number[] = [];
    for (const x of raw) {
      const n = Number(x);
      if (!Number.isFinite(n)) {
        return null;
      }
      out.push(n);
    }
    return out.length >= 2 && out.length % 2 === 0 ? out : null;
  }
  if (typeof raw === "string") {
    try {
      const a = JSON.parse(raw) as unknown;
      return parsePoints(a);
    } catch {
      return null;
    }
  }
  return null;
}

export function parseBoardElement(raw: Record<string, unknown>): BoardElement | null {
  if (typeof raw.id !== "string") {
    return null;
  }
  const type = raw.type;
  const frameId = parseFrameId(raw);
  if (type === "frame") {
    const x = num(raw.x);
    const y = num(raw.y);
    const width = num(raw.width);
    const height = num(raw.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const rot = num(raw.rotation, 0);
    return {
      id: raw.id,
      type: "frame",
      x,
      y,
      width: w,
      height: h,
      fill: typeof raw.fill === "string" ? raw.fill : "#faf6ee",
      name: typeof raw.name === "string" ? raw.name : "Frame",
      rotation: rot,
      ...(frameId ? { frameId } : {}),
    };
  }
  if (type === "rect") {
    const x = num(raw.x);
    const y = num(raw.y);
    const width = num(raw.width);
    const height = num(raw.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }
    return {
      id: raw.id,
      type: "rect",
      ...(frameId ? { frameId } : {}),
      shapeKind:
        raw.shapeKind === "triangle" ||
        raw.shapeKind === "circle" ||
        raw.shapeKind === "star" ||
        raw.shapeKind === "square"
          ? raw.shapeKind
          : "square",
      x,
      y,
      width: Math.max(1, width),
      height: Math.max(1, height),
      fill: typeof raw.fill === "string" ? raw.fill : "#c8d4ff",
      fillOpacity: Math.min(1, Math.max(0, num(raw.fillOpacity, 0.62))),
      stroke: typeof raw.stroke === "string" ? raw.stroke : "#4a5fc1",
      strokeOpacity: Math.min(1, Math.max(0, num(raw.strokeOpacity, 1))),
      strokeWidth: num(raw.strokeWidth, 2),
      opacity: Math.min(1, Math.max(0.05, num(raw.opacity, 1))),
    };
  }
  if (type === "line") {
    const pts = parsePoints(raw.points);
    if (!pts) {
      return null;
    }
    const rawOpacity = Number(raw.opacity);
    const opacity = Number.isFinite(rawOpacity)
      ? Math.min(1, Math.max(0.01, rawOpacity))
      : 1;
    const composite =
      raw.composite === "destination-out" ? "destination-out" : "source-over";
    const parsedLineKind =
      raw.lineKind === "arrow"
        ? "arrow"
        : raw.lineKind === "elbowArrow"
          ? "elbowArrow"
          : "line";
    const isLegacyBrushStroke =
      raw.brushStroke !== false &&
      typeof raw.lineKind !== "string" &&
      raw.rounded === true &&
      raw.startCap === "none" &&
      raw.endCap === "none";
    return {
      id: raw.id,
      type: "line",
      ...(frameId ? { frameId } : {}),
      lineKind: parsedLineKind,
      brushStroke: raw.brushStroke === true || isLegacyBrushStroke,
      x: num(raw.x),
      y: num(raw.y),
      points: pts,
      stroke: typeof raw.stroke === "string" ? raw.stroke : "#2a2f55",
      strokeWidth: num(raw.strokeWidth, 2),
      opacity,
      startCap:
        raw.startCap === "arrow" ||
        raw.startCap === "circle" ||
        raw.startCap === "square"
          ? raw.startCap
          : "none",
      endCap:
        raw.endCap === "none" ||
        raw.endCap === "arrow" ||
        raw.endCap === "circle" ||
        raw.endCap === "square"
          ? raw.endCap
          : parsedLineKind === "line"
            ? "none"
            : "arrow",
      rounded: raw.rounded === true,
      composite,
    };
  }
  if (type === "text") {
    const text = typeof raw.text === "string" ? raw.text : "Text";
    const align =
      raw.align === "center" || raw.align === "right" ? raw.align : "left";
    return {
      id: raw.id,
      type: "text",
      ...(frameId ? { frameId } : {}),
      textKind: raw.textKind === "sticker" ? "sticker" : "plain",
      x: num(raw.x),
      y: num(raw.y),
      text,
      fontSize: Math.max(8, num(raw.fontSize, 48)),
      fontFamily:
        typeof raw.fontFamily === "string" ? raw.fontFamily : "Noto Sans",
      align,
      fill: typeof raw.fill === "string" ? raw.fill : "#1a1d33",
      background:
        typeof raw.background === "string" ? raw.background : "transparent",
      bold: raw.bold === true,
      italic: raw.italic === true,
      underline: raw.underline === true,
      strike: raw.strike === true,
      width: Math.max(40, num(raw.width, 200)),
    };
  }
  if (type === "image") {
    const imageFile =
      typeof raw.imageFile === "string"
        ? raw.imageFile
        : typeof raw.src === "string"
          ? raw.src
          : "";
    if (!imageFile) {
      return null;
    }
    return {
      id: raw.id,
      type: "image",
      ...(frameId ? { frameId } : {}),
      x: num(raw.x),
      y: num(raw.y),
      width: Math.max(16, num(raw.width, 200)),
      height: Math.max(16, num(raw.height, 150)),
      imageFile,
    };
  }
  if (type === "video") {
    const videoFile =
      typeof raw.videoFile === "string"
        ? raw.videoFile
        : typeof raw.src === "string"
          ? raw.src
          : "";
    if (!videoFile) {
      return null;
    }
    return {
      id: raw.id,
      type: "video",
      ...(frameId ? { frameId } : {}),
      x: num(raw.x),
      y: num(raw.y),
      width: Math.max(32, num(raw.width, 320)),
      height: Math.max(32, num(raw.height, 180)),
      videoFile,
    };
  }
  return null;
}

export function colorForPeerId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = id.charCodeAt(i) + ((h << 5) - h);
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 62% 40%)`;
}
