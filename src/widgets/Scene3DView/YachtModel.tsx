import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { findIndexAtTime } from '@/shared/lib/binarySearchTrack';

interface LocalPoint {
  tMs: number;
  x: number;
  z: number;
  heading: number;
}

interface YachtModelProps {
  color: string;
  localTrack: LocalPoint[];
  getCurrentTime: () => number;
  scale: number;
}

export function YachtModel({ color, localTrack, getCurrentTime, scale }: YachtModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(3 * scale, 12 * scale, 8);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [scale]);

  useFrame(() => {
    if (!meshRef.current || localTrack.length === 0) return;
    const t = getCurrentTime();
    const idx = findIndexAtTime(localTrack, t);
    const point = localTrack[idx];
    meshRef.current.position.set(point.x, 1 * scale, point.z);
    meshRef.current.rotation.y = -(point.heading * Math.PI) / 180;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
