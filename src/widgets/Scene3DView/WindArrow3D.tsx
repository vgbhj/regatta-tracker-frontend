import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import * as THREE from 'three';

import type { WindPoint } from '@/features/analytics';

const MS_TO_KNOTS = 1.94384;
const DEG_TO_RAD = Math.PI / 180;

interface WindArrow3DProps {
  wind: WindPoint[];
  getCurrentTime: () => number;
  scale: number;
  x: number;
  z: number;
}

function findClosestWind(wind: WindPoint[], tMs: number): WindPoint {
  let best = wind[0];
  let bestDt = Math.abs(best.tMs - tMs);
  for (let i = 1; i < wind.length; i++) {
    const dt = Math.abs(wind[i].tMs - tMs);
    if (dt < bestDt) {
      best = wind[i];
      bestDt = dt;
    }
  }
  return best;
}

export function WindArrow3D({ wind, getCurrentTime, scale, x, z }: WindArrow3DProps) {
  const groupRef = useRef<Group>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const shaftGeo = useMemo(() => {
    const len = 30 * scale;
    const geo = new THREE.CylinderGeometry(0.8 * scale, 0.8 * scale, len, 8);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, -len / 2);
    return geo;
  }, [scale]);

  const headGeo = useMemo(() => {
    const len = 30 * scale;
    const h = 8 * scale;
    const geo = new THREE.ConeGeometry(3 * scale, h, 8);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -(len + h / 2));
    return geo;
  }, [scale]);

  useFrame(() => {
    if (!groupRef.current) return;
    const wp = findClosestWind(wind, getCurrentTime());
    // wind_azimuth = direction wind blows FROM (meteorological convention)
    // arrow points in the direction wind is going TO
    const rot = (wp.directionDeg + 180) * DEG_TO_RAD;
    groupRef.current.rotation.y = rot;
    if (textRef.current) {
      textRef.current.textContent = `${(wp.speedMs * MS_TO_KNOTS).toFixed(0)} kn`;
    }
  });

  const elevation = 40 * scale;

  return (
    <group ref={groupRef} position={[x, elevation, z]}>
      <mesh geometry={shaftGeo}>
        <meshStandardMaterial color="#e63946" />
      </mesh>
      <mesh geometry={headGeo}>
        <meshStandardMaterial color="#e63946" />
      </mesh>
      <Html
        position={[0, 6 * scale, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          ref={textRef}
          style={{
            color: '#e63946',
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            textShadow: '0 0 4px rgba(0,0,0,0.7)',
          }}
        />
      </Html>
    </group>
  );
}
