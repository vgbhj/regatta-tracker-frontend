export interface SceneBounds {
  centerX: number;
  centerZ: number;
  sizeX: number;
  sizeZ: number;
  diagonal: number;
}

interface HasXZ {
  x: number;
  z: number;
}

export function computeSceneBounds(
  localTracks: Record<string, HasXZ[]>,
  localMarks: HasXZ[],
): SceneBounds | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let count = 0;

  for (const points of Object.values(localTracks)) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
      count++;
    }
  }

  for (const m of localMarks) {
    if (m.x < minX) minX = m.x;
    if (m.x > maxX) maxX = m.x;
    if (m.z < minZ) minZ = m.z;
    if (m.z > maxZ) maxZ = m.z;
    count++;
  }

  if (count === 0) return null;

  const padding = 2.0;
  const rawSizeX = maxX - minX || 100;
  const rawSizeZ = maxZ - minZ || 100;
  const sizeX = rawSizeX * padding;
  const sizeZ = rawSizeZ * padding;

  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    sizeX,
    sizeZ,
    diagonal: Math.sqrt(sizeX * sizeX + sizeZ * sizeZ),
  };
}
