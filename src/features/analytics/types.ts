export interface ManeuverAnalytics {
  id: number;
  duration: number;
  type: 'tack' | 'gybe';
  side: string;
  entrySpeed: number;
  exitSpeed: number;
  minSpeed: number;
  recoveryTimeSec: number;
  success: boolean;
  errorCodes: string[];
  vmgLoss: number;
  speedLoss: number;
  score: number;
  timeLoss: number;
  lat: number;
  lon: number;
  tMs: number;
}

export interface TackingPeriod {
  id: number;
  duration: number;
  distanceLossPerTack: number;
  vmgAvg: number;
  speedAvg: number;
  tackCount: number;
  attackAngle: number;
}

export interface RaceSummary {
  elapsedTime: number;
  lostOnManeuvers: number;
  speedAvg: number;
  vmgAvg: number;
  distance: number;
  tacks: number;
  gybes: number;
  tackScore: number;
  gybeScore: number;
  maneuversScore: number;
  tackErrors: string[];
  gybeErrors: string[];
}

export interface WindPoint {
  lat: number;
  lon: number;
  tMs: number;
  directionDeg: number;
  speedMs: number;
}

export interface AnalyticsData {
  summary: RaceSummary;
  maneuvers: ManeuverAnalytics[];
  tacking: TackingPeriod[];
  wind: WindPoint[];
}
