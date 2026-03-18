import {
  Circle,
  Group,
  Image as KonvaImage,
  Text as KonvaText,
} from "react-konva";
import useImage from "use-image";

import type { CommentThread } from "../../../entities/comment";
import { userAvatarSrc } from "../../../shared/api/authApi";
import { userInitialsFromNames } from "../../../shared/lib/userInitials";

type CommentThreadPinProps = {
  thread: CommentThread;
  scale: number;
  accessToken: string | null;
  messageIcon: HTMLImageElement | undefined;
  messageDoneIcon: HTMLImageElement | undefined;
  isActive: boolean;
};

export function CommentThreadPin({
  thread,
  scale,
  accessToken,
  messageIcon,
  messageDoneIcon,
  isActive,
}: CommentThreadPinProps) {
  const m0 = thread.messages[0];
  const authorId = m0?.authorId ?? "";
  const avatarUrl =
    authorId && m0?.authorAvatarObjectKey
      ? userAvatarSrc(authorId, m0.authorAvatarObjectKey, accessToken)
      : null;
  const [avatarImg] = useImage(avatarUrl ?? "", "anonymous");
  const initials = userInitialsFromNames(
    m0?.authorFirstName ?? "",
    m0?.authorLastName ?? "",
    m0?.authorEmail ?? "",
  );

  const resolved = thread.status === "resolved";
  const badge = resolved ? messageDoneIcon : messageIcon;
  const showPhoto = Boolean(avatarUrl && avatarImg);
  const fontSize = Math.max(9 / scale, 10 / scale);
  const pinSize = 36 / scale;
  const avatarRadius = 12 / scale;
  const avatarCenterY = -0.5 / scale;

  return (
    <Group listening opacity={isActive ? 1 : 0.98}>
      {badge ? (
        <KonvaImage
          image={badge}
          x={-pinSize / 2}
          y={-pinSize / 2}
          width={pinSize}
          height={pinSize}
          listening
        />
      ) : null}
      {!resolved
        ? showPhoto ? (
            <Group
              clipFunc={(ctx) => {
                ctx.beginPath();
                ctx.arc(0, avatarCenterY, avatarRadius, 0, Math.PI * 2, false);
                ctx.closePath();
              }}
            >
              <KonvaImage
                image={avatarImg}
                x={-avatarRadius}
                y={avatarCenterY - avatarRadius}
                width={avatarRadius * 2}
                height={avatarRadius * 2}
                listening
              />
            </Group>
          ) : (
            <>
              <Circle
                radius={avatarRadius}
                x={0}
                y={avatarCenterY}
                fill="#5c6bc0"
                stroke="#fff"
                strokeWidth={1.5 / scale}
                listening
              />
              <KonvaText
                text={initials}
                x={-avatarRadius}
                y={avatarCenterY - fontSize * 0.55}
                width={avatarRadius * 2}
                align="center"
                fontSize={fontSize}
                fontStyle="bold"
                fill="#fff"
                listening={false}
              />
            </>
          )
        : null}
    </Group>
  );
}
