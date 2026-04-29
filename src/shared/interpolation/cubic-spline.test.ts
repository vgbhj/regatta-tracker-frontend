import { describe, it, expect } from 'vitest';
import { buildCubicSpline, evaluateSpline } from './cubic-spline';

describe('buildCubicSpline / evaluateSpline', () => {
  it('свойство интерполяции: значение в узлах совпадает с y[i]', () => {
    const xs = [0, 1, 2.5, 4, 5.7, 8, 10];
    const ys = xs.map((x) => Math.sin(x));

    const spline = buildCubicSpline(xs, ys);

    for (let i = 0; i < xs.length; i++) {
      expect(evaluateSpline(spline, xs[i])).toBeCloseTo(ys[i], 10);
    }
  });

  it('M[0] и M[n−1] равны нулю (натуральные граничные условия)', () => {
    const xs = [0, 1, 2, 3, 4, 5];
    const ys = [0, 1, 0, -1, 0, 1];

    const spline = buildCubicSpline(xs, ys);

    expect(spline.M[0]).toBe(0);
    expect(spline.M[spline.M.length - 1]).toBe(0);
  });

  it('гладкая функция (sin): RMSE на плотной сетке мала', () => {
    const N = 21;
    const xs = Array.from({ length: N }, (_, i) => (i * 2 * Math.PI) / (N - 1));
    const ys = xs.map((x) => Math.sin(x));

    const spline = buildCubicSpline(xs, ys);

    const M = 1000;
    let sumSq = 0;
    for (let k = 0; k <= M; k++) {
      const x = (k * 2 * Math.PI) / M;
      const err = evaluateSpline(spline, x) - Math.sin(x);
      sumSq += err * err;
    }
    const rmse = Math.sqrt(sumSq / (M + 1));
    expect(rmse).toBeLessThan(1e-3);
  });

  it('линейный случай n = 2: на интервале сплайн совпадает с линией', () => {
    const xs = [0, 10];
    const ys = [3, 7];
    const spline = buildCubicSpline(xs, ys);

    expect(evaluateSpline(spline, 0)).toBeCloseTo(3, 12);
    expect(evaluateSpline(spline, 10)).toBeCloseTo(7, 12);
    expect(evaluateSpline(spline, 5)).toBeCloseTo(5, 12);
    expect(evaluateSpline(spline, 2.5)).toBeCloseTo(4, 12);
  });

  it('сплайн воспроизводит линейную функцию на любом числе узлов', () => {
    // Для y = 2x + 1 точное решение: M ≡ 0, S совпадает с линией.
    const xs = [0, 1, 2, 3, 5, 8];
    const ys = xs.map((x) => 2 * x + 1);
    const spline = buildCubicSpline(xs, ys);

    for (const x of [0.3, 1.7, 4, 6.5]) {
      expect(evaluateSpline(spline, x)).toBeCloseTo(2 * x + 1, 10);
    }
  });

  it('clamp за пределами диапазона: значения краёв', () => {
    const xs = [0, 1, 2];
    const ys = [0, 1, 4];
    const spline = buildCubicSpline(xs, ys);

    expect(evaluateSpline(spline, -5)).toBeCloseTo(
      evaluateSpline(spline, 0),
      10,
    );
    expect(evaluateSpline(spline, 100)).toBeCloseTo(
      evaluateSpline(spline, 2),
      10,
    );
  });

  it('бросает при неубывающих xs', () => {
    expect(() => buildCubicSpline([0, 1, 1, 2], [0, 0, 0, 0])).toThrow();
    expect(() => buildCubicSpline([0, 2, 1], [0, 0, 0])).toThrow();
  });

  it('бросает при < 2 узлах и при разной длине xs/ys', () => {
    expect(() => buildCubicSpline([0], [0])).toThrow();
    expect(() => buildCubicSpline([0, 1], [0])).toThrow();
  });
});
