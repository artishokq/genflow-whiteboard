import type Konva from "konva";
import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";

type KonvaBoardImageProps = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  listening: boolean;
  onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
};

export function KonvaBoardImage({
  id,
  src,
  x,
  y,
  width,
  height,
  listening,
  onMouseDown,
  onContextMenu,
  onDragEnd,
  onTransformEnd,
}: KonvaBoardImageProps) {
  const [image] = useImage(src, "anonymous");
  return (
    <KonvaImage
      id={id}
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      listening={listening}
      draggable={listening}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}
