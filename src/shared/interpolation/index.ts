import type { TrackPoint } from '@/shared/types/domain';
import { haversineDistance, bearing, type LocalProjection } from '@/shared/geo';
import { createHermiteInterpolator } from './hermite-spline';
import type { InterpolationOptions } from './types';

export type { Interpolator, InterpolationOptions, SplineNode } from './types';
export { createHermiteInterpolator } from './hermite-spline';

export function interpolateTrack(
  points: TrackPoint[],
  opts: InterpolationOptions,
  projection: LocalProjection,
): TrackPoint[] {
  if (points.length < 2) return [...points];

  const nodes = points.map((p) => {
    const local = projection.toLocal(p);
    return { tMs: p.tMs, x: local.x, y: local.y };
  });

  const interpolator = createHermiteInterpolator(nodes);

  const tStart = points[0].tMs;
  const tEnd = points[points.length - 1].tMs;
  const stepMs = 1000 / opts.targetHz;

  const result: TrackPoint[] = [];

  for (let t = tStart; t <= tEnd; t += stepMs) {
    const { x, y } = interpolator(t);
    const geo = projection.toGeo({ x, y });
    result.push({ tMs: t, lat: geo.lat, lon: geo.lon });
  }

  if (result.length > 0 && result[result.length - 1].tMs < tEnd) {
    const { x, y } = interpolator(tEnd);
    const geo = projection.toGeo({ x, y });
    result.push({ tMs: tEnd, lat: geo.lat, lon: geo.lon });
  }

  for (let i = 0; i < result.length; i++) {
    if (i < result.length - 1) {
      const dt = (result[i + 1].tMs - result[i].tMs) / 1000;
      result[i].speed = dt > 0 ? haversineDistance(result[i], result[i + 1]) / dt : 0;
      result[i].heading = bearing(result[i], result[i + 1]);
    } else {
      result[i].speed = result[i - 1].speed;
      result[i].heading = result[i - 1].heading;
    }
  }

  return result;
}
