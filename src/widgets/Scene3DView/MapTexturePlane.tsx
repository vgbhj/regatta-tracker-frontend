import { useState, useEffect } from 'react';
import * as THREE from 'three';

import type { LocalProjection } from '@/shared/geo';
import type { SceneBounds } from './SceneBounds';

const TILE_SIZE = 256;
const MAX_TILES = 64;
const SUBDOMAINS = ['a', 'b', 'c'];
const GRID = 128;

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

function isWaterPixel(r: number, g: number, b: number): boolean {
  return b > 170 && b > r + 15 && g > 140;
}

function blurHeightmap(
  src: Float32Array,
  w: number,
  h: number,
  radius: number,
): Float32Array {
  const dst = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            sum += src[ny * w + nx];
            count++;
          }
        }
      }
      dst[y * w + x] = sum / count;
    }
  }
  return dst;
}

function buildHeightmap(
  canvas: HTMLCanvasElement,
  landHeight: number,
): Float32Array {
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imgData.data;
  const raw = new Float32Array(GRID * GRID);

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const px = Math.floor((gx / (GRID - 1)) * (canvas.width - 1));
      const py = Math.floor((gy / (GRID - 1)) * (canvas.height - 1));
      const idx = (py * canvas.width + px) * 4;
      raw[gy * GRID + gx] = isWaterPixel(
        pixels[idx],
        pixels[idx + 1],
        pixels[idx + 2],
      )
        ? 0
        : landHeight;
    }
  }

  return blurHeightmap(blurHeightmap(raw, GRID, GRID, 2), GRID, GRID, 2);
}

interface PlaneData {
  texture: THREE.CanvasTexture;
  geometry: THREE.PlaneGeometry;
  cx: number;
  cz: number;
}

interface MapTexturePlaneProps {
  projection: LocalProjection;
  bounds: SceneBounds;
}

export function MapTexturePlane({ projection, bounds }: MapTexturePlaneProps) {
  const [data, setData] = useState<PlaneData | null>(null);

  useEffect(() => {
    let disposed = false;

    const halfX = bounds.sizeX / 2;
    const halfZ = bounds.sizeZ / 2;

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
    const landHeight = bounds.diagonal * 0.008;

    let loaded = 0;
    const total = tilesW * tilesH;

    const onTileReady = () => {
      loaded++;
      if (loaded < total || disposed) return;

      const heightmap = buildHeightmap(canvas, landHeight);

      const geo = new THREE.PlaneGeometry(
        planeW,
        planeD,
        GRID - 1,
        GRID - 1,
      );
      const pos = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < GRID * GRID; i++) {
        pos[i * 3 + 2] = heightmap[i];
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false;

      setData({ texture: tex, geometry: geo, cx, cz });
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
      disposed = true;
      data?.texture.dispose();
      data?.geometry.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, bounds]);

  if (!data) return null;

  return (
    <mesh rotation-x={-Math.PI / 2} position={[data.cx, -0.1, data.cz]}>
      <primitive object={data.geometry} attach="geometry" />
      <meshStandardMaterial
        map={data.texture}
        roughness={0.9}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
