/**
 * Сетевые DTO — типы, которые приходят с сервера.
 *
 * Отделены от доменных моделей (domain.ts), чтобы изменение REST-контракта
 * не требовало правок по всему приложению. Конвертация DTO → domain
 * происходит ровно один раз — в маппере или transformResponse.
 */

import type { Race, Mark } from './domain';
import { raceId } from './domain';

// ---------------------------------------------------------------------------
// GET /api/races  →  RaceMeta[]
// ---------------------------------------------------------------------------

export interface RaceMeta {
  id: string;
  name: string;
  startedAt: string; // ISO 8601
  durationMs: number;
  yachtCount: number;
}

// ---------------------------------------------------------------------------
// GET /api/races/:id/analytics  →  Analytics
// ---------------------------------------------------------------------------

export interface YachtAnalytics {
  yachtId: string;
  avgSpeedKnots: number;
  maxSpeedKnots: number;
  distanceNm: number;
  tackCount: number;
}

export interface Analytics {
  raceId: string;
  yachts: YachtAnalytics[];
}

// ---------------------------------------------------------------------------
// GET /api/races/:id/live  →  LiveTelemetry
// ---------------------------------------------------------------------------

export interface YachtTelemetry {
  yachtId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  updatedAt: string; // ISO 8601
}

export interface LiveTelemetry {
  raceId: string;
  timestamp: string; // ISO 8601
  yachts: YachtTelemetry[];
}

// ---------------------------------------------------------------------------
// Mappers: DTO → Domain
// ---------------------------------------------------------------------------

export function mapRaceMetaToRace(dto: RaceMeta): Race {
  return {
    id: raceId(dto.id),
    name: dto.name,
    startedAt: Date.parse(dto.startedAt),
    durationMs: dto.durationMs,
    yachts: [],
    marks: [],
  };
}

// ---------------------------------------------------------------------------
// GET /api/races/:id  →  RaceDetailDto  (→ transformResponse → Race)
// ---------------------------------------------------------------------------

export interface MarkDto {
  id: string;
  name: string;
  type: 'start' | 'finish' | 'turning';
  lat: number;
  lon: number;
}

export interface RaceDetailDto {
  id: string;
  name: string;
  startedAt: string; // ISO 8601
  durationMs: number;
  yachts: string[];
  marks: MarkDto[];
}

export function mapRaceDetailToRace(dto: RaceDetailDto): Race {
  const marks: Mark[] = dto.marks.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type,
    lat: m.lat,
    lon: m.lon,
  }));

  return {
    id: raceId(dto.id),
    name: dto.name,
    startedAt: Date.parse(dto.startedAt),
    durationMs: dto.durationMs,
    yachts: dto.yachts.map((y) => y as Race['yachts'][number]),
    marks,
  };
}
