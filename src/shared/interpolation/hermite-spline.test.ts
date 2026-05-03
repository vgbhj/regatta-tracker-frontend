import { describe, it, expect } from 'vitest';
import { createHermiteInterpolator, estimateTangents } from './hermite-spline';
import type { SplineNode } from './types';

function makeNodes(fn: (t: number) => { x: number; y: number }, tStart: number, tEnd: number, count: number): SplineNode[] {
  const step = (tEnd - tStart) / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const t = tStart + i * step;
    const { x, y } = fn(t);
    return { tMs: t, x, y };
  });
}

describe('createHermiteInterpolator', () => {
  it('interpolates sin(t) with low RMSE', () => {
    const fn = (t: number) => ({ x: t, y: Math.sin(t) });
    const nodes = makeNodes(fn, 0, 2 * Math.PI, 20);
    const interp = createHermiteInterpolator(nodes);

    let sumSqErr = 0;
    const sampleCount = 200;
    const step = (2 * Math.PI) / sampleCount;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i * step;
      const expected = fn(t);
      const actual = interp(t);
      sumSqErr += (actual.x - expected.x) ** 2 + (actual.y - expected.y) ** 2;
    }

    const rmse = Math.sqrt(sumSqErr / (sampleCount + 1));
    expect(rmse).toBeLessThan(0.01);
  });

  it('returns exact node values (interpolation property)', () => {
    const nodes: SplineNode[] = [
      { tMs: 0, x: 1, y: 2 },
      { tMs: 100, x: 5, y: 7 },
      { tMs: 200, x: 3, y: 1 },
      { tMs: 300, x: 8, y: 4 },
      { tMs: 400, x: 2, y: 9 },
    ];
    const interp = createHermiteInterpolator(nodes);

    for (const node of nodes) {
      const result = interp(node.tMs);
      expect(result.x).toBeCloseTo(node.x, 10);
      expect(result.y).toBeCloseTo(node.y, 10);
    }
  });

  it('handles sharp 90° turn: hits corner exactly and bounds overshoot', () => {
    // Два прямых участка под 90°: восток → север, излом в (200, 0).
    // Центральная разность в угловой точке «видит» оба направления, поэтому
    // на соседних сегментах возможен небольшой выброс — это корректно.
    const nodes: SplineNode[] = [
      { tMs: 0, x: 0, y: 0 },
      { tMs: 100, x: 100, y: 0 },
      { tMs: 200, x: 200, y: 0 },
      { tMs: 300, x: 200, y: 100 },
      { tMs: 400, x: 200, y: 200 },
    ];
    const interp = createHermiteInterpolator(nodes);

    const corner = interp(200);
    expect(corner.x).toBeCloseTo(200, 10);
    expect(corner.y).toBeCloseTo(0, 10);

    // На первом прямом участке (движение по x) выброс по y ограничен 10% от масштаба
    const midFirst = interp(150);
    expect(Math.abs(midFirst.y)).toBeLessThan(20);

    // На втором прямом участке (движение по y) выброс по x ограничен аналогично
    const midSecond = interp(350);
    expect(Math.abs(midSecond.x - 200)).toBeLessThan(20);

    // Направление меняется: до поворота x растёт, после поворота y растёт
    const before = interp(100);
    const after = interp(300);
    expect(after.y).toBeGreaterThan(before.y);
    expect(after.x).toBeGreaterThan(before.x - 10);
  });

  it('clamps to boundary values for out-of-range t', () => {
    const nodes: SplineNode[] = [
      { tMs: 100, x: 1, y: 2 },
      { tMs: 200, x: 3, y: 4 },
    ];
    const interp = createHermiteInterpolator(nodes);

    const before = interp(0);
    expect(before.x).toBeCloseTo(1, 10);
    expect(before.y).toBeCloseTo(2, 10);

    const after = interp(999);
    expect(after.x).toBeCloseTo(3, 10);
    expect(after.y).toBeCloseTo(4, 10);
  });

  it('throws on fewer than 2 nodes', () => {
    expect(() => createHermiteInterpolator([{ tMs: 0, x: 0, y: 0 }])).toThrow();
    expect(() => createHermiteInterpolator([])).toThrow();
  });
});

describe('estimateTangents', () => {
  it('computes central differences for interior nodes', () => {
    const nodes: SplineNode[] = [
      { tMs: 0, x: 0, y: 0 },
      { tMs: 100, x: 10, y: 20 },
      { tMs: 200, x: 40, y: 60 },
    ];
    const { dx, dy } = estimateTangents(nodes);

    const expectedDx1 = (nodes[2].x - nodes[0].x) / (nodes[2].tMs - nodes[0].tMs);
    const expectedDy1 = (nodes[2].y - nodes[0].y) / (nodes[2].tMs - nodes[0].tMs);

    expect(dx[1]).toBeCloseTo(expectedDx1, 10);
    expect(dy[1]).toBeCloseTo(expectedDy1, 10);
  });

  it('computes one-sided differences for boundary nodes', () => {
    const nodes: SplineNode[] = [
      { tMs: 0, x: 0, y: 0 },
      { tMs: 100, x: 10, y: 20 },
      { tMs: 200, x: 40, y: 60 },
    ];
    const { dx, dy } = estimateTangents(nodes);

    const expectedDx0 = (nodes[1].x - nodes[0].x) / (nodes[1].tMs - nodes[0].tMs);
    const expectedDy0 = (nodes[1].y - nodes[0].y) / (nodes[1].tMs - nodes[0].tMs);
    expect(dx[0]).toBeCloseTo(expectedDx0, 10);
    expect(dy[0]).toBeCloseTo(expectedDy0, 10);

    const n = nodes.length;
    const expectedDxN = (nodes[n - 1].x - nodes[n - 2].x) / (nodes[n - 1].tMs - nodes[n - 2].tMs);
    const expectedDyN = (nodes[n - 1].y - nodes[n - 2].y) / (nodes[n - 1].tMs - nodes[n - 2].tMs);
    expect(dx[n - 1]).toBeCloseTo(expectedDxN, 10);
    expect(dy[n - 1]).toBeCloseTo(expectedDyN, 10);
  });

  it('handles non-uniform time steps correctly', () => {
    const nodes: SplineNode[] = [
      { tMs: 0, x: 0, y: 0 },
      { tMs: 50, x: 5, y: 10 },
      { tMs: 200, x: 40, y: 60 },
      { tMs: 500, x: 100, y: 200 },
    ];
    const { dx, dy } = estimateTangents(nodes);

    const expectedDx1 = (nodes[2].x - nodes[0].x) / (nodes[2].tMs - nodes[0].tMs);
    const expectedDy1 = (nodes[2].y - nodes[0].y) / (nodes[2].tMs - nodes[0].tMs);
    expect(dx[1]).toBeCloseTo(expectedDx1, 10);
    expect(dy[1]).toBeCloseTo(expectedDy1, 10);

    const expectedDx2 = (nodes[3].x - nodes[1].x) / (nodes[3].tMs - nodes[1].tMs);
    const expectedDy2 = (nodes[3].y - nodes[1].y) / (nodes[3].tMs - nodes[1].tMs);
    expect(dx[2]).toBeCloseTo(expectedDx2, 10);
    expect(dy[2]).toBeCloseTo(expectedDy2, 10);
  });
});
