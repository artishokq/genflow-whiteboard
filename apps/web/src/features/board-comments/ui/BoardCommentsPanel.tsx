import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { CommentThread } from "../../../entities/comment";
import { useAuthStore } from "../../../shared/store/authStore";
import { UserAvatar } from "../../../shared/ui/UserAvatar/UserAvatar";

import styles from "./BoardCommentsPanel.module.css";

type BoardCommentsPanelProps = {
  threads: CommentThread[];
  loading: boolean;
  error: string | null;
  onPickThread: (threadId: string) => void;
  onClose: () => void;
};

function messagePreview(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 62 ? `${compact.slice(0, 62)}…` : compact;
}

function formatCommentTime(raw: string, locale: string) {
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "";
  const now = new Date();
  const sameDay =
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate();
  const datePart = sameDay
    ? locale.startsWith("ru")
      ? "Сегодня"
      : "Today"
    : new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(dt);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
  return `${datePart}, ${timePart}`;
}

export function BoardCommentsPanel({
  threads,
  loading,
  error,
  onPickThread,
  onClose,
}: BoardCommentsPanelProps) {
  const { t, i18n } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);

  const sorted = useMemo(
    () =>
      [...threads].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [threads],
  );
  const locale = i18n.resolvedLanguage ?? "en";

  return (
    <section className={styles.panel} aria-label={t("board.commentsTitle")}>
      <div className={styles.header}>
        <span>{t("board.commentsTitle")}</span>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          ×
        </button>
      </div>
      <div className={styles.list}>
        {loading ? <p className={styles.muted}>{t("board.commentsLoading")}</p> : null}
        {!loading && sorted.length === 0 ? (
          <p className={styles.muted}>{t("board.commentsEmpty")}</p>
        ) : null}
        {sorted.map((thread) => (
          <button
            key={thread.id}
            type="button"
            className={styles.threadBtn}
            onClick={() => onPickThread(thread.id)}
          >
            <div className={styles.threadHeader}>
              {thread.messages[0]?.authorId ? (
                <UserAvatar
                  userId={thread.messages[0].authorId}
                  firstName={thread.messages[0].authorFirstName}
                  lastName={thread.messages[0].authorLastName}
                  email={thread.messages[0].authorEmail}
                  avatarObjectKey={thread.messages[0].authorAvatarObjectKey ?? null}
                  accessToken={accessToken}
                  sizePx={26}
                  className={styles.threadAvatar}
                />
              ) : null}
              <div className={styles.threadHeadText}>
                <span className={styles.threadAuthor}>
                  {[
                    thread.messages[0]?.authorFirstName,
                    thread.messages[0]?.authorLastName,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || thread.messages[0]?.authorEmail}
                </span>
                <span className={styles.threadTime}>
                  {formatCommentTime(thread.createdAt, locale)}
                </span>
              </div>
            </div>
            <span className={styles.threadPreview}>
              {messagePreview(thread.messages[0]?.text ?? "")}
            </span>
            {thread.messages.length > 1 ? (
              <span className={styles.threadMore}>
                {t("board.commentsShowMore", { count: thread.messages.length - 1 })}
              </span>
            ) : null}
            <span
              className={`${styles.threadMeta} ${
                thread.status === "resolved" ? styles.resolved : ""
              }`}
            >
              {thread.status === "resolved"
                ? t("board.commentsResolved")
                : t("board.commentsOpen")}
            </span>
          </button>
        ))}
      </div>
      {error ? <div className={styles.composerWrap}><p className={styles.error}>{error}</p></div> : null}
    </section>
  );
}
