import { useEffect, useMemo, useState } from "react";

import { userAvatarSrc } from "../../api/authApi";
import { userInitialsFromNames } from "../../lib/userInitials";

import styles from "./UserAvatar.module.css";

type UserAvatarProps = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarObjectKey?: string | null;
  accessToken: string | null;
  /** CSS pixel size (width & height) */
  sizePx: number;
  className?: string;
  title?: string;
};

export function UserAvatar({
  userId,
  firstName,
  lastName,
  email,
  avatarObjectKey,
  accessToken,
  sizePx,
  className,
  title,
}: UserAvatarProps) {
  const initials = useMemo(
    () => userInitialsFromNames(firstName, lastName, email),
    [email, firstName, lastName],
  );
  const src = useMemo(
    () => userAvatarSrc(userId, avatarObjectKey ?? null, accessToken),
    [accessToken, avatarObjectKey, userId],
  );
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const rootClass = [styles.root, className].filter(Boolean).join(" ");
  const fontSize = Math.max(10, Math.round(sizePx * 0.36));

  return (
    <div
      className={rootClass}
      style={{ width: sizePx, height: sizePx, fontSize }}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      <span className={styles.initials}>{initials}</span>
      {src ? (
        <img
          key={src}
          src={src}
          alt=""
          className={`${styles.photo} ${imgFailed ? styles.photoHidden : ""}`}
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      ) : null}
    </div>
  );
}
