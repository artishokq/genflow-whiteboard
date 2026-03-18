import { Layer, Line } from "react-konva";

type GridLayerProps = {
  xs: number[];
  ys: number[];
  worldTop: number;
  worldBottom: number;
  worldLeft: number;
  worldRight: number;
  pad: number;
  strokeW: number;
};

export function GridLayer({
  xs,
  ys,
  worldTop,
  worldBottom,
  worldLeft,
  worldRight,
  pad,
  strokeW,
}: GridLayerProps) {
  return (
    <Layer listening={false}>
      {xs.map((gx) => (
        <Line
          key={`v-${gx}`}
          points={[gx, worldTop - pad, gx, worldBottom + pad]}
          stroke="rgba(80, 90, 140, 0.18)"
          strokeWidth={strokeW}
          listening={false}
        />
      ))}
      {ys.map((gy) => (
        <Line
          key={`h-${gy}`}
          points={[worldLeft - pad, gy, worldRight + pad, gy]}
          stroke="rgba(80, 90, 140, 0.18)"
          strokeWidth={strokeW}
          listening={false}
        />
      ))}
    </Layer>
  );
}
