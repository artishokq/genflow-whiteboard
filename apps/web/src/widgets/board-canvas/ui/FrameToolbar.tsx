import type * as Y from "yjs";

import type { BoardFrameElement } from "../../../entities/board";

import { ROTATION_ICON, TEXT_TOOLBAR_ICON_SIZE } from "../model/constants";
import {
  textToolbarDividerStyle,
  textToolbarIconButtonStyle,
} from "../model/styles";

type FrameToolbarProps = {
  activeFrameElement: BoardFrameElement;
  hasTextToolbar: boolean;
  updateShapeElement: (
    id: string,
    updater: (map: Y.Map<unknown>) => void,
  ) => void;
};

export function FrameToolbar({
  activeFrameElement,
  hasTextToolbar,
  updateShapeElement,
}: FrameToolbarProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: hasTextToolbar ? 62 : 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(21,28,58,0.16)",
        boxShadow: "0 10px 24px rgba(18,22,40,0.12)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        title="Rotate 90°"
        style={{
          ...textToolbarIconButtonStyle,
          border: "none",
          background: "transparent",
        }}
        onClick={() =>
          updateShapeElement(activeFrameElement.id, (map) => {
            const rot = Number(map.get("rotation") ?? 0);
            map.set("rotation", (rot + 90) % 360);
          })
        }
      >
        <img
          src={ROTATION_ICON}
          alt=""
          width={TEXT_TOOLBAR_ICON_SIZE}
          height={TEXT_TOOLBAR_ICON_SIZE}
        />
      </button>
      <span style={textToolbarDividerStyle} aria-hidden>
        |
      </span>
      {(
        [
          { color: "#ffffff", label: "White" },
          { color: "#faf6ee", label: "Milk" },
        ] as const
      ).map((swatch) => (
        <button
          key={swatch.color}
          type="button"
          title={swatch.label}
          onClick={() =>
            updateShapeElement(activeFrameElement.id, (map) => {
              map.set("fill", swatch.color);
            })
          }
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            border:
              activeFrameElement.fill.toLowerCase() === swatch.color
                ? "2px solid rgba(32,38,72,0.85)"
                : "1px solid rgba(21,28,58,0.22)",
            background: swatch.color,
            cursor: "pointer",
            padding: 0,
          }}
        />
      ))}
      <span style={textToolbarDividerStyle} aria-hidden>
        |
      </span>
      <input
        type="text"
        value={activeFrameElement.name}
        onChange={(e) =>
          updateShapeElement(activeFrameElement.id, (map) => {
            map.set("name", e.target.value);
          })
        }
        style={{
          minWidth: 120,
          height: 32,
          borderRadius: 8,
          border: "1px solid rgba(21, 28, 58, 0.18)",
          padding: "0 10px",
          fontSize: 14,
          color: "#26214f",
        }}
      />
    </div>
  );
}
