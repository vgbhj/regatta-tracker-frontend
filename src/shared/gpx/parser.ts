/**
 * Парсер GPX → нормализованные треки в доменной модели приложения.
 *
 * Why this design:
 *
 * 1) Нативный браузерный `DOMParser`. GPX — это XML, в браузере для XML есть
 *    штатный парсер с нулевым весом. Использовать `fast-xml-parser` /
 *    `xmldom` смысла нет: не приносят функциональности, увеличивают бандл,
 *    стек проекта зафиксирован (CLAUDE.md). В тестах подключаем `happy-dom`
 *    как `vitest environment`, рантайм-зависимостей не появляется.
 *
 * 2) Парсер только парсит. yachtId из GPX извлечь невозможно (нет такого
 *    поля в стандарте), и контракт бэкенда на этот счёт неизвестен. Поэтому
 *    `yachtId` не возвращается; сопоставление трека с доменной яхтой —
 *    обязанность feature-слоя (например, по `yachtName`).
 *
 * 3) Очистка по схеме «одна последняя принятая точка». Дубликаты по времени
 *    и нарушения монотонности отбрасываются. Скорость считается между
 *    предыдущей принятой и кандидатом; точки со скоростью > 30 м/с (с
 *    запасом для парусных классов, реальный максимум на спортивных швертботах
 *    редко выходит за 12–15 м/с, на фойлерах до ~25) считаются GPS-выбросами
 *    и отбрасываются. Преимущество схемы: одиночный «прыжок» координаты не
 *    каскадно ломает весь хвост сегмента — последняя принятая точка не
 *    смещается на выброс, и следующий нормальный отсчёт принимается как ни в
 *    чём не бывало.
 *
 * 4) Сегменты (`<trkseg>`) одного `<trk>` склеиваются в одну
 *    последовательность. Возможный «пропуск» по времени между сегментами —
 *    нормальное явление (потеря фикса GPS) и должен корректно обрабатываться
 *    интерполятором на следующем шаге пайплайна.
 *
 * 5) `tMs = unixMs - raceStartMs`. Преобразование в модельное время
 *    выполняется ровно один раз — здесь, в парсере. Дальше по системе
 *    времена сравниваются и интерполируются как обычные числа без часовых
 *    поясов и календаря.
 */
import type { TrackPoint } from '@/shared/types';
import { haversineDistance, bearing } from '@/shared/geo';

export interface ParsedTrack {
  yachtId?: string;
  yachtName?: string;
  points: TrackPoint[];
}

const SPEED_OUTLIER_M_PER_S = 30;

export function parseGpx(xml: string, raceStartMs: number): ParsedTrack[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('GPX: malformed XML');
  }

  const trks = Array.from(doc.getElementsByTagName('trk'));
  return trks.map((trk) => parseTrk(trk, raceStartMs));
}

function parseTrk(trk: Element, raceStartMs: number): ParsedTrack {
  const yachtName = directChildText(trk, 'name') ?? undefined;

  const rawPoints: TrackPoint[] = [];
  const trksegs = Array.from(trk.getElementsByTagName('trkseg'));
  for (const seg of trksegs) {
    const trkpts = Array.from(seg.getElementsByTagName('trkpt'));
    for (const pt of trkpts) {
      const parsed = parseTrkpt(pt, raceStartMs);
      if (parsed) rawPoints.push(parsed);
    }
  }

  const cleaned = cleanPoints(rawPoints);
  fillSpeedAndHeading(cleaned);

  return { yachtName, points: cleaned };
}

function parseTrkpt(pt: Element, raceStartMs: number): TrackPoint | null {
  const lat = Number(pt.getAttribute('lat'));
  const lon = Number(pt.getAttribute('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const timeStr = directChildText(pt, 'time');
  if (!timeStr) return null;

  const unixMs = Date.parse(timeStr);
  if (!Number.isFinite(unixMs)) return null;

  return { tMs: unixMs - raceStartMs, lat, lon };
}

/**
 * Очистка одним проходом со скользящей «последней принятой точкой».
 *
 *   - tMs <= last.tMs            → дубль / нарушение монотонности → drop
 *   - speed(last, p) > 30 м/с    → GPS-выброс                     → drop
 *   - иначе                       → принять, обновить last
 *
 * speed/heading здесь не пишем: точки между «принять» и «следующая принять»
 * могут смениться, поэтому считаем их финальным проходом по уже отфильтрованной
 * последовательности.
 */
function cleanPoints(points: TrackPoint[]): TrackPoint[] {
  const kept: TrackPoint[] = [];
  let last: TrackPoint | null = null;

  for (const p of points) {
    if (last !== null) {
      if (p.tMs <= last.tMs) continue;
      const dt = (p.tMs - last.tMs) / 1000;
      const dist = haversineDistance({ lat: last.lat, lon: last.lon }, { lat: p.lat, lon: p.lon });
      if (dist / dt > SPEED_OUTLIER_M_PER_S) continue;
    }
    kept.push(p);
    last = p;
  }

  return kept;
}

function fillSpeedAndHeading(points: TrackPoint[]): void {
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const dtSec = (cur.tMs - prev.tMs) / 1000;
    const a = { lat: prev.lat, lon: prev.lon };
    const b = { lat: cur.lat, lon: cur.lon };
    cur.speed = haversineDistance(a, b) / dtSec;
    cur.heading = bearing(a, b);
  }
  // Первой точке трека некуда смотреть назад — копируем со второй,
  // если она есть. Это обозримое поведение для рендера маркеров.
  if (points.length >= 2) {
    points[0].speed = points[1].speed;
    points[0].heading = points[1].heading;
  }
}

function directChildText(parent: Element, tagName: string): string | null {
  for (const child of Array.from(parent.children)) {
    if (child.tagName === tagName) {
      return child.textContent?.trim() ?? null;
    }
  }
  return null;
}
