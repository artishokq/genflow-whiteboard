import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  listBoardMembersRequest,
  removeBoardMemberRequest,
  createBoardShareLinkRequest,
  listBoardShareLinksRequest,
  revokeBoardShareLinkRequest,
  updateBoardMemberRoleRequest,
  type BoardMemberRow,
  type BoardShareLinkRow,
} from "../../../shared/api/boardsApi";
import { getApiErrorMessage } from "../../../shared/api/getApiErrorMessage";
import { useAuthStore } from "../../../shared/store/authStore";
import { UserAvatar } from "../../../shared/ui/UserAvatar/UserAvatar";
import { SHARE_ICON } from "../../../widgets/board-top-bar/model/constants";

import styles from "./BoardShareMenu.module.css";

type BoardShareMenuProps = {
  boardId: string;
  buttonClassName: string;
  iconClassName: string;
};

function boardUrl(boardId: string, shareToken: string) {
  const path = `/board/${encodeURIComponent(boardId)}?share=${encodeURIComponent(shareToken)}`;
  return `${window.location.origin}${path}`;
}

export function BoardShareMenu({
  boardId,
  buttonClassName,
  iconClassName,
}: BoardShareMenuProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [isOpen, setIsOpen] = useState(false);
  const [links, setLinks] = useState<BoardShareLinkRow[]>([]);
  const [members, setMembers] = useState<BoardMemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ links: nextLinks }, { members: nextMembers }] = await Promise.all([
        listBoardShareLinksRequest(boardId),
        listBoardMembersRequest(boardId),
      ]);
      setLinks(nextLinks);
      setMembers(nextMembers);
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setLoading(false);
    }
  }, [boardId, t]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    void refreshData();

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, refreshData]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError(t("board.shareCopyFailed"));
    }
  };

  const createAndCopy = async (role: "viewer" | "editor") => {
    setBusy(true);
    setError(null);
    try {
      const { link } = await createBoardShareLinkRequest(boardId, role);
      const url = boardUrl(boardId, link.token);
      await copyText(url);
      await refreshData();
      setIsOpen(false);
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async (linkId: string) => {
    setBusy(true);
    setError(null);
    try {
      await revokeBoardShareLinkRequest(boardId, linkId);
      await refreshData();
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setBusy(false);
    }
  };

  const onMemberRoleChange = async (
    userId: string,
    role: "viewer" | "editor",
  ) => {
    setBusy(true);
    setError(null);
    try {
      await updateBoardMemberRoleRequest(boardId, userId, role);
      await refreshData();
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setBusy(false);
    }
  };

  const onRemoveMember = async (userId: string) => {
    setBusy(true);
    setError(null);
    try {
      await removeBoardMemberRequest(boardId, userId);
      await refreshData();
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap} ref={rootRef}>
      <button
        type="button"
        className={buttonClassName}
        aria-label={t("board.share")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img src={SHARE_ICON} alt="" className={iconClassName} />
      </button>
      {isOpen ? (
        <div className={styles.popover} role="dialog" aria-label={t("board.shareTitle")}>
          <p className={styles.title}>{t("board.shareTitle")}</p>
          <p className={styles.hint}>{t("board.shareHint")}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              disabled={busy}
              onClick={() => void createAndCopy("viewer")}
            >
              {t("board.shareCreateView")}
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              disabled={busy}
              onClick={() => void createAndCopy("editor")}
            >
              {t("board.shareCreateEdit")}
            </button>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          <p className={styles.listTitle}>{t("board.shareActiveLinks")}</p>
          {loading ? (
            <p className={styles.muted}>{t("board.shareLoadingLinks")}</p>
          ) : links.filter((l) => !l.revokedAt).length === 0 ? (
            <p className={styles.muted}>{t("board.shareNoLinks")}</p>
          ) : (
            <ul className={styles.list}>
              {links
                .filter((l) => !l.revokedAt)
                .map((l) => (
                  <li key={l.id} className={styles.listItem}>
                    <span>
                      {l.role === "viewer"
                        ? t("board.shareRoleViewer")
                        : t("board.shareRoleEditor")}
                    </span>
                    <button
                      type="button"
                      className={styles.revoke}
                      disabled={busy}
                      onClick={() => void onRevoke(l.id)}
                    >
                      {t("board.shareRevoke")}
                    </button>
                  </li>
                ))}
            </ul>
          )}
          <p className={styles.listTitle}>{t("board.shareMembersTitle")}</p>
          {loading ? (
            <p className={styles.muted}>{t("board.shareLoadingMembers")}</p>
          ) : members.length === 0 ? (
            <p className={styles.muted}>{t("board.shareNoMembers")}</p>
          ) : (
            <ul className={styles.list}>
              {members.map((m) => (
                <li key={m.userId} className={styles.memberItem}>
                  <div className={styles.memberLead}>
                    <UserAvatar
                      userId={m.userId}
                      firstName={m.firstName}
                      lastName={m.lastName}
                      email={m.email}
                      avatarObjectKey={m.avatarObjectKey ?? null}
                      accessToken={accessToken}
                      sizePx={28}
                      className={styles.memberAvatar}
                    />
                    <div className={styles.memberMain}>
                      <span className={styles.memberName}>
                        {[m.firstName, m.lastName].filter(Boolean).join(" ").trim() ||
                          m.email}
                      </span>
                      <span className={styles.memberEmail}>{m.email}</span>
                    </div>
                  </div>
                  <div className={styles.memberActions}>
                    <select
                      className={styles.roleSelect}
                      value={m.role}
                      disabled={busy}
                      onChange={(e) =>
                        void onMemberRoleChange(
                          m.userId,
                          e.target.value as "viewer" | "editor",
                        )
                      }
                    >
                      <option value="viewer">{t("board.shareRoleViewer")}</option>
                      <option value="editor">{t("board.shareRoleEditor")}</option>
                    </select>
                    <button
                      type="button"
                      className={styles.revoke}
                      disabled={busy}
                      onClick={() => void onRemoveMember(m.userId)}
                    >
                      {t("board.shareRemoveMember")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
