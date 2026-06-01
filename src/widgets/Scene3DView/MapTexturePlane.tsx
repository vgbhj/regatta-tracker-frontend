import { useState, useEffect } from 'react'
import * as THREE from 'three'

import type { LocalProjection } from '@/shared/geo'
import type { SceneBounds } from './SceneBounds'

const TILE_SIZE = 256
const MAX_TILES = 64
const SUBDOMAINS = ['a', 'b', 'c']
const GRID = 256

type Heightmap = Float32Array<ArrayBufferLike>

function lonToTileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * (1 << z))
}

function latToTileY(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * (1 << z))
}

function tileXToLon(x: number, z: number): number {
  return (x / (1 << z)) * 360 - 180
}

function tileYToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (1 << z)
  return (180 / Math.PI) * Math.atan(Math.sinh(n))
}

function findZoom(swLat: number, swLon: number, neLat: number, neLon: number): number {
  for (let z = 18; z >= 1; z--) {
    const xMin = lonToTileX(swLon, z)
    const xMax = lonToTileX(neLon, z)
    const yMin = latToTileY(neLat, z)
    const yMax = latToTileY(swLat, z)
    if ((xMax - xMin + 1) * (yMax - yMin + 1) <= MAX_TILES) return z
  }
  return 1
}

function isWaterPixel(r: number, g: number, b: number): boolean {
  return b > 180 && b > r + 30 && g > 150 && b >= g - 10
}

function sampleBilinear(map: Heightmap, w: number, h: number, fx: number, fy: number): number {
  const x0 = Math.max(0, Math.min(Math.floor(fx), w - 1))
  const y0 = Math.max(0, Math.min(Math.floor(fy), h - 1))
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = Math.min(y0 + 1, h - 1)
  const dx = fx - x0
  const dy = fy - y0
  const h00 = map[y0 * w + x0]
  const h10 = map[y0 * w + x1]
  const h01 = map[y1 * w + x0]
  const h11 = map[y1 * w + x1]
  return h00 * (1 - dx) * (1 - dy) + h10 * dx * (1 - dy) + h01 * (1 - dx) * dy + h11 * dx * dy
}

function blurHeightmap(src: Heightmap, w: number, h: number, radius: number): Heightmap {
  const dst = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      let count = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            sum += src[ny * w + nx]
            count++
          }
        }
      }
      dst[y * w + x] = sum / count
    }
  }
  return dst
}

function morphErode(mask: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let min = 1
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            if (mask[ny * w + nx] < min) min = mask[ny * w + nx]
          } else {
            min = 0
          }
        }
      }
      out[y * w + x] = min
    }
  }
  return out
}

function morphDilate(mask: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let max = 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            if (mask[ny * w + nx] > max) max = mask[ny * w + nx]
          }
        }
      }
      out[y * w + x] = max
    }
  }
  return out
}

/**
 * Chamfer distance transform: для каждой ячейки суши (mask > 0.5)
 * вычисляет приближённое евклидово расстояние до ближайшей воды.
 * Два прохода (прямой + обратный) с 8-связностью, O(n).
 */
function distanceTransform(mask: Float32Array, w: number, h: number): Float32Array {
  const INF = w + h
  const dist = new Float32Array(w * h)

  for (let i = 0; i < w * h; i++) {
    dist[i] = mask[i] > 0.5 ? INF : 0
  }

  const D = 1.414

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1)
      if (y > 0) dist[i] = Math.min(dist[i], dist[(y - 1) * w + x] + 1)
      if (x > 0 && y > 0) dist[i] = Math.min(dist[i], dist[(y - 1) * w + x - 1] + D)
      if (x < w - 1 && y > 0) dist[i] = Math.min(dist[i], dist[(y - 1) * w + x + 1] + D)
    }
  }

  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (x < w - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1)
      if (y < h - 1) dist[i] = Math.min(dist[i], dist[(y + 1) * w + x] + 1)
      if (x < w - 1 && y < h - 1) dist[i] = Math.min(dist[i], dist[(y + 1) * w + x + 1] + D)
      if (x > 0 && y < h - 1) dist[i] = Math.min(dist[i], dist[(y + 1) * w + x - 1] + D)
    }
  }

  return dist
}

function hashN(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hashN(ix, iy)
  const b = hashN(ix + 1, iy)
  const c = hashN(ix, iy + 1)
  const d = hashN(ix + 1, iy + 1)
  return a * (1 - sx) * (1 - sy) + b * sx * (1 - sy) + c * (1 - sx) * sy + d * sx * sy
}

function fbmNoise2D(x: number, y: number, octaves: number): number {
  let value = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise(x * freq, y * freq)
    amp *= 0.5
    freq *= 2
  }
  return value
}

/**
 * Строит heightmap на сетке GRID×GRID: бинарная маска суша/вода → distance
 * transform (расстояние до ближайшей воды) → smoothstep + fBm-шум для
 * холмов. Высота плавно поднимается от 0 у береговой линии вглубь суши.
 */
function buildHeightmap(canvas: HTMLCanvasElement, landHeight: number): Heightmap {
  const ctx = canvas.getContext('2d')!
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imgData.data

  // Бинарная маска: определяем для каждой ячейки сетки,
  // является ли большинство пикселей в её области сушей.
  // Это убирает мелкие водные артефакты (реки, пруды, текст на карте).
  const landMask = new Float32Array(GRID * GRID)

  const cellW = canvas.width / GRID
  const cellH = canvas.height / GRID

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const startX = Math.floor(gx * cellW)
      const startY = Math.floor(gy * cellH)
      const endX = Math.min(Math.floor((gx + 1) * cellW), canvas.width)
      const endY = Math.min(Math.floor((gy + 1) * cellH), canvas.height)

      let waterCount = 0
      let totalCount = 0

      // Сэмплируем область ячейки с шагом 2 для скорости
      for (let py = startY; py < endY; py += 2) {
        for (let px = startX; px < endX; px += 2) {
          const idx = (py * canvas.width + px) * 4
          if (isWaterPixel(pixels[idx], pixels[idx + 1], pixels[idx + 2])) {
            waterCount++
          }
          totalCount++
        }
      }

      landMask[gy * GRID + gx] = waterCount / totalCount < 0.5 ? 1 : 0
    }
  }

  // Морфологическое открытие (erosion → dilation): убирает мелкие
  // ложные пятна суши в воде (текст, дороги на тайлах OSM).
  // Затем закрытие (dilation → erosion): заполняет мелкие дыры воды в суше.
  const eroded = morphErode(landMask, GRID, GRID, 2)
  const opened = morphDilate(eroded, GRID, GRID, 2)
  const dilated = morphDilate(opened, GRID, GRID, 2)
  const cleaned = morphErode(dilated, GRID, GRID, 2)

  const dist = distanceTransform(cleaned, GRID, GRID)

  let maxDist = 0
  for (let i = 0; i < GRID * GRID; i++) {
    if (dist[i] > maxDist) maxDist = dist[i]
  }
  if (maxDist < 1) maxDist = 1

  const raw = new Float32Array(GRID * GRID)
  const noiseFreq = 0.07

  for (let i = 0; i < GRID * GRID; i++) {
    if (dist[i] === 0) continue

    const gx = i % GRID
    const gy = Math.floor(i / GRID)

    // Нормализуем расстояние, насыщение при 50% от максимума → плато
    const normDist = Math.min(dist[i] / (maxDist * 0.5), 1)
    const base = normDist * normDist * (3 - 2 * normDist)

    const n = fbmNoise2D(gx * noiseFreq, gy * noiseFreq, 5)
    raw[i] = base * landHeight * (0.5 + n * 0.7)
  }

  let result = blurHeightmap(raw, GRID, GRID, 3)
  result = blurHeightmap(result, GRID, GRID, 2)

  const edgeFade = GRID * 0.12
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const dMin = Math.min(x, GRID - 1 - x, y, GRID - 1 - y)
      if (dMin < edgeFade) {
        const s = dMin / edgeFade
        result[y * GRID + x] *= s * s * (3 - 2 * s)
      }
    }
  }

  return result
}

/**
 * Создаёт текстуру суши: водные области (по heightmap) прозрачны,
 * суша тонирована в цвет рельефа. Определение прозрачности идёт
 * по blurred heightmap, а не по отдельным пикселям — это убирает
 * артефакты от мелких водных объектов на карте.
 */
function makeLandTexture(
  canvas: HTMLCanvasElement,
  heightmap: Heightmap,
  landHeight: number,
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const srcCtx = canvas.getContext('2d')!
  const dstCtx = out.getContext('2d')!
  const imgData = srcCtx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imgData.data

  const threshold = landHeight * 0.03

  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const i = (py * canvas.width + px) * 4

      const fx = (px / canvas.width) * (GRID - 1)
      const fy = (py / canvas.height) * (GRID - 1)
      const h = sampleBilinear(heightmap, GRID, GRID, fx, fy)

      if (h < threshold) {
        pixels[i + 3] = 0
      } else {
        const fade = Math.min(1, (h - threshold) / (landHeight * 0.05))
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        pixels[i] = Math.min(255, Math.floor(r * 0.7 + 40))
        pixels[i + 1] = Math.min(255, Math.floor(g * 0.8 + 30))
        pixels[i + 2] = Math.min(255, Math.floor(b * 0.5 + 20))
        pixels[i + 3] = Math.floor(255 * fade)
      }
    }
  }

  dstCtx.putImageData(imgData, 0, 0)
  return out
}

interface PlaneData {
  texture: THREE.CanvasTexture
  geometry: THREE.PlaneGeometry
  cx: number
  cz: number
}

interface MapTexturePlaneProps {
  projection: LocalProjection
  bounds: SceneBounds
}

export function MapTexturePlane({ projection, bounds }: MapTexturePlaneProps) {
  const [data, setData] = useState<PlaneData | null>(null)

  useEffect(() => {
    let disposed = false

    const halfX = bounds.sizeX / 2
    const halfZ = bounds.sizeZ / 2

    const sw = projection.toGeo({
      x: bounds.centerX - halfX,
      y: -(bounds.centerZ + halfZ),
    })
    const ne = projection.toGeo({
      x: bounds.centerX + halfX,
      y: -(bounds.centerZ - halfZ),
    })

    const zoom = findZoom(sw.lat, sw.lon, ne.lat, ne.lon)
    const txMin = lonToTileX(sw.lon, zoom)
    const txMax = lonToTileX(ne.lon, zoom)
    const tyMin = latToTileY(ne.lat, zoom)
    const tyMax = latToTileY(sw.lat, zoom)

    const tilesW = txMax - txMin + 1
    const tilesH = tyMax - tyMin + 1

    const canvas = document.createElement('canvas')
    canvas.width = tilesW * TILE_SIZE
    canvas.height = tilesH * TILE_SIZE
    const ctx = canvas.getContext('2d')!

    const gridSW = projection.toLocal({
      lat: tileYToLat(tyMax + 1, zoom),
      lon: tileXToLon(txMin, zoom),
    })
    const gridNE = projection.toLocal({
      lat: tileYToLat(tyMin, zoom),
      lon: tileXToLon(txMax + 1, zoom),
    })

    const planeW = gridNE.x - gridSW.x
    const planeD = gridSW.y - gridNE.y
    const cx = (gridSW.x + gridNE.x) / 2
    const cz = -(gridSW.y + gridNE.y) / 2
    const landHeight = bounds.diagonal * 0.025

    let loaded = 0
    const total = tilesW * tilesH

    const onTileReady = () => {
      loaded++
      if (loaded < total || disposed) return

      const heightmap = buildHeightmap(canvas, landHeight)
      const landCanvas = makeLandTexture(canvas, heightmap, landHeight)

      const geo = new THREE.PlaneGeometry(planeW, planeD, GRID - 1, GRID - 1)
      const pos = geo.attributes.position.array as Float32Array

      // Смещаем на 0.05*landHeight вниз — видимый край текстуры
      // (alphaTest=0.4 при threshold=0.03 + fade=0.02) попадает на Z≈0,
      // а меш стоит на Y=-0.15 (уровень воды), так что берег не парит.
      const heightShift = landHeight * 0.05
      for (let i = 0; i < GRID * GRID; i++) {
        pos[i * 3 + 2] = heightmap[i] - heightShift
      }
      geo.attributes.position.needsUpdate = true
      geo.computeVertexNormals()

      const tex = new THREE.CanvasTexture(landCanvas)
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.colorSpace = THREE.SRGBColorSpace
      tex.flipY = false

      setData({ texture: tex, geometry: geo, cx, cz })
    }

    for (let ty = tyMin; ty <= tyMax; ty++) {
      for (let tx = txMin; tx <= txMax; tx++) {
        const s = SUBDOMAINS[(tx + ty) % 3]
        const url = `https://${s}.tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.drawImage(
            img,
            (tx - txMin) * TILE_SIZE,
            (ty - tyMin) * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
          )
          onTileReady()
        }
        img.onerror = onTileReady
        img.src = url
      }
    }

    return () => {
      disposed = true
      data?.texture.dispose()
      data?.geometry.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, bounds])

  if (!data) return null

  return (
    <mesh rotation-x={-Math.PI / 2} position={[data.cx, -0.15, data.cz]}>
      <primitive object={data.geometry} attach="geometry" />
      <meshStandardMaterial
        map={data.texture}
        alphaTest={0.4}
        depthWrite
        roughness={0.85}
        metalness={0}
        side={THREE.DoubleSide}
        stencilWrite
        stencilRef={1}
        stencilFunc={THREE.AlwaysStencilFunc}
        stencilFail={THREE.KeepStencilOp}
        stencilZFail={THREE.KeepStencilOp}
        stencilZPass={THREE.ReplaceStencilOp}
      />
    </mesh>
  )
}
