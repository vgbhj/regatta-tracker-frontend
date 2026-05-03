import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Line2 } from 'three-stdlib';

import { findIndexAtTime } from '@/shared/lib/binarySearchTrack';

interface LocalPoint {
  tMs: number;
  x: number;
  z: number;
}

interface TrackTrailProps {
  color: string;
  localTrack: LocalPoint[];
  getCurrentTime: () => number;
}

/**
 * Траектория яхты в 3D — drei <Line> (Line2 + LineMaterial).
 * Полный массив вершин передаётся один раз. Каждый кадр обновляется
 * только geometry.instanceCount (O(1)) — геометрия не пересоздаётся.
 * Line2 рендерит линию как mesh, что позволяет задать lineWidth в пикселях,
 * обходя ограничение WebGL на linewidth = 1px.
 */
export function TrackTrail({ color, localTrack, getCurrentTime }: TrackTrailProps) {
  const lineRef = useRef<Line2>(null);

  const points = useMemo(
    () => localTrack.map((p) => [p.x, 0.5, p.z] as [number, number, number]),
    [localTrack],
  );

  useFrame(() => {
    if (!lineRef.current || localTrack.length < 2) return;
    const t = getCurrentTime();
    const idx = findIndexAtTime(localTrack, t);
    lineRef.current.geometry.instanceCount = Math.max(0, idx);
  });

  if (points.length < 2) return null;

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={3}
      transparent
      opacity={0.8}
    />
  );
}
