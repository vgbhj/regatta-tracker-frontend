/**
 * Натуральный кубический сплайн (свободные концы M[0] = M[n−1] = 0).
 *
 * Обоснование выбора метода — глава 3 ВКР. Кратко:
 *
 *   - Линейная интерполяция между GPS-фиксами даёт C⁰-кривую: на каждом узле
 *     скорость и курс терпят разрыв, что в плеере проявляется как «ступеньки»
 *     движения яхты, а в графике скорости — как пилообразный шум. Для разбора
 *     манёвров (поворот оверштаг, обогрев знака) такая кривая непригодна.
 *
 *   - Motion-aware методы (Catmull-Rom с физическими ограничениями, фильтры
 *     Калмана с моделью динамики яхты, B-сплайны с регуляризацией) требуют
 *     либо параметров модели, либо дополнительных каналов (IMU), либо
 *     эмпирических констант. На разреженных данных (1 Гц) выигрыш по RMSE
 *     против простого сплайна оказывается в пределах шума GPS, при этом
 *     резко падает объяснимость и воспроизводимость результата.
 *
 *   - Натуральный кубический сплайн даёт C²-непрерывность (нет изломов ни в
 *     скорости, ни в её производной), имеет замкнутую формулу, единственное
 *     решение через диагонально доминирующую трёхдиагональную СЛАУ и
 *     стабильно строится за O(n) методом прогонки. Для гонки 60 мин при 1 Гц
 *     это ~3600 узлов — сборка занимает миллисекунды.
 *
 * Условия свободных концов M[0] = M[n−1] = 0 минимизируют интегральную кривизну
 * ∫(S″)² и не требуют знаний о производной на границе (которой у нас нет).
 *
 * Формулы. Пусть h_i = x_{i+1} − x_i, M_i = S″(x_i). Из условий
 * непрерывности первой производной в узлах получается СЛАУ на M_1..M_{n−2}:
 *
 *   h_{i−1}·M_{i−1} + 2·(h_{i−1} + h_i)·M_i + h_i·M_{i+1}
 *     = 6·((y_{i+1} − y_i)/h_i − (y_i − y_{i−1})/h_{i−1}),    i = 1..n−2
 *
 * На интервале [x_i, x_{i+1}] значение сплайна:
 *
 *   S(x) = M_i · (x_{i+1} − x)³ / (6·h_i)
 *        + M_{i+1} · (x − x_i)³  / (6·h_i)
 *        + (y_i / h_i     − M_i · h_i / 6) · (x_{i+1} − x)
 *        + (y_{i+1} / h_i − M_{i+1} · h_i / 6) · (x − x_i)
 */

import { solveTridiagonal } from './tridiagonal';

export interface Spline {
  readonly xs: Float64Array;
  readonly ys: Float64Array;
  /** Вторые производные сплайна в узлах. M[0] = M[n−1] = 0. */
  readonly M: Float64Array;
}

/**
 * Строит натуральный кубический сплайн по узлам (xs, ys).
 *
 * Требования: xs строго возрастают, xs.length === ys.length, length ≥ 2.
 * При length === 2 вырождается в линейную интерполяцию (M = [0, 0]).
 */
export function buildCubicSpline(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
): Spline {
  const n = xs.length;
  if (n !== ys.length) {
    throw new Error('buildCubicSpline: xs.length !== ys.length');
  }
  if (n < 2) {
    throw new Error('buildCubicSpline: требуется минимум 2 узла');
  }

  const xsCopy = Float64Array.from(xs as ArrayLike<number>);
  const ysCopy = Float64Array.from(ys as ArrayLike<number>);

  for (let i = 1; i < n; i++) {
    if (!(xsCopy[i] > xsCopy[i - 1])) {
      throw new Error('buildCubicSpline: xs должен строго возрастать');
    }
  }

  const M = new Float64Array(n);
  if (n === 2) {
    return { xs: xsCopy, ys: ysCopy, M };
  }

  // Внутренних уравнений: n − 2 (по числу M_1..M_{n−2}). Граничные M_0, M_{n−1}
  // зафиксированы нулями и переносятся в правую часть как нулевые слагаемые.
  const m = n - 2;
  const a = new Float64Array(m);
  const b = new Float64Array(m);
  const c = new Float64Array(m);
  const d = new Float64Array(m);

  for (let i = 0; i < m; i++) {
    const k = i + 1; // индекс узла, для которого пишем уравнение: 1..n−2
    const hPrev = xsCopy[k] - xsCopy[k - 1];
    const hNext = xsCopy[k + 1] - xsCopy[k];

    a[i] = hPrev;
    b[i] = 2 * (hPrev + hNext);
    c[i] = hNext;
    d[i] =
      6 *
      ((ysCopy[k + 1] - ysCopy[k]) / hNext -
        (ysCopy[k] - ysCopy[k - 1]) / hPrev);
  }

  const Mi = solveTridiagonal(a, b, c, d);
  for (let i = 0; i < m; i++) {
    M[i + 1] = Mi[i];
  }

  return { xs: xsCopy, ys: ysCopy, M };
}

/**
 * Возвращает значение сплайна в точке x.
 *
 * Поиск интервала — бинарный (O(log n)). Для x вне диапазона возвращается
 * значение в ближайшем граничном узле (clamp по x): плеер не должен запрашивать
 * точки за пределами трека, но фиксированное значение на концах надёжнее, чем
 * NaN или экстраполяция кубическим многочленом, которая на больших отступах
 * расходится.
 */
export function evaluateSpline(spline: Spline, x: number): number {
  const { xs, ys } = spline;
  const n = xs.length;

  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];

  // Бинарный поиск интервала i: xs[i] ≤ x < xs[i+1].
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  return interpolateOnInterval(spline, lo, x);
}

function interpolateOnInterval(spline: Spline, i: number, x: number): number {
  const { xs, ys, M } = spline;
  const xi = xs[i];
  const xi1 = xs[i + 1];
  const yi = ys[i];
  const yi1 = ys[i + 1];
  const Mi = M[i];
  const Mi1 = M[i + 1];
  const h = xi1 - xi;

  const A = xi1 - x;
  const B = x - xi;

  return (
    (Mi * A * A * A) / (6 * h) +
    (Mi1 * B * B * B) / (6 * h) +
    (yi / h - (Mi * h) / 6) * A +
    (yi1 / h - (Mi1 * h) / 6) * B
  );
}
