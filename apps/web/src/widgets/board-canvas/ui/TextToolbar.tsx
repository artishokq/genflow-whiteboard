import type { Dispatch, SetStateAction } from "react";
import type * as Y from "yjs";

import type { BoardElement } from "../../../entities/board";

import {
  ALIGN_CENTER_ICON,
  ALIGN_LEFT_ICON,
  ALIGN_RIGHT_ICON,
  BOLD_ICON,
  FONT_OPTIONS,
  ITALIC_ICON,
  STICKER_BASE_COLORS,
  STRIKETHROUGH_ICON,
  TEXT_BG_ICON,
  TEXT_COLOR_ICON,
  TEXT_TOOLBAR_ICON_SIZE,
  UNDERLINE_ICON,
} from "../model/constants";
import {
  textToolbarColorButtonStyle,
  textToolbarColorInputStyle,
  textToolbarDividerStyle,
  textToolbarDropdownStyle,
  textToolbarIconButtonActiveStyle,
  textToolbarIconButtonStyle,
} from "../model/styles";

type ActiveTextElement = Extract<BoardElement, { type: "text" }>;

type TextToolbarProps = {
  activeTextElement: ActiveTextElement;
  alignMenuOpen: boolean;
  setAlignMenuOpen: Dispatch<SetStateAction<boolean>>;
  styleMenuOpen: boolean;
  setStyleMenuOpen: Dispatch<SetStateAction<boolean>>;
  updateTextElement: (id: string, updater: (map: Y.Map<unknown>) => void) => void;
};

export function TextToolbar({
  activeTextElement,
  alignMenuOpen,
  setAlignMenuOpen,
  styleMenuOpen,
  setStyleMenuOpen,
  updateTextElement,
}: TextToolbarProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(255, 255, 255, 0.94)",
        border: "1px solid rgba(21, 28, 58, 0.16)",
        boxShadow:
          "0 10px 30px rgba(45, 42, 95, 0.12), 0 2px 10px rgba(45, 42, 95, 0.06)",
        backdropFilter: "blur(10px)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <select
        value={activeTextElement.fontFamily}
        style={{
          height: 34,
          minWidth: 150,
          borderRadius: 10,
          border: "1px solid rgba(21, 28, 58, 0.18)",
          background: "rgba(255, 255, 255, 0.98)",
          color: "#26214f",
          padding: "0 10px",
          fontSize: 14,
        }}
        onChange={(e) =>
          updateTextElement(activeTextElement.id, (map) => {
            map.set("fontFamily", e.target.value);
          })
        }
      >
        {FONT_OPTIONS.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>
      <span style={textToolbarDividerStyle} aria-hidden>
        |
      </span>
      <input
        type="number"
        min={8}
        max={180}
        value={Math.round(activeTextElement.fontSize)}
        onChange={(e) =>
          updateTextElement(activeTextElement.id, (map) => {
            map.set("fontSize", Math.max(8, Number(e.target.value) || 8));
          })
        }
        style={{
          width: 66,
          height: 34,
          borderRadius: 10,
          border: "1px solid rgba(21, 28, 58, 0.18)",
          background: "rgba(255, 255, 255, 0.98)",
          color: "#26214f",
          padding: "0 10px",
          fontSize: 14,
        }}
      />
      <span style={textToolbarDividerStyle} aria-hidden>
        |
      </span>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          style={textToolbarIconButtonStyle}
          onClick={() => {
            setAlignMenuOpen((prev) => !prev);
            setStyleMenuOpen(false);
          }}
        >
          <img
            src={
              activeTextElement.align === "center"
                ? ALIGN_CENTER_ICON
                : activeTextElement.align === "right"
                  ? ALIGN_RIGHT_ICON
                  : ALIGN_LEFT_ICON
            }
            alt="align"
            width={TEXT_TOOLBAR_ICON_SIZE}
            height={TEXT_TOOLBAR_ICON_SIZE}
          />
        </button>
        {alignMenuOpen ? (
          <div style={textToolbarDropdownStyle}>
            <button
              type="button"
              style={textToolbarIconButtonStyle}
              onClick={() => {
                updateTextElement(activeTextElement.id, (map) => {
                  map.set("align", "left");
                });
                setAlignMenuOpen(false);
              }}
            >
              <img
                src={ALIGN_LEFT_ICON}
                alt="align left"
                width={TEXT_TOOLBAR_ICON_SIZE}
                height={TEXT_TOOLBAR_ICON_SIZE}
              />
            </button>
            <button
              type="button"
              style={textToolbarIconButtonStyle}
              onClick={() => {
                updateTextElement(activeTextElement.id, (map) => {
                  map.set("align", "center");
                });
                setAlignMenuOpen(false);
              }}
            >
              <img
                src={ALIGN_CENTER_ICON}
                alt="align center"
                width={TEXT_TOOLBAR_ICON_SIZE}
                height={TEXT_TOOLBAR_ICON_SIZE}
              />
            </button>
            <button
              type="button"
              style={textToolbarIconButtonStyle}
              onClick={() => {
                updateTextElement(activeTextElement.id, (map) => {
                  map.set("align", "right");
                });
                setAlignMenuOpen(false);
              }}
            >
              <img
                src={ALIGN_RIGHT_ICON}
                alt="align right"
                width={TEXT_TOOLBAR_ICON_SIZE}
                height={TEXT_TOOLBAR_ICON_SIZE}
              />
            </button>
          </div>
        ) : null}
      </div>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          style={textToolbarIconButtonStyle}
          onClick={() => {
            setStyleMenuOpen((prev) => !prev);
            setAlignMenuOpen(false);
          }}
        >
          <img
            src={BOLD_ICON}
            alt="text styles"
            width={TEXT_TOOLBAR_ICON_SIZE}
            height={TEXT_TOOLBAR_ICON_SIZE}
          />
        </button>
        {styleMenuOpen ? (
          <div style={textToolbarDropdownStyle}>
            <button
              type="button"
              style={{
                ...textToolbarIconButtonStyle,
                ...(activeTextElement.bold
                  ? textToolbarIconButtonActiveStyle
                  : {}),
              }}
              onClick={() =>
                updateTextElement(activeTextElement.id, (map) => {
                  map.set("bold", !activeTextElement.bold);
                })
              }
            >
              <img
                src={BOLD_ICON}
                alt="bold"
                width={TEXT_TOOLBAR_ICON_SIZE}
                height={TEXT_TOOLBAR_ICON_SIZE}
              />
            </button>
            <button
              type="button"
              style={{
                ...textToolbarIconButtonStyle,
                ...(activeTextElement.italic
                  ? textToolbarIconButtonActiveStyle
                  : {}),
              }}
              onClick={() =>
                updateTextElement(activeTextElement.id, (map) => {
                  map.set("italic", !activeTextElement.italic);
                })
              }
            >
              <img
                src={ITALIC_ICON}
                alt="italic"
                width={TEXT_TOOLBAR_ICON_SIZE}
                height={TEXT_TOOLBAR_ICON_SIZE}
              />
            </button>
            <button
              type="button"
              style={{
                ...textToolbarIconButtonStyle,
                ...(activeTextElement.underline
                  ? textToolbarIconButtonActiveStyle
                  : {}),
              }}
              onClick={() =>
                updateTextElement(activeTextElement.id, (map) => {
                  map.set("underline", !activeTextElement.underline);
                })
              }
            >
              <img
                src={UNDERLINE_ICON}
                alt="underline"
                width={TEXT_TOOLBAR_ICON_SIZE}
                height={TEXT_TOOLBAR_ICON_SIZE}
              />
            </button>
            <button
              type="button"
              style={{
                ...textToolbarIconButtonStyle,
                ...(activeTextElement.strike
                  ? textToolbarIconButtonActiveStyle
                  : {}),
              }}
              onClick={() =>
                updateTextElement(activeTextElement.id, (map) => {
                  map.set("strike", !activeTextElement.strike);
                })
              }
            >
              <img
                src={STRIKETHROUGH_ICON}
                alt="strikethrough"
                width={TEXT_TOOLBAR_ICON_SIZE}
                height={TEXT_TOOLBAR_ICON_SIZE}
              />
            </button>
          </div>
        ) : null}
      </div>
      <label style={textToolbarColorButtonStyle}>
        <img
          src={TEXT_COLOR_ICON}
          alt="text color"
          width={TEXT_TOOLBAR_ICON_SIZE}
          height={TEXT_TOOLBAR_ICON_SIZE}
        />
        <input
          type="color"
          value={activeTextElement.fill}
          onChange={(e) =>
            updateTextElement(activeTextElement.id, (map) => {
              map.set("fill", e.target.value);
            })
          }
          style={textToolbarColorInputStyle}
        />
      </label>
      <label style={textToolbarColorButtonStyle}>
        <img
          src={TEXT_BG_ICON}
          alt="text background"
          width={TEXT_TOOLBAR_ICON_SIZE}
          height={TEXT_TOOLBAR_ICON_SIZE}
        />
        <input
          type="color"
          value={
            activeTextElement.background === "transparent"
              ? "#ffffff"
              : activeTextElement.background
          }
          onChange={(e) =>
            updateTextElement(activeTextElement.id, (map) => {
              map.set("background", e.target.value);
            })
          }
          style={textToolbarColorInputStyle}
        />
      </label>
      {activeTextElement.textKind === "sticker" ? (
        <>
          <span style={textToolbarDividerStyle} aria-hidden>
            |
          </span>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {STICKER_BASE_COLORS.map((color) => {
              const isActive =
                activeTextElement.background.toLowerCase() ===
                color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    updateTextElement(activeTextElement.id, (map) => {
                      map.set("background", color);
                    })
                  }
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: isActive
                      ? "2px solid rgba(32,38,72,0.82)"
                      : "1px solid rgba(21,28,58,0.2)",
                    background: color,
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title={color}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
