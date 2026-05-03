import type { TrackPoint } from '@/shared/types';

/**
 * Бинарный поиск индекса последней точки с tMs ≤ targetMs.
 * O(log n) — вызывается каждый кадр вместо пересчёта Hermite-интерполяции.
 */
export function findIndexAtTime(
  points: TrackPoint[],
  targetMs: number,
): number {
  if (points.length === 0) return -1;
  if (targetMs <= points[0].tMs) return 0;
  if (targetMs >= points[points.length - 1].tMs) return points.length - 1;

  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (points[mid].tMs <= targetMs) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}
