import { describe, it, expect } from 'vitest';
import { LocalProjection } from './local-projection';
import { haversineDistance } from './haversine';

describe('LocalProjection', () => {
  const origin = { lat: 59.9343, lon: 30.3351 };
  const proj = new LocalProjection(origin);

  it('опорная точка проецируется в (0, 0)', () => {
    const { x, y } = proj.toLocal(origin);
    expect(x).toBeCloseTo(0, 9);
    expect(y).toBeCloseTo(0, 9);
  });

  it('toGeo(toLocal(p)) ≈ p (round-trip)', () => {
    const points = [
      { lat: 59.9, lon: 30.3 },
      { lat: 59.95, lon: 30.4 },
      { lat: 60.0, lon: 30.2 },
      origin,
    ];
    for (const p of points) {
      const back = proj.toGeo(proj.toLocal(p));
      expect(back.lat).toBeCloseTo(p.lat, 9);
      expect(back.lon).toBeCloseTo(p.lon, 9);
    }
  });

  it('toLocal(toGeo(q)) ≈ q (обратный round-trip)', () => {
    const qs = [
      { x: 0, y: 0 },
      { x: 1000, y: 500 },
      { x: -2500, y: 7500 },
    ];
    for (const q of qs) {
      const back = proj.toLocal(proj.toGeo(q));
      expect(back.x).toBeCloseTo(q.x, 6);
      expect(back.y).toBeCloseTo(q.y, 6);
    }
  });

  it('ось x направлена на восток, y — на север', () => {
    const east = proj.toLocal({ lat: origin.lat, lon: origin.lon + 0.01 });
    const north = proj.toLocal({ lat: origin.lat + 0.01, lon: origin.lon });
    expect(east.x).toBeGreaterThan(0);
    expect(east.y).toBeCloseTo(0, 6);
    expect(north.y).toBeGreaterThan(0);
    expect(north.x).toBeCloseTo(0, 6);
  });

  it('евклидово расстояние в локальных координатах ≈ haversine на масштабах регаты', () => {
    // Точка в ~5 км от опорной — типичный масштаб дистанции регаты.
    const p = { lat: origin.lat + 0.03, lon: origin.lon + 0.05 };
    const local = proj.toLocal(p);
    const localDist = Math.hypot(local.x, local.y);
    const trueDist = haversineDistance(origin, p);
    // На таком масштабе расхождение должно быть < 0.1%.
    expect(Math.abs(localDist - trueDist) / trueDist).toBeLessThan(1e-3);
  });
});
