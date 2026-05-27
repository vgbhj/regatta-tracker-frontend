import { parseCsv } from '@/shared/lib/csv-parser';

import type { AnalyticsData, ManeuverAnalytics, RaceSummary, TackingPeriod } from './types';

interface AnalyticsResponse {
  track: string;
  maneuvers: string;
  tacking: string;
  summary: string;
}

interface TrackRow {
  lat: number;
  lon: number;
  timestampMs: number;
}

function parseSemicolonList(s: string): string[] {
  if (!s) return [];
  return s.split(';').filter(Boolean);
}

function parseTrackPositions(csv: string): TrackRow[] {
  return parseCsv(csv).map((row) => ({
    lat: Number(row.latitude),
    lon: Number(row.longitude),
    timestampMs: Number(row.timestamps_millis),
  }));
}

function parseManeuvers(
  csv: string,
  trackRows: TrackRow[],
): ManeuverAnalytics[] {
  const raceStartMs = trackRows.length > 0 ? trackRows[0].timestampMs : 0;

  return parseCsv(csv).map((row) => {
    const id = Number(row.maneuver_id);
    const start = Number(row.maneuver_start);
    const end = Number(row.maneuver_end);
    const centerIdx = Math.round((start + end) / 2);
    const trackPoint = trackRows[centerIdx] ?? trackRows[0];

    return {
      id,
      duration: Number(row.maneuver_duration),
      type: row.maneuver_type as 'tack' | 'gybe',
      side: row.side,
      entrySpeed: Number(row.entry_speed),
      exitSpeed: Number(row.exit_speed),
      minSpeed: Number(row.min_speed),
      recoveryTimeSec: Number(row.recovery_time_sec),
      success: row.success_flag === 'true',
      errorCodes: parseSemicolonList(row.error_codes),
      vmgLoss: Number(row.vmg_loss),
      speedLoss: Number(row.speed_loss),
      score: Number(row.score),
      timeLoss: Number(row.time_loss),
      lat: trackPoint.lat,
      lon: trackPoint.lon,
      tMs: trackPoint.timestampMs - raceStartMs,
    };
  });
}

function parseTacking(csv: string): TackingPeriod[] {
  return parseCsv(csv).map((row) => ({
    id: Number(row.tacking_id),
    duration: Number(row.tacking_duration),
    distanceLossPerTack: Number(row.distance_loss_per_tack),
    vmgAvg: Number(row.vmg_avg),
    speedAvg: Number(row.speed_avg),
    tackCount: Number(row.tack_count),
    attackAngle: Number(row.attack_angle),
  }));
}

function parseSummary(csv: string): RaceSummary {
  const rows = parseCsv(csv);
  if (rows.length === 0) throw new Error('Empty summary CSV');
  const row = rows[0];
  return {
    elapsedTime: Number(row.ellapsed_time),
    lostOnManeuvers: Number(row.lost_on_maneuvers),
    speedAvg: Number(row.speed_avg),
    vmgAvg: Number(row.vmg_avg),
    distance: Number(row.distance),
    tacks: Number(row.tacks),
    gybes: Number(row.gybes),
    tackScore: Number(row.tack_score),
    gybeScore: Number(row.gybe_score),
    maneuversScore: Number(row.maneuvers_score),
    tackErrors: parseSemicolonList(row.tack_errors),
    gybeErrors: parseSemicolonList(row.gybe_errors),
  };
}

export function parseAnalyticsResponse(response: AnalyticsResponse): AnalyticsData {
  const trackRows = parseTrackPositions(response.track);
  return {
    summary: parseSummary(response.summary),
    maneuvers: parseManeuvers(response.maneuvers, trackRows),
    tacking: parseTacking(response.tacking),
  };
}
