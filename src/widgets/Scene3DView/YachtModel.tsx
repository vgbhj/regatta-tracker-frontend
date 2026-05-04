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

function createHullGeometry(s: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const L = 10 * s;
  const W = 2.5 * s;

  shape.moveTo(0, L * 0.5);
  shape.bezierCurveTo(W * 0.6, L * 0.4, W, L * 0.1, W, -L * 0.2);
  shape.bezierCurveTo(W, -L * 0.4, W * 0.4, -L * 0.5, 0, -L * 0.5);
  shape.bezierCurveTo(-W * 0.4, -L * 0.5, -W, -L * 0.4, -W, -L * 0.2);
  shape.bezierCurveTo(-W, L * 0.1, -W * 0.6, L * 0.4, 0, L * 0.5);

  const extrudeSettings = {
    depth: 1.5 * s,
    bevelEnabled: true,
    bevelThickness: 0.3 * s,
    bevelSize: 0.2 * s,
    bevelSegments: 2,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.5 * s, 0);
  return geo;
}

function createSailGeometry(s: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(1.8 * s, 4 * s, 0, 8 * s);
  shape.lineTo(0, 0);

  const geo = new THREE.ShapeGeometry(shape);
  geo.translate(0, 1.5 * s, 0);
  return geo;
}

export function YachtModel({ color, localTrack, getCurrentTime, scale }: YachtModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  const hullGeo = useMemo(() => createHullGeometry(scale), [scale]);
  const sailGeo = useMemo(() => createSailGeometry(scale), [scale]);
  const mastHeight = 9 * scale;
  const mastRadius = 0.15 * scale;

  useFrame(() => {
    if (!groupRef.current || localTrack.length === 0) return;
    const t = getCurrentTime();
    const idx = findIndexAtTime(localTrack, t);
    const point = localTrack[idx];
    groupRef.current.position.set(point.x, 1 * scale, point.z);
    groupRef.current.rotation.y = -(point.heading * Math.PI) / 180;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={hullGeo}>
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[mastRadius, mastRadius, mastHeight, 8]} />
        <meshStandardMaterial color="#2a1a0a" roughness={0.8} />
      </mesh>

      <mesh position={[0, 0, 0.1 * scale]} rotation-y={Math.PI * 0.05}>
        <primitive object={sailGeo} attach="geometry" />
        <meshStandardMaterial
          color="#f5f0e8"
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
