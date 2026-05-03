/**
 * Парсер GPX → доменные TrackPoint[].
 *
 * Выбран DOMParser (браузерный API) — внешние XML-библиотеки не нужны.
 * Парсер выполняет два прохода:
 *   1) Собирает все таймштампы, чтобы определить raceStartMs (наименьший)
 *      и raceDurationMs (разность крайних).
 *   2) Конвертирует абсолютные ISO-времена в tMs (мс от старта гонки),
 *      вычисляет speed (м/с) и heading (°) по соседним точкам через
 *      Haversine и bearing из geo-модуля.
 *
 * Один <trk> = один яхтенный трек. Имя яхты берётся из <trk><name>.
 */
import type { TrackPoint } from '@/shared/types';
import { haversineDistance, bearing } from '@/shared/geo';

export interface GpxTrack {
  name: string;
  points: TrackPoint[];
}

export interface GpxParseResult {
  raceName: string;
  raceStartMs: number;
  raceDurationMs: number;
  tracks: GpxTrack[];
}

interface RawPoint {
  lat: number;
  lon: number;
  timeMs: number;
}

function parseTrackPoints(trk: Element): RawPoint[] {
  const points: RawPoint[] = [];

  for (const trkpt of trk.querySelectorAll('trkpt')) {
    const latAttr = trkpt.getAttribute('lat');
    const lonAttr = trkpt.getAttribute('lon');
    if (latAttr == null || lonAttr == null) continue;

    const lat = Number(latAttr);
    const lon = Number(lonAttr);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const timeEl = trkpt.querySelector('time');
    if (!timeEl?.textContent) continue;

    const timeMs = Date.parse(timeEl.textContent);
    if (!Number.isFinite(timeMs)) continue;

    points.push({ lat, lon, timeMs });
  }

  return points;
}

function computeTrackPoints(raw: RawPoint[], raceStartMs: number): TrackPoint[] {
  return raw.map((pt, i) => {
    const tp: TrackPoint = {
      tMs: pt.timeMs - raceStartMs,
      lat: pt.lat,
      lon: pt.lon,
    };

    if (i > 0) {
      const prev = raw[i - 1];
      const dtSec = (pt.timeMs - prev.timeMs) / 1000;
      if (dtSec > 0) {
        const dist = haversineDistance(prev, pt);
        tp.speed = dist / dtSec;
        tp.heading = bearing(prev, pt);
      }
    }

    return tp;
  });
}

export function parseGpx(gpxText: string): GpxParseResult {
  const doc = new DOMParser().parseFromString(gpxText, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('GPX: невалидный XML');
  }

  const raceName =
    doc.querySelector('metadata > name')?.textContent ?? 'Без названия';

  const trkElements = doc.querySelectorAll('trk');
  if (trkElements.length === 0) {
    throw new Error('GPX: не найдено ни одного трека (<trk>)');
  }

  const rawTracks: { name: string; raw: RawPoint[] }[] = [];
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const trk of trkElements) {
    const name = trk.querySelector('name')?.textContent ?? 'Яхта';
    const raw = parseTrackPoints(trk);

    for (const pt of raw) {
      if (pt.timeMs < minTime) minTime = pt.timeMs;
      if (pt.timeMs > maxTime) maxTime = pt.timeMs;
    }

    rawTracks.push({ name, raw });
  }

  const raceStartMs = Number.isFinite(minTime) ? minTime : 0;
  const raceDurationMs =
    Number.isFinite(minTime) && Number.isFinite(maxTime)
      ? maxTime - minTime
      : 0;

  const tracks: GpxTrack[] = rawTracks.map(({ name, raw }) => ({
    name,
    points: computeTrackPoints(raw, raceStartMs),
  }));

  return { raceName, raceStartMs, raceDurationMs, tracks };
}
