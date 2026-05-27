import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

interface ManeuverMark3DProps {
  x: number;
  z: number;
  type: 'tack' | 'gybe';
  scale: number;
  tMs: number;
  getCurrentTime: () => number;
  selected: boolean;
  onClick: () => void;
}

const COLORS: Record<string, string> = {
  tack: '#f59e0b',
  gybe: '#8b5cf6',
};

export function ManeuverMark3D({
  x,
  z,
  type,
  scale,
  tMs,
  getCurrentTime,
  selected,
  onClick,
}: ManeuverMark3DProps) {
  const ref = useRef<Mesh>(null);
  const color = COLORS[type] ?? '#888';
  const radius = selected ? 3 * scale : 2 * scale;
  const height = selected ? 14 * scale : 8 * scale;

  useFrame(() => {
    if (ref.current) {
      ref.current.visible = getCurrentTime() >= tMs;
    }
  });

  return (
    <mesh
      ref={ref}
      position={[x, height / 2, z]}
      visible={false}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <cylinderGeometry args={[radius, radius * 0.3, height, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={selected ? color : '#000000'}
        emissiveIntensity={selected ? 0.4 : 0}
      />
    </mesh>
  );
}
