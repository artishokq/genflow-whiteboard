import type { CSSProperties } from "react";

export const menuItemStyle: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  fontSize: 14,
  padding: "8px 10px",
  cursor: "pointer",
};

export const textToolbarIconButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid rgba(21, 28, 58, 0.18)",
  background: "rgba(255, 255, 255, 0.96)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

export const textToolbarIconButtonActiveStyle: CSSProperties = {
  background: "rgba(225, 232, 244, 0.9)",
  borderColor: "rgba(21, 28, 58, 0.24)",
};

export const textToolbarDropdownStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 12,
  background: "rgba(255, 255, 255, 0.94)",
  border: "1px solid rgba(21, 28, 58, 0.16)",
  boxShadow: "0 10px 24px rgba(45,42,95,0.14)",
  backdropFilter: "blur(10px)",
  zIndex: 13,
};

export const textToolbarColorButtonStyle: CSSProperties = {
  ...textToolbarIconButtonStyle,
  position: "relative",
  overflow: "hidden",
};

export const textToolbarDividerStyle: CSSProperties = {
  color: "rgba(21, 28, 58, 0.28)",
  fontSize: 18,
  lineHeight: 1,
  userSelect: "none",
};

export const textToolbarColorInputStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  opacity: 0,
  cursor: "pointer",
};
