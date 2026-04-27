/**
 * Начальный азимут (initial bearing, forward azimuth) от точки a к точке b.
 *
 * Возвращает угол в градусах в диапазоне [0, 360), отсчитываемый от направления
 * на север по часовой стрелке: 0° — север, 90° — восток, 180° — юг, 270° — запад.
 *
 * Это именно НАЧАЛЬНЫЙ азимут на дуге большого круга: при движении вдоль геодезической
 * линии азимут меняется (кроме движения строго вдоль меридиана или экватора).
 *
 * Формула:
 *   θ = atan2( sin(Δλ)·cos(φ2),
 *              cos(φ1)·sin(φ2) − sin(φ1)·cos(φ2)·cos(Δλ) )
 *   bearing = (θ_град + 360) mod 360
 */
import type { LatLon } from './types';

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export function bearing(a: LatLon, b: LatLon): number {
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dLambda = toRad(b.lon - a.lon);

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}
