import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

import { ru } from '@/shared/i18n/ru'

import styles from './AnalyticsPanel.module.css'

interface BoatEntry {
  rank: number
  name: string
  sailNumber: string
  color: string
  speed: number
  cog: number
  dist: number
}

interface SpeedPoint {
  time: string
  [boat: string]: number | string
}

const BOAT_COLORS = ['#ec4899', '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#a855f7']

const MOCK_BOATS: BoatEntry[] = [
  { rank: 1, name: 'Caoimhe', sailNumber: 'IRL-3309', color: BOAT_COLORS[0], speed: 5.2, cog: 90, dist: 12.97 },
  { rank: 2, name: 'Mistral', sailNumber: 'GBR-2284', color: BOAT_COLORS[1], speed: 5.3, cog: 82, dist: 12.97 },
  { rank: 3, name: 'Halcyon', sailNumber: 'GBR-9920', color: BOAT_COLORS[2], speed: 6.3, cog: 91, dist: 12.95 },
  { rank: 4, name: 'Vrijheid', sailNumber: 'NED-771', color: BOAT_COLORS[3], speed: 4.2, cog: 79, dist: 12.95 },
  { rank: 5, name: 'Stormvind', sailNumber: 'SWE-118', color: BOAT_COLORS[4], speed: 4.5, cog: 89, dist: 12.79 },
  { rank: 6, name: 'Aeolus', sailNumber: 'GBR-4471', color: BOAT_COLORS[5], speed: 6.5, cog: 106, dist: 12.62 },
]

function generateSpeedData(): SpeedPoint[] {
  const points: SpeedPoint[] = []
  const names = MOCK_BOATS.map((b) => b.name)

  for (let i = 0; i <= 15; i++) {
    const m = i * 6
    const label = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    const pt: SpeedPoint = { time: label }
    for (const name of names) {
      pt[name] = +(3 + Math.sin(i * 0.4 + names.indexOf(name)) * 2 + Math.random() * 1.5).toFixed(1)
    }
    points.push(pt)
  }
  return points
}

export function AnalyticsPanel() {
  const t = ru.analyticsPanel
  const speedData = useMemo(generateSpeedData, [])

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
              domain={[2, 9]}
              tick={{ fill: '#64748b', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickCount={4}
            />
            {MOCK_BOATS.map((b) => (
              <Line
                key={b.name}
                type="monotone"
                dataKey={b.name}
                stroke={b.color}
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
            {MOCK_BOATS.length} {t.boats}
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
            {MOCK_BOATS.map((b) => (
              <tr key={b.sailNumber} className={styles.row}>
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
            14.2<span className={styles.statUnit}> NM</span>
          </div>
        </div>
        <div className={styles.statBlock}>
          <div className={styles.statLabel}>{t.avgWind}</div>
          <div className={styles.statValue}>
            12<span className={styles.statUnit}> kt</span>
          </div>
        </div>
        <div className={styles.statBlock}>
          <div className={styles.statLabel}>{t.boatsCount}</div>
          <div className={styles.statValue}>{MOCK_BOATS.length}</div>
        </div>
      </div>
    </aside>
  )
}
