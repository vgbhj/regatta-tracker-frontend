/**
 * Расстояние по большому кругу между двумя точками на сфере (формула гаверсинуса).
 *
 * Сфера, а не WGS-84-эллипсоид, выбрана сознательно: в масштабах регаты
 * (единицы–десятки километров) ошибка от пренебрежения сжатием Земли — порядка
 * 0.3% и заведомо меньше шума GPS-приёмников мобильных устройств. Зато формула
 * численно устойчива при малых расстояниях, в отличие от прямой формулы
 * сферического косинуса.
 *
 * Формула:
 *   a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
 *   c = 2·atan2(√a, √(1 − a))
 *   d = R · c
 * где φ — широта в радианах, λ — долгота в радианах, R — радиус Земли.
 */
import { EARTH_RADIUS_M, type LatLon } from './types';

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversineDistance(a: LatLon, b: LatLon): number {
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dPhi = toRad(b.lat - a.lat);
  const dLambda = toRad(b.lon - a.lon);

  const sinDPhi = Math.sin(dPhi / 2);
  const sinDLambda = Math.sin(dLambda / 2);

  const h =
    sinDPhi * sinDPhi + Math.cos(phi1) * Math.cos(phi2) * sinDLambda * sinDLambda;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_M * c;
}
