/**
 * Локальная тангенциальная проекция (equirectangular) относительно опорной точки.
 *
 * Зачем: для рендера 2D/3D-сцены регаты удобно работать в декартовой системе
 * координат с метрами по осям, а не в геодезических широте/долготе. На масштабах
 * единиц–десятков километров достаточно простой касательной (равнопромежуточной)
 * проекции относительно центра гонки: ошибка по сравнению с честной геодезической
 * проекцией составляет доли процента и пренебрежима относительно шума GPS.
 *
 * Преимущества именно такого выбора:
 *   - не требует внешней библиотеки (proj4 и т.п.);
 *   - формулы тривиально обратимы;
 *   - метровый масштаб одинаков по обоим осям, что упрощает физику в 3D.
 *
 * Формулы (φ0, λ0 — широта/долгота опорной точки в радианах):
 *   x = R · (λ − λ0) · cos(φ0)
 *   y = R · (φ − φ0)
 * Обратно:
 *   φ = φ0 + y / R
 *   λ = λ0 + x / (R · cos(φ0))
 *
 * Ось x направлена на восток, ось y — на север. Метры от опорной точки.
 */
import { EARTH_RADIUS_M, type LatLon } from './types';

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export interface LocalPoint {
  x: number;
  y: number;
}

export class LocalProjection {
  private readonly phi0: number;
  private readonly lambda0: number;
  private readonly cosPhi0: number;

  constructor(origin: LatLon) {
    this.phi0 = toRad(origin.lat);
    this.lambda0 = toRad(origin.lon);
    this.cosPhi0 = Math.cos(this.phi0);
  }

  toLocal(p: LatLon): LocalPoint {
    const phi = toRad(p.lat);
    const lambda = toRad(p.lon);
    return {
      x: EARTH_RADIUS_M * (lambda - this.lambda0) * this.cosPhi0,
      y: EARTH_RADIUS_M * (phi - this.phi0),
    };
  }

  toGeo(p: LocalPoint): LatLon {
    const phi = this.phi0 + p.y / EARTH_RADIUS_M;
    const lambda = this.lambda0 + p.x / (EARTH_RADIUS_M * this.cosPhi0);
    return { lat: toDeg(phi), lon: toDeg(lambda) };
  }
}
