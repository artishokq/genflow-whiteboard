import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { TFunction } from "i18next";

import {
  addBoardToSectionRequest,
  deleteBoardRequest,
  listBoardSectionsRequest,
  patchBoardRequest,
  removeBoardFromSectionRequest,
  setBoardStarredRequest,
  type BoardSummary,
} from "../../shared/api/boardsApi";
import { getApiErrorMessage } from "../../shared/api/getApiErrorMessage";

type UseBoardCardActionsParams = {
  boards: BoardSummary[];
  setBoards: Dispatch<SetStateAction<BoardSummary[]>>;
  t: TFunction;
  reloadSections: () => Promise<void>;
  setError: (value: string | null) => void;
  currentSectionId?: string;
};

export function useBoardCardActions({
  boards,
  setBoards,
  t,
  reloadSections,
  setError,
  currentSectionId,
}: UseBoardCardActionsParams) {
  const [menuState, setMenuState] = useState<{
    boardId: string;
    x: number;
    y: number;
  } | null>(null);
  const [processingBoardId, setProcessingBoardId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoardSummary | null>(null);
  const [sectionPickerBoard, setSectionPickerBoard] = useState<BoardSummary | null>(null);
  const [sectionChoices, setSectionChoices] = useState<
    Array<{ id: string; name: string; containsBoard: boolean }>
  >([]);
  const [sectionUpdatingId, setSectionUpdatingId] = useState<string | null>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!menuState) return;
    const closeMenu = () => setMenuState(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menuState]);

  const menuBoard = useMemo(
    () => boards.find((board) => board.id === menuState?.boardId) ?? null,
    [boards, menuState?.boardId],
  );

  const handleToggleStar = (boardId: string) => {
    const board = boards.find((item) => item.id === boardId);
    if (!board) {
      return;
    }
    const nextStarred = !board.isStarred;
    setBoards((prev) =>
      prev.map((item) =>
        item.id === boardId ? { ...item, isStarred: nextStarred } : item,
      ),
    );
    void setBoardStarredRequest(boardId, nextStarred).catch((e) => {
      setBoards((prev) =>
        prev.map((item) =>
          item.id === boardId ? { ...item, isStarred: board.isStarred } : item,
        ),
      );
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    });
  };

  const handleDeleteBoard = async () => {
    if (!deleteTarget) return;
    setProcessingBoardId(deleteTarget.id);
    setError(null);
    try {
      await deleteBoardRequest(deleteTarget.id);
      setBoards((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      await reloadSections();
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setProcessingBoardId(null);
    }
  };

  const handleOpenSectionPicker = async (board: BoardSummary) => {
    setError(null);
    try {
      const { sections } = await listBoardSectionsRequest({ boardId: board.id });
      setSectionChoices(
        sections.map((s) => ({
          id: s.id,
          name: s.name,
          containsBoard: s.containsBoard,
        })),
      );
      setSectionPickerBoard(board);
      setMenuState(null);
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    }
  };

  const handleToggleBoardSection = async (sectionId: string, nextIncluded: boolean) => {
    if (!sectionPickerBoard) {
      return;
    }
    setSectionUpdatingId(sectionId);
    setError(null);
    try {
      if (nextIncluded) {
        await addBoardToSectionRequest(sectionId, sectionPickerBoard.id);
      } else {
        await removeBoardFromSectionRequest(sectionId, sectionPickerBoard.id);
      }
      setSectionChoices((prev) =>
        prev.map((item) =>
          item.id === sectionId ? { ...item, containsBoard: nextIncluded } : item,
        ),
      );
      await reloadSections();
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setSectionUpdatingId(null);
    }
  };

  const handleRenameSubmit = async (boardId: string) => {
    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      setRenameValue("");
      setRenamingBoardId(null);
      return;
    }
    setError(null);
    setProcessingBoardId(boardId);
    try {
      const { board: updated } = await patchBoardRequest(boardId, nextTitle);
      setBoards((prev) =>
        prev.map((item) => (item.id === boardId ? { ...item, ...updated } : item)),
      );
      setRenamingBoardId(null);
      setRenameValue("");
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setProcessingBoardId(null);
    }
  };

  const handleRemoveFromCurrentSection = async (boardId: string) => {
    if (!currentSectionId) return;
    setProcessingBoardId(boardId);
    setError(null);
    try {
      await removeBoardFromSectionRequest(currentSectionId, boardId);
      setBoards((prev) => prev.filter((item) => item.id !== boardId));
      await reloadSections();
      setMenuState(null);
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setProcessingBoardId(null);
    }
  };

  return {
    menuState,
    setMenuState,
    processingBoardId,
    deleteTarget,
    setDeleteTarget,
    sectionPickerBoard,
    setSectionPickerBoard,
    sectionChoices,
    sectionUpdatingId,
    renamingBoardId,
    setRenamingBoardId,
    renameValue,
    setRenameValue,
    menuBoard,
    handleToggleStar,
    handleDeleteBoard,
    handleOpenSectionPicker,
    handleToggleBoardSection,
    handleRenameSubmit,
    handleRemoveFromCurrentSection,
  };
}
