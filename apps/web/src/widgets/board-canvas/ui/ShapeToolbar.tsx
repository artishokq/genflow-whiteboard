import type { Dispatch, SetStateAction } from "react";
import type * as Y from "yjs";

import type { BoardElement } from "../../../entities/board";

import {
  ARROW_ICON,
  ELLIPSE_ICON,
  SQUARE_BORDER_ICON,
  SQUARE_FILL_ICON,
  SQUARE_ICON,
  TEXT_TOOLBAR_ICON_SIZE,
} from "../model/constants";
import {
  textToolbarColorButtonStyle,
  textToolbarColorInputStyle,
  textToolbarDropdownStyle,
  textToolbarIconButtonStyle,
} from "../model/styles";

type ActiveShapeElement = Extract<BoardElement, { type: "rect" | "line" }>;

type ShapeToolbarProps = {
  activeShapeElement: ActiveShapeElement;
  hasTextToolbar: boolean;
  shapeFillMenuOpen: boolean;
  setShapeFillMenuOpen: Dispatch<SetStateAction<boolean>>;
  shapeStrokeMenuOpen: boolean;
  setShapeStrokeMenuOpen: Dispatch<SetStateAction<boolean>>;
  lineStartCapMenuOpen: boolean;
  setLineStartCapMenuOpen: Dispatch<SetStateAction<boolean>>;
  lineEndCapMenuOpen: boolean;
  setLineEndCapMenuOpen: Dispatch<SetStateAction<boolean>>;
  updateShapeElement: (
    id: string,
    updater: (map: Y.Map<unknown>) => void,
  ) => void;
};

const CAP_ITEMS = [
  { id: "none", icon: null },
  { id: "arrow", icon: ARROW_ICON },
  { id: "circle", icon: ELLIPSE_ICON },
  { id: "square", icon: SQUARE_ICON },
] as const;

export function ShapeToolbar({
  activeShapeElement,
  hasTextToolbar,
  shapeFillMenuOpen,
  setShapeFillMenuOpen,
  shapeStrokeMenuOpen,
  setShapeStrokeMenuOpen,
  lineStartCapMenuOpen,
  setLineStartCapMenuOpen,
  lineEndCapMenuOpen,
  setLineEndCapMenuOpen,
  updateShapeElement,
}: ShapeToolbarProps) {
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
        padding: "8px 10px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(21,28,58,0.16)",
        boxShadow: "0 10px 24px rgba(18,22,40,0.12)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {activeShapeElement.type === "rect" ? (
        <>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              style={{
                ...textToolbarIconButtonStyle,
                border: "none",
                background: "transparent",
              }}
              onClick={() => {
                setShapeFillMenuOpen((prev) => !prev);
                setShapeStrokeMenuOpen(false);
              }}
            >
              <span
                aria-hidden
                style={{
                  width: TEXT_TOOLBAR_ICON_SIZE,
                  height: TEXT_TOOLBAR_ICON_SIZE,
                  backgroundColor: activeShapeElement.fill,
                  WebkitMaskImage: `url(${SQUARE_FILL_ICON})`,
                  maskImage: `url(${SQUARE_FILL_ICON})`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
            </button>
            {shapeFillMenuOpen ? (
              <div style={textToolbarDropdownStyle}>
                <input
                  type="color"
                  value={activeShapeElement.fill}
                  onChange={(e) =>
                    updateShapeElement(activeShapeElement.id, (map) => {
                      map.set("fill", e.target.value);
                    })
                  }
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={activeShapeElement.fillOpacity}
                  onChange={(e) =>
                    updateShapeElement(activeShapeElement.id, (map) => {
                      map.set("fillOpacity", Number(e.target.value));
                    })
                  }
                />
              </div>
            ) : null}
          </div>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              style={{
                ...textToolbarIconButtonStyle,
                border: "none",
                background: "transparent",
              }}
              onClick={() => {
                setShapeStrokeMenuOpen((prev) => !prev);
                setShapeFillMenuOpen(false);
              }}
            >
              <span
                aria-hidden
                style={{
                  width: TEXT_TOOLBAR_ICON_SIZE,
                  height: TEXT_TOOLBAR_ICON_SIZE,
                  backgroundColor: activeShapeElement.stroke,
                  WebkitMaskImage: `url(${SQUARE_BORDER_ICON})`,
                  maskImage: `url(${SQUARE_BORDER_ICON})`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
            </button>
            {shapeStrokeMenuOpen ? (
              <div style={textToolbarDropdownStyle}>
                <input
                  type="color"
                  value={activeShapeElement.stroke}
                  onChange={(e) =>
                    updateShapeElement(activeShapeElement.id, (map) => {
                      map.set("stroke", e.target.value);
                    })
                  }
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={activeShapeElement.strokeOpacity}
                  onChange={(e) =>
                    updateShapeElement(activeShapeElement.id, (map) => {
                      map.set("strokeOpacity", Number(e.target.value));
                    })
                  }
                />
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <label
            style={{
              ...textToolbarColorButtonStyle,
              overflow: "visible",
              border: "none",
              background: "transparent",
            }}
          >
            <span
              aria-hidden
              style={{
                width: TEXT_TOOLBAR_ICON_SIZE,
                height: TEXT_TOOLBAR_ICON_SIZE,
                backgroundColor: activeShapeElement.stroke,
                WebkitMaskImage: `url(${SQUARE_FILL_ICON})`,
                maskImage: `url(${SQUARE_FILL_ICON})`,
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                WebkitMaskSize: "contain",
                maskSize: "contain",
              }}
            />
            <input
              type="color"
              value={activeShapeElement.stroke}
              onChange={(e) =>
                updateShapeElement(activeShapeElement.id, (map) => {
                  map.set("stroke", e.target.value);
                })
              }
              style={textToolbarColorInputStyle}
            />
          </label>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              style={{
                ...textToolbarIconButtonStyle,
                border: "none",
                background: "transparent",
              }}
              onClick={() => {
                setLineStartCapMenuOpen((prev) => !prev);
                setLineEndCapMenuOpen(false);
              }}
            >
              {(activeShapeElement.startCap ?? "none") === "arrow" ? (
                <img
                  src={ARROW_ICON}
                  alt="arrow"
                  width={TEXT_TOOLBAR_ICON_SIZE}
                  height={TEXT_TOOLBAR_ICON_SIZE}
                />
              ) : (activeShapeElement.startCap ?? "none") === "circle" ? (
                <img
                  src={ELLIPSE_ICON}
                  alt="circle"
                  width={TEXT_TOOLBAR_ICON_SIZE}
                  height={TEXT_TOOLBAR_ICON_SIZE}
                />
              ) : (activeShapeElement.startCap ?? "none") === "square" ? (
                <img
                  src={SQUARE_ICON}
                  alt="square"
                  width={TEXT_TOOLBAR_ICON_SIZE}
                  height={TEXT_TOOLBAR_ICON_SIZE}
                />
              ) : (
                <span style={{ fontSize: 12, color: "rgba(21,28,58,0.72)" }}>
                  None
                </span>
              )}
            </button>
            {lineStartCapMenuOpen ? (
              <div style={{ ...textToolbarDropdownStyle, flexDirection: "column" }}>
                {CAP_ITEMS.map((item) => (
                  <button
                    key={`start-cap-${item.id}`}
                    type="button"
                    style={{
                      ...textToolbarIconButtonStyle,
                      border: "none",
                      background: "transparent",
                    }}
                    onClick={() =>
                      updateShapeElement(activeShapeElement.id, (map) => {
                        map.set("startCap", item.id);
                      })
                    }
                  >
                    {item.icon ? (
                      <img
                        src={item.icon}
                        alt={item.id}
                        width={TEXT_TOOLBAR_ICON_SIZE}
                        height={TEXT_TOOLBAR_ICON_SIZE}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(21,28,58,0.72)",
                        }}
                      >
                        None
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              style={{
                ...textToolbarIconButtonStyle,
                border: "none",
                background: "transparent",
              }}
              onClick={() => {
                setLineEndCapMenuOpen((prev) => !prev);
                setLineStartCapMenuOpen(false);
              }}
            >
              {(activeShapeElement.endCap ?? "none") === "arrow" ? (
                <img
                  src={ARROW_ICON}
                  alt="arrow"
                  width={TEXT_TOOLBAR_ICON_SIZE}
                  height={TEXT_TOOLBAR_ICON_SIZE}
                />
              ) : (activeShapeElement.endCap ?? "none") === "circle" ? (
                <img
                  src={ELLIPSE_ICON}
                  alt="circle"
                  width={TEXT_TOOLBAR_ICON_SIZE}
                  height={TEXT_TOOLBAR_ICON_SIZE}
                />
              ) : (activeShapeElement.endCap ?? "none") === "square" ? (
                <img
                  src={SQUARE_ICON}
                  alt="square"
                  width={TEXT_TOOLBAR_ICON_SIZE}
                  height={TEXT_TOOLBAR_ICON_SIZE}
                />
              ) : (
                <span style={{ fontSize: 12, color: "rgba(21,28,58,0.72)" }}>
                  None
                </span>
              )}
            </button>
            {lineEndCapMenuOpen ? (
              <div style={{ ...textToolbarDropdownStyle, flexDirection: "column" }}>
                {CAP_ITEMS.map((item) => (
                  <button
                    key={`end-cap-${item.id}`}
                    type="button"
                    style={{
                      ...textToolbarIconButtonStyle,
                      border: "none",
                      background: "transparent",
                    }}
                    onClick={() =>
                      updateShapeElement(activeShapeElement.id, (map) => {
                        map.set("endCap", item.id);
                      })
                    }
                  >
                    {item.icon ? (
                      <img
                        src={item.icon}
                        alt={item.id}
                        width={TEXT_TOOLBAR_ICON_SIZE}
                        height={TEXT_TOOLBAR_ICON_SIZE}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(21,28,58,0.72)",
                        }}
                      >
                        None
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Rounded
            <input
              type="checkbox"
              checked={activeShapeElement.rounded === true}
              onChange={(e) =>
                updateShapeElement(activeShapeElement.id, (map) => {
                  map.set("rounded", e.target.checked);
                })
              }
            />
          </label>
        </>
      )}
    </div>
  );
}
