import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

import { yachtSelectors } from '@/entities/yacht';
import {
  selectAnalyticsByYacht,
  selectSelectedYachtId,
  selectAnalyticsPending,
  selectYacht,
} from '@/features/analytics';
import {
  selectAllPrecomputedTracks,
  selectCurrentTime,
  selectRaceDuration,
} from '@/features/playback';
import { haversineDistance } from '@/shared/geo';
import { ru } from '@/shared/i18n/ru';
import { findIndexAtTime } from '@/shared/lib/binarySearchTrack';
import { useAppDispatch, useAppSelector } from '@/shared/lib/redux-hooks';
import type { TrackPoint } from '@/shared/types';

import styles from './AnalyticsPanel.module.css';

const MS_TO_KNOTS = 1.94384;
const M_TO_NM = 1 / 1852;
const CHART_SAMPLES = 20;

interface BoatAnalytics {
  rank: number;
  name: string;
  sailNumber: string;
  color: string;
  speed: number;
  cog: number;
  dist: number;
  yachtId: string;
}

interface SpeedPoint {
  time: string;
  [boat: string]: number | string;
}

function buildCumulativeDistances(
  tracksByYacht: Record<string, TrackPoint[]>,
): Record<string, Float64Array> {
  const result: Record<string, Float64Array> = {};
  for (const [yachtId, points] of Object.entries(tracksByYacht)) {
    const cumDist = new Float64Array(points.length);
    for (let i = 1; i < points.length; i++) {
      cumDist[i] = cumDist[i - 1] + haversineDistance(points[i - 1], points[i]);
    }
    result[yachtId] = cumDist;
  }
  return result;
}

function buildSpeedChart(
  tracksByYacht: Record<string, TrackPoint[]>,
  yachtNames: Record<string, string>,
  raceDurationMs: number,
): SpeedPoint[] {
  if (raceDurationMs === 0) return [];

  const step = raceDurationMs / CHART_SAMPLES;
  const points: SpeedPoint[] = [];

  for (let i = 0; i <= CHART_SAMPLES; i++) {
    const tMs = i * step;
    const totalSec = Math.round(tMs / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    const pt: SpeedPoint = { time: `${mm}:${ss}` };

    for (const [yachtId, trackPoints] of Object.entries(tracksByYacht)) {
      if (trackPoints.length === 0) continue;
      const idx = findIndexAtTime(trackPoints, tMs);
      const name = yachtNames[yachtId] ?? yachtId;
      pt[name] = +((trackPoints[idx].speed ?? 0) * MS_TO_KNOTS).toFixed(1);
    }

    points.push(pt);
  }

  return points;
}

export function AnalyticsPanel() {
  const t = ru.analyticsPanel;
  const dispatch = useAppDispatch();
  const currentTime = useAppSelector(selectCurrentTime);
  const raceDurationMs = useAppSelector(selectRaceDuration);
  const precomputed = useAppSelector(selectAllPrecomputedTracks);
  const yachts = useAppSelector((state) => yachtSelectors.selectAll(state.yacht));
  const analyticsByYacht = useAppSelector(selectAnalyticsByYacht);
  const selectedYachtId = useAppSelector(selectSelectedYachtId);
  const analyticsPending = useAppSelector(selectAnalyticsPending);

  const selectedAnalytics = selectedYachtId
    ? analyticsByYacht[selectedYachtId] ?? null
    : null;

  const hasAnyAnalytics = Object.keys(analyticsByYacht).length > 0;

  const cumulativeDistances = useMemo(
    () => buildCumulativeDistances(precomputed),
    [precomputed],
  );

  const yachtNameMap = useMemo(
    () => Object.fromEntries(yachts.map((y) => [y.id, y.name])),
    [yachts],
  );

  const speedData = useMemo(
    () => buildSpeedChart(precomputed, yachtNameMap, raceDurationMs),
    [precomputed, yachtNameMap, raceDurationMs],
  );

  const boatEntries: BoatAnalytics[] = useMemo(() => {
    const entries: Omit<BoatAnalytics, 'rank'>[] = [];

    for (const yacht of yachts) {
      const points = precomputed[yacht.id];
      if (!points || points.length === 0) continue;

      const idx = findIndexAtTime(points, currentTime);
      const point = points[idx];
      const cumDist = cumulativeDistances[yacht.id];

      entries.push({
        name: yacht.name,
        sailNumber: yacht.sailNumber,
        color: yacht.color,
        speed: (point.speed ?? 0) * MS_TO_KNOTS,
        cog: Math.round(point.heading ?? 0),
        dist: cumDist ? cumDist[idx] * M_TO_NM : 0,
        yachtId: yacht.id,
      });
    }

    entries.sort((a, b) => b.dist - a.dist);

    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [yachts, precomputed, currentTime, cumulativeDistances]);

  const maxDistNm = useMemo(() => {
    let maxDist = 0;
    for (const cumDist of Object.values(cumulativeDistances)) {
      if (cumDist.length > 0 && cumDist[cumDist.length - 1] > maxDist) {
        maxDist = cumDist[cumDist.length - 1];
      }
    }
    return maxDist * M_TO_NM;
  }, [cumulativeDistances]);

  const avgSpeedKn = useMemo(() => {
    if (boatEntries.length === 0) return 0;
    const sum = boatEntries.reduce((acc, b) => acc + b.speed, 0);
    return sum / boatEntries.length;
  }, [boatEntries]);

  const selectedYachtName = selectedYachtId
    ? yachtNameMap[selectedYachtId] ?? ''
    : '';

  return (
    <aside className={styles.panel}>
      <div className={styles.chartSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>{t.speedOverTime}</span>
          <span className={styles.sectionBadge}>{t.speedUnit}</span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={speedData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 9 }}
              axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 'auto']}
              tick={{ fill: '#64748b', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickCount={4}
            />
            {yachts.map((y) => (
              <Line
                key={y.id}
                type="monotone"
                dataKey={y.name}
                stroke={y.color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.leaderboard}>
        <div className={styles.leaderboardHeader}>
          <span className={styles.sectionTitle}>{t.leaderboard}</span>
          <span className={styles.boatCount}>
            {boatEntries.length} {t.boats}
          </span>
        </div>
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th>{t.colRank}</th>
              <th>{t.colBoat}</th>
              <th style={{ textAlign: 'right' }}>{t.colSpeed}</th>
              <th style={{ textAlign: 'right' }}>{t.colCog}</th>
              <th style={{ textAlign: 'right' }}>{t.colDist}</th>
            </tr>
          </thead>
          <tbody>
            {boatEntries.map((b) => (
              <tr
                key={b.sailNumber || b.yachtId}
                className={`${styles.row} ${b.yachtId === selectedYachtId ? styles.rowSelected : ''}`}
                onClick={() => dispatch(selectYacht(b.yachtId))}
              >
                <td className={`${styles.rank} ${b.rank <= 3 ? styles.rankTop : ''}`}>
                  {String(b.rank).padStart(2, '0')}
                </td>
                <td>
                  <div className={styles.boatCell}>
                    <span className={styles.colorDot} style={{ background: b.color }} />
                    <div className={styles.boatInfo}>
                      <div className={styles.boatName}>{b.name}</div>
                      <div className={styles.sailNum}>{b.sailNumber}</div>
                    </div>
                  </div>
                </td>
                <td className={styles.numCell}>
                  <span className={styles.speedVal} style={{ color: b.color }}>
                    {b.speed.toFixed(1)}
                  </span>
                </td>
                <td className={styles.numCell}>{b.cog}&deg;</td>
                <td className={styles.numCell}>{b.dist.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.summary}>
        <div className={styles.statBlock}>
          <div className={styles.statLabel}>{t.distance}</div>
          <div className={styles.statValue}>
            {maxDistNm.toFixed(1)}<span className={styles.statUnit}> NM</span>
          </div>
        </div>
        <div className={styles.statBlock}>
          <div className={styles.statLabel}>{t.avgSpeed}</div>
          <div className={styles.statValue}>
            {avgSpeedKn.toFixed(1)}<span className={styles.statUnit}> уз</span>
          </div>
        </div>
        <div className={styles.statBlock}>
          <div className={styles.statLabel}>{t.boatsCount}</div>
          <div className={styles.statValue}>{boatEntries.length}</div>
        </div>
      </div>

      {analyticsPending && (
        <div className={styles.analyticsLoading}>{t.analyticsLoading}</div>
      )}

      {hasAnyAnalytics && !selectedAnalytics && !analyticsPending && (
        <div className={styles.analyticsLoading}>{t.selectBoatHint}</div>
      )}

      {selectedAnalytics && (
        <>
          <div className={styles.scores}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                {t.maneuverScores}
                {selectedYachtName && (
                  <span className={styles.sectionBadge}>{selectedYachtName}</span>
                )}
              </span>
            </div>
            <div className={styles.scoreGrid}>
              <div className={styles.scoreItem}>
                <div className={styles.scoreLabel}>{t.tackScore}</div>
                <div className={styles.scoreValue}>
                  {selectedAnalytics.summary.tackScore.toFixed(0)}
                </div>
              </div>
              <div className={styles.scoreItem}>
                <div className={styles.scoreLabel}>{t.gybeScore}</div>
                <div className={styles.scoreValue}>
                  {selectedAnalytics.summary.gybeScore.toFixed(0)}
                </div>
              </div>
              <div className={styles.scoreItem}>
                <div className={styles.scoreLabel}>{t.overallScore}</div>
                <div className={styles.scoreValue}>
                  {selectedAnalytics.summary.maneuversScore.toFixed(0)}
                </div>
              </div>
            </div>
            <div className={styles.summary}>
              <div className={styles.statBlock}>
                <div className={styles.statLabel}>{t.vmgAvg}</div>
                <div className={styles.statValue}>
                  {selectedAnalytics.summary.vmgAvg.toFixed(1)}
                  <span className={styles.statUnit}> уз</span>
                </div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statLabel}>{t.timeLost}</div>
                <div className={styles.statValue}>
                  {selectedAnalytics.summary.lostOnManeuvers.toFixed(0)}
                  <span className={styles.statUnit}> с</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.maneuverList}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>{t.maneuverList}</span>
              <span className={styles.sectionBadge}>
                {selectedAnalytics.maneuvers.length}
              </span>
            </div>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th>#</th>
                  <th>{t.colType}</th>
                  <th style={{ textAlign: 'right' }}>{t.colScore}</th>
                  <th>{t.colErrors}</th>
                </tr>
              </thead>
              <tbody>
                {selectedAnalytics.maneuvers.map((m) => (
                  <tr key={m.id} className={styles.row}>
                    <td className={styles.rank}>{m.id}</td>
                    <td>{m.type === 'tack' ? t.tack : t.gybe}</td>
                    <td className={styles.numCell}>
                      <span
                        className={styles.scoreInline}
                        style={{ color: m.score >= 70 ? '#2a9d8f' : '#e63946' }}
                      >
                        {m.score.toFixed(0)}
                      </span>
                    </td>
                    <td className={styles.errorCell}>
                      {m.errorCodes.length > 0
                        ? m.errorCodes.join(', ')
                        : t.noErrors}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </aside>
  );
}
