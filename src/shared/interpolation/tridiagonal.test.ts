import { describe, it, expect } from 'vitest';
import { solveTridiagonal } from './tridiagonal';

const f64 = (xs: number[]): Float64Array => Float64Array.from(xs);

describe('solveTridiagonal', () => {
  it('единичная матрица: x === d', () => {
    const a = f64([0, 0, 0, 0]);
    const b = f64([1, 1, 1, 1]);
    const c = f64([0, 0, 0, 0]);
    const d = f64([5, -3, 7, 11]);
    const x = solveTridiagonal(a, b, c, d);
    expect(Array.from(x)).toEqual([5, -3, 7, 11]);
  });

  it('тривиальный случай n = 1: x[0] = d[0] / b[0]', () => {
    const x = solveTridiagonal(f64([0]), f64([4]), f64([0]), f64([12]));
    expect(x[0]).toBeCloseTo(3, 12);
  });

  it('4×4 система с известным решением [1, 2, 3, 4]', () => {
    // b = 2 на главной диагонали, a = c = 1 на соседних — диагонально доминирующая
    const a = f64([0, 1, 1, 1]);
    const b = f64([2, 2, 2, 2]);
    const c = f64([1, 1, 1, 0]);
    // d вычислено по A · x: d = [4, 8, 12, 11]
    const d = f64([4, 8, 12, 11]);

    const x = solveTridiagonal(a, b, c, d);

    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(2, 12);
    expect(x[2]).toBeCloseTo(3, 12);
    expect(x[3]).toBeCloseTo(4, 12);
  });

  it('отрицательные значения и неоднородные диагонали', () => {
    // x = [-1, 2, -3]
    // b = [3, 4, 5], a = [_, -1, 2], c = [2, -1, _]
    // d[0] = 3·(-1) + 2·2     = 1
    // d[1] = -1·(-1) + 4·2 + (-1)·(-3) = 12
    // d[2] = 2·2 + 5·(-3)     = -11
    const a = f64([0, -1, 2]);
    const b = f64([3, 4, 5]);
    const c = f64([2, -1, 0]);
    const d = f64([1, 12, -11]);

    const x = solveTridiagonal(a, b, c, d);

    expect(x[0]).toBeCloseTo(-1, 12);
    expect(x[1]).toBeCloseTo(2, 12);
    expect(x[2]).toBeCloseTo(-3, 12);
  });

  it('бросает при несовпадении длин входных массивов', () => {
    expect(() =>
      solveTridiagonal(f64([0, 1]), f64([1]), f64([0]), f64([1])),
    ).toThrow();
  });

  it('возвращает пустой массив для n = 0', () => {
    const x = solveTridiagonal(f64([]), f64([]), f64([]), f64([]));
    expect(x.length).toBe(0);
  });
});
