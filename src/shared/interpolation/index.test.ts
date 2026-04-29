import { describe, it, expect } from 'vitest';
import { LocalProjection } from '@/shared/geo';
import type { TrackPoint } from '@/shared/types/domain';
import { interpolateTrack, buildTrackInterpolator } from './index';

const ORIGIN = { lat: 55.75, lon: 37.62 };

/** Создать TrackPoint из локальных (x, y) метров от ORIGIN. */
const fromLocal = (tMs: number, x: number, y: number): TrackPoint => {
  const projection = new LocalProjection(ORIGIN);
  const { lat, lon } = projection.toGeo({ x, y });
  return { tMs, lat, lon };
};

describe('interpolateTrack', () => {
  it('точки на прямой остаются на прямой; tMs идёт с шагом 1000/targetHz', () => {
    const points: TrackPoint[] = [
      fromLocal(0, 0, 0),
      fromLocal(1000, 10, 0),
      fromLocal(2000, 20, 0),
      fromLocal(3000, 30, 0),
    ];

    const out = interpolateTrack(points, { origin: ORIGIN, targetHz: 10 });

    // 3000 мс при шаге 100 мс → 31 точка (включая концы)
    expect(out.length).toBe(31);
    expect(out[0].tMs).toBe(0);
    expect(out[out.length - 1].tMs).toBe(3000);

    const projection = new LocalProjection(ORIGIN);
    for (const p of out) {
      const { x, y } = projection.toLocal({ lat: p.lat, lon: p.lon });
      const expectedX = (p.tMs / 1000) * 10;
      expect(x).toBeCloseTo(expectedX, 6);
      expect(y).toBeCloseTo(0, 6);
    }
  });

  it('первая и последняя точки выхода совпадают со входными по lat/lon', () => {
    const points: TrackPoint[] = [
      fromLocal(0, 5, -3),
      fromLocal(1500, 12, 2),
      fromLocal(3200, 4, 8),
    ];
    const out = interpolateTrack(points, { origin: ORIGIN, targetHz: 5 });

    expect(out[0].lat).toBeCloseTo(points[0].lat, 9);
    expect(out[0].lon).toBeCloseTo(points[0].lon, 9);
    expect(out[out.length - 1].lat).toBeCloseTo(points[points.length - 1].lat, 9);
    expect(out[out.length - 1].lon).toBeCloseTo(points[points.length - 1].lon, 9);
    expect(out[out.length - 1].tMs).toBe(3200);
  });

  it('шаг сетки совпадает с tEnd → терминальная точка не дублируется', () => {
    const points: TrackPoint[] = [
      fromLocal(0, 0, 0),
      fromLocal(1000, 1, 1),
      fromLocal(2000, 2, 0),
    ];
    const out = interpolateTrack(points, { origin: ORIGIN, targetHz: 10 });
    // Шаг 100 мс, диапазон 2000 → 21 точка, без хвоста
    expect(out.length).toBe(21);
    // Все tMs уникальны и упорядочены
    for (let i = 1; i < out.length; i++) {
      expect(out[i].tMs).toBeGreaterThan(out[i - 1].tMs);
    }
  });

  it('бросает при targetHz ≤ 0', () => {
    const points: TrackPoint[] = [fromLocal(0, 0, 0), fromLocal(1000, 1, 0)];
    expect(() =>
      interpolateTrack(points, { origin: ORIGIN, targetHz: 0 }),
    ).toThrow();
    expect(() =>
      interpolateTrack(points, { origin: ORIGIN, targetHz: -5 }),
    ).toThrow();
  });

  it('возвращает копию входа при < 2 точках', () => {
    const single: TrackPoint[] = [{ tMs: 0, lat: 1, lon: 2 }];
    const out = interpolateTrack(single, { origin: ORIGIN, targetHz: 10 });
    expect(out).toEqual(single);
    expect(out).not.toBe(single);
    expect(interpolateTrack([], { origin: ORIGIN, targetHz: 10 })).toEqual([]);
  });
});

describe('buildTrackInterpolator', () => {
  it('возвращает локальные (x, y) и точно попадает в узлы по времени', () => {
    const points: TrackPoint[] = [
      fromLocal(0, 0, 0),
      fromLocal(1000, 10, 5),
      fromLocal(2000, 20, 0),
    ];
    const interp = buildTrackInterpolator(points, { origin: ORIGIN });

    expect(interp(0).x).toBeCloseTo(0, 6);
    expect(interp(0).y).toBeCloseTo(0, 6);
    expect(interp(1000).x).toBeCloseTo(10, 6);
    expect(interp(1000).y).toBeCloseTo(5, 6);
    expect(interp(2000).x).toBeCloseTo(20, 6);
    expect(interp(2000).y).toBeCloseTo(0, 6);
  });
});
