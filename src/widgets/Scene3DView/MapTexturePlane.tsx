import { useState, useEffect } from 'react';
import * as THREE from 'three';

import type { LocalProjection } from '@/shared/geo';
import type { SceneBounds } from './SceneBounds';

const TILE_SIZE = 256;
const MAX_TILES = 64;
const SUBDOMAINS = ['a', 'b', 'c'];

function lonToTileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * (1 << z));
}

function latToTileY(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * (1 << z),
  );
}

function tileXToLon(x: number, z: number): number {
  return (x / (1 << z)) * 360 - 180;
}

function tileYToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (1 << z);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

function findZoom(
  swLat: number,
  swLon: number,
  neLat: number,
  neLon: number,
): number {
  for (let z = 18; z >= 1; z--) {
    const xMin = lonToTileX(swLon, z);
    const xMax = lonToTileX(neLon, z);
    const yMin = latToTileY(neLat, z);
    const yMax = latToTileY(swLat, z);
    if ((xMax - xMin + 1) * (yMax - yMin + 1) <= MAX_TILES) return z;
  }
  return 1;
}

interface PlaneExtent {
  cx: number;
  cz: number;
  width: number;
  depth: number;
}

interface MapTexturePlaneProps {
  projection: LocalProjection;
  bounds: SceneBounds;
}

export function MapTexturePlane({ projection, bounds }: MapTexturePlaneProps) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [extent, setExtent] = useState<PlaneExtent | null>(null);

  useEffect(() => {
    const halfX = bounds.sizeX / 2;
    const halfZ = bounds.sizeZ / 2;

    // scene z = -local.y → local.y = -z
    const sw = projection.toGeo({
      x: bounds.centerX - halfX,
      y: -(bounds.centerZ + halfZ),
    });
    const ne = projection.toGeo({
      x: bounds.centerX + halfX,
      y: -(bounds.centerZ - halfZ),
    });

    const zoom = findZoom(sw.lat, sw.lon, ne.lat, ne.lon);
    const txMin = lonToTileX(sw.lon, zoom);
    const txMax = lonToTileX(ne.lon, zoom);
    const tyMin = latToTileY(ne.lat, zoom);
    const tyMax = latToTileY(sw.lat, zoom);

    const tilesW = txMax - txMin + 1;
    const tilesH = tyMax - tyMin + 1;

    const canvas = document.createElement('canvas');
    canvas.width = tilesW * TILE_SIZE;
    canvas.height = tilesH * TILE_SIZE;
    const ctx = canvas.getContext('2d')!;

    const gridSW = projection.toLocal({
      lat: tileYToLat(tyMax + 1, zoom),
      lon: tileXToLon(txMin, zoom),
    });
    const gridNE = projection.toLocal({
      lat: tileYToLat(tyMin, zoom),
      lon: tileXToLon(txMax + 1, zoom),
    });

    const planeW = gridNE.x - gridSW.x;
    const planeD = gridSW.y - gridNE.y;
    const cx = (gridSW.x + gridNE.x) / 2;
    const cz = -(gridSW.y + gridNE.y) / 2;

    let loaded = 0;
    const total = tilesW * tilesH;

    const onTileReady = () => {
      loaded++;
      if (loaded < total) return;
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
      setExtent({ cx, cz, width: planeW, depth: planeD });
    };

    for (let ty = tyMin; ty <= tyMax; ty++) {
      for (let tx = txMin; tx <= txMax; tx++) {
        const s = SUBDOMAINS[(tx + ty) % 3];
        const url = `https://${s}.tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(
            img,
            (tx - txMin) * TILE_SIZE,
            (ty - tyMin) * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
          );
          onTileReady();
        };
        img.onerror = onTileReady;
        img.src = url;
      }
    }

    return () => {
      texture?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, bounds]);

  if (!texture || !extent) return null;

  return (
    <mesh rotation-x={-Math.PI / 2} position={[extent.cx, -1.5, extent.cz]}>
      <planeGeometry args={[extent.width, extent.depth]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}
