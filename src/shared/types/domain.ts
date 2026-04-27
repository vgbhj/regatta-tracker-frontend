/**
 * Доменная модель приложения.
 *
 * Идентификаторы (RaceId, YachtId) реализованы как branded types: это позволяет
 * на уровне TypeScript различать строки, которые содержат разные сущности, и
 * исключить случайную передачу YachtId туда, где ожидается RaceId. В рантайме
 * это обычные строки — нулевая стоимость.
 *
 * Время точки трека хранится в TrackPoint.tMs как миллисекунды от старта гонки,
 * а не как unix-таймштамп. Это упрощает интерполяцию и синхронизацию плеера:
 * единственный источник правды — модельное время плеера, а не календарное.
 * Конвертация из ISO-времени GPX выполняется один раз в парсере.
 */

export type RaceId = string & { readonly __brand: 'RaceId' };
export type YachtId = string & { readonly __brand: 'YachtId' };

export const raceId = (s: string): RaceId => s as RaceId;
export const yachtId = (s: string): YachtId => s as YachtId;

export interface Race {
  id: RaceId;
  name: string;
  startedAt: number;
  durationMs: number;
  yachts: YachtId[];
  marks: Mark[];
}

export interface Yacht {
  id: YachtId;
  name: string;
  sailNumber: string;
  className: string;
  color: string;
}

export interface TrackPoint {
  tMs: number;
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
}

export interface Track {
  raceId: RaceId;
  yachtId: YachtId;
  points: TrackPoint[];
}

export interface Mark {
  id: string;
  name: string;
  type: 'start' | 'finish' | 'turning';
  lat: number;
  lon: number;
}
