/**
 * Публичный API модуля интерполяции трека.
 *
 * Сценарий:
 *   1. Спроецировать GPS-точки в локальную касательную плоскость (метры).
 *   2. По времени t построить два независимых натуральных кубических сплайна:
 *      один по координате x, другой по y. Раздельная параметризация по t
 *      корректно обрабатывает самопересекающиеся траектории (галсы навстречу).
 *   3. Сгенерировать плотную равномерную выборку с шагом 1000 / targetHz мс
 *      на полном диапазоне [t0, t_{n−1}].
 *   4. Вернуть точки обратно в географические координаты.
 *
 * speed/heading на интерполированном треке здесь не считаем — это отдельный
 * шаг постобработки (модуль производных трека), его форма зависит от того,
 * как мы их используем в плеере и графиках.
 */

import { LocalProjection } from '@/shared/geo';
import type { TrackPoint } from '@/shared/types/domain';
import { buildCubicSpline, evaluateSpline } from './cubic-spline';
import type { InterpolationOptions, Interpolator } from './types';

export { buildCubicSpline, evaluateSpline } from './cubic-spline';
export { solveTridiagonal } from './tridiagonal';
export type { InterpolationOptions, Interpolator } from './types';
export type { Spline } from './cubic-spline';

export function interpolateTrack(
  points: TrackPoint[],
  opts: InterpolationOptions,
): TrackPoint[] {
  if (opts.targetHz <= 0 || !Number.isFinite(opts.targetHz)) {
    throw new Error('interpolateTrack: targetHz должен быть положительным');
  }

  if (points.length < 2) {
    return points.map((p) => ({ ...p }));
  }

  const projection = new LocalProjection(opts.origin);

  const n = points.length;
  const ts = new Float64Array(n);
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const local = projection.toLocal({ lat: p.lat, lon: p.lon });
    ts[i] = p.tMs;
    xs[i] = local.x;
    ys[i] = local.y;

    if (i > 0 && !(ts[i] > ts[i - 1])) {
      throw new Error('interpolateTrack: tMs должен строго возрастать');
    }
  }

  const splineX = buildCubicSpline(ts, xs);
  const splineY = buildCubicSpline(ts, ys);

  const stepMs = 1000 / opts.targetHz;
  const tStart = ts[0];
  const tEnd = ts[n - 1];

  // ceil гарантирует, что хвост [tEnd − stepMs, tEnd] не теряется: последний
  // узел включается явным шагом ниже.
  const stepsCount = Math.floor((tEnd - tStart) / stepMs);

  const out: TrackPoint[] = [];
  out.length = stepsCount + 2; // +1 на нулевой шаг, +1 на возможный хвостовой узел
  let writeIdx = 0;

  for (let k = 0; k <= stepsCount; k++) {
    const t = tStart + k * stepMs;
    const x = evaluateSpline(splineX, t);
    const y = evaluateSpline(splineY, t);
    const geo = projection.toGeo({ x, y });
    out[writeIdx++] = { tMs: t, lat: geo.lat, lon: geo.lon };
  }

  // Если последний шаг сетки не попал точно в tEnd — добавляем терминальный узел,
  // чтобы выходная траектория покрывала весь диапазон входа.
  const lastT = tStart + stepsCount * stepMs;
  if (lastT < tEnd) {
    const x = evaluateSpline(splineX, tEnd);
    const y = evaluateSpline(splineY, tEnd);
    const geo = projection.toGeo({ x, y });
    out[writeIdx++] = { tMs: tEnd, lat: geo.lat, lon: geo.lon };
  }

  out.length = writeIdx;
  return out;
}

/**
 * Удобный фабричный хелпер для случаев, когда нужна функция-интерполятор
 * (без генерации плотной выборки) — например, для on-demand вычислений в
 * плеере.
 */
export function buildTrackInterpolator(
  points: TrackPoint[],
  opts: Pick<InterpolationOptions, 'origin'>,
): Interpolator {
  if (points.length < 2) {
    throw new Error('buildTrackInterpolator: требуется минимум 2 точки');
  }
  const projection = new LocalProjection(opts.origin);

  const n = points.length;
  const ts = new Float64Array(n);
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const local = projection.toLocal({ lat: p.lat, lon: p.lon });
    ts[i] = p.tMs;
    xs[i] = local.x;
    ys[i] = local.y;
  }
  const splineX = buildCubicSpline(ts, xs);
  const splineY = buildCubicSpline(ts, ys);

  return (tMs: number) => ({
    x: evaluateSpline(splineX, tMs),
    y: evaluateSpline(splineY, tMs),
  });
}
