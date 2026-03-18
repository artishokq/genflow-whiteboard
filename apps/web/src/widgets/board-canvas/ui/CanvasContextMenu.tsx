import type { ContextMenuState } from "../model/types";
import { menuItemStyle } from "../model/styles";
import { useTranslation } from "react-i18next";

type CanvasContextMenuProps = {
  contextMenu: ContextMenuState;
  canPaste: boolean;
  onCopy: (ids: string[]) => void;
  onDuplicate: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onPaste: () => void;
  onDownloadImage?: (file: string) => void;
  onClose: () => void;
};

export function CanvasContextMenu({
  contextMenu,
  canPaste,
  onCopy,
  onDuplicate,
  onDelete,
  onPaste,
  onDownloadImage,
  onClose,
}: CanvasContextMenuProps) {
  const { t } = useTranslation();
  const downloadImageFile =
    typeof contextMenu.downloadImageFile === "string"
      ? contextMenu.downloadImageFile.trim()
      : "";
  const canDownloadImage = downloadImageFile.length > 0;
  return (
    <div
      style={{
        position: "fixed",
        top: contextMenu.y,
        left: contextMenu.x,
        zIndex: 20,
        minWidth: 170,
        borderRadius: 10,
        border: "1px solid rgba(32,36,54,0.12)",
        background: "#fff",
        boxShadow: "0 10px 24px rgba(18,22,40,0.2)",
        padding: 6,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {contextMenu.kind === "shape" ? (
        <>
          <button
            type="button"
            style={menuItemStyle}
            onClick={() => {
              onCopy(contextMenu.targetIds);
              onClose();
            }}
          >
            Copy
          </button>
          <button
            type="button"
            style={menuItemStyle}
            onClick={() => {
              onDuplicate(contextMenu.targetIds);
              onClose();
            }}
          >
            Duplicate
          </button>
          {canDownloadImage ? (
            <button
              type="button"
              style={menuItemStyle}
              onClick={() => {
                onDownloadImage?.(downloadImageFile);
                onClose();
              }}
            >
              {t("board.contextMenuDownloadImage")}
            </button>
          ) : null}
          <button
            type="button"
            style={{ ...menuItemStyle, color: "#962839" }}
            onClick={() => {
              onDelete(contextMenu.targetIds);
              onClose();
            }}
          >
            Delete
          </button>
        </>
      ) : (
        <button
          type="button"
          style={menuItemStyle}
          disabled={!canPaste}
          onClick={() => {
            onPaste();
            onClose();
          }}
        >
          Paste
        </button>
      )}
    </div>
  );
}
